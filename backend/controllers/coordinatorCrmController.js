const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const axios = require('axios');
const fs = require('fs'); // 🔥 ALUTHIN ADD KARANNA
const path = require('path');

// 1. Get Leads 
exports.getLeads = async (req, res) => {
    try {
        const userRole = req.user?.role?.toUpperCase() || 'MANAGER'; 
        const userId = req.user?.id || 1;
        const { campaignType, tab, staffPhase, status, staffId } = req.query; 

        let whereClause = { campaignType: campaignType || 'FREE_SEMINAR' };
        const isManager = ['SYSTEM_ADMIN', 'DIRECTOR', 'MANAGER', 'SUPER'].includes(userRole);

        if (tab === 'NEW') {
            whereClause.status = 'NEW';
            if (isManager) whereClause.assignedTo = null; 
        } 
        else if (tab === 'IMPORTED') {
            whereClause.source = { in: ['import', 'bulk_import'] };
            if (!isManager) whereClause.assignedTo = parseInt(userId); 
        } 
        else if (tab === 'ASSIGNED') {
            whereClause.assignedTo = { not: null }; 
            
            // 🔥 FIX: Staff ලටත් අනිත් අයව Filter කරන්න පුළුවන් වෙන්න හැදුවා
            if (staffId && staffId !== '') {
                whereClause.assignedTo = parseInt(staffId);
            } else if (!isManager) {
                // Filter කරලා නැත්නම් තමන්ගේ ඒවා විතරයි පේන්නේ
                whereClause.assignedTo = parseInt(userId);
            }
            
            if (staffPhase && staffPhase !== '') whereClause.phase = parseInt(staffPhase);
            if (status && status !== '') whereClause.callStatus = status;
        }
        else if (tab === 'ALL') {
            if (!isManager) {
                whereClause.OR = [ { assignedTo: null }, { assignedTo: parseInt(userId) } ];
            } else {
                delete whereClause.assignedTo; 
            }
        }

        const leads = await prisma.lead.findMany({
            where: whereClause,
            orderBy: [ { unreadCount: 'desc' }, { updatedAt: 'desc' } ], 
            include: { assignedUser: { select: { firstName: true, lastName: true } } }
        });

        const allLeadsForCounts = await prisma.lead.findMany({ where: { campaignType: campaignType || 'FREE_SEMINAR' } });
        
        let counts = { NEW: 0, IMPORTED: 0, ASSIGNED: 0, ALL: 0 };
        allLeadsForCounts.forEach(l => {
            const hasUnread = l.unreadCount > 0;
            if (hasUnread) {
                counts.ALL++;
                if (l.status === 'NEW' && !l.assignedTo) counts.NEW++;
                if (l.source === 'import' || l.source === 'bulk_import') counts.IMPORTED++;
                if (l.assignedTo) counts.ASSIGNED++;
            }
        });

        res.status(200).json({ leads, counts });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch leads" });
    }
};

// 2. Import Lead
exports.importLead = async (req, res) => {
    try {
        const { name, number, campaignType, isBulk, leadsList } = req.body;
        const userRole = req.user?.role?.toUpperCase();
        const userId = req.user?.id;

        const isManager = ['SYSTEM_ADMIN', 'DIRECTOR', 'MANAGER'].includes(userRole);
        const assignedTo = isManager ? null : parseInt(userId);

        if (isBulk && leadsList && Array.isArray(leadsList)) {
            let importedCount = 0;
            for (const lead of leadsList) {
                const phone = lead.number?.toString().trim();
                if (!phone) continue;
                await prisma.lead.upsert({
                    where: { phone: phone },
                    update: { name: lead.name || '', source: 'bulk_import' }, 
                    create: {
                        name: lead.name || '', phone: phone, source: 'bulk_import', campaignType: campaignType || 'FREE_SEMINAR',
                        assignedTo, status: assignedTo ? 'OPEN' : 'NEW', phase: 1, callStatus: 'pending'
                    }
                });
                importedCount++;
            }
            return res.status(201).json({ message: `${importedCount} leads imported successfully!` });
        } else {
            const newLead = await prisma.lead.upsert({
                where: { phone: number },
                update: { name, source: 'import' }, 
                create: {
                    name, phone: number, source: 'import', campaignType: campaignType || 'FREE_SEMINAR',
                    assignedTo, status: assignedTo ? 'OPEN' : 'NEW', phase: 1, callStatus: 'pending'
                }
            });
            return res.status(201).json({ message: "Lead imported successfully!", lead: newLead });
        }
    } catch (error) {
        res.status(500).json({ error: "Failed to import lead" });
    }
};

// 3. Bulk Actions
exports.bulkActions = async (req, res) => {
    try {
        const { action, leadIds, staffId } = req.body;
        if (action === 'MARK_READ') await prisma.lead.updateMany({ where: { id: { in: leadIds } }, data: { unreadCount: 0 } });
        else if (action === 'MARK_UNREAD') await prisma.lead.updateMany({ where: { id: { in: leadIds } }, data: { unreadCount: 1 } });
        else if (action === 'ASSIGN') await prisma.lead.updateMany({ where: { id: { in: leadIds } }, data: { assignedTo: parseInt(staffId), status: 'OPEN', phase: 1, callStatus: 'pending' } });
        else if (action === 'UNASSIGN') await prisma.lead.updateMany({ where: { id: { in: leadIds } }, data: { assignedTo: null, status: 'NEW', phase: 1, callStatus: 'pending' } });
        res.status(200).json({ message: "Action successful" });
    } catch (error) { res.status(500).json({ error: "Bulk action failed" }); }
};

// 4. Assign Leads
exports.assignLeads = async (req, res) => {
    try {
        const { type, staffId, count, sort, autoAssignConfig } = req.body;

        if (type === 'bulk') {
            const leadsToAssign = await prisma.lead.findMany({
                where: { assignedTo: null, status: 'NEW' },
                orderBy: { createdAt: sort === 'oldest' ? 'asc' : 'desc' },
                take: parseInt(count)
            });

            if (leadsToAssign.length === 0) return res.status(400).json({ error: "No unassigned leads found." });

            const ids = leadsToAssign.map(l => l.id);
            await prisma.lead.updateMany({
                where: { id: { in: ids } },
                data: { assignedTo: parseInt(staffId), status: 'OPEN', phase: 1, callStatus: 'pending' }
            });

            return res.status(200).json({ message: `${leadsToAssign.length} leads assigned successfully!` });
        } else if (type === 'auto') {
            for (const config of autoAssignConfig) {
                await prisma.autoAssignQuota.upsert({
                    where: { staffId: parseInt(config.staffId) },
                    update: { quotaAmount: parseInt(config.quotaAmount), isActive: config.isActive },
                    create: { staffId: parseInt(config.staffId), quotaAmount: parseInt(config.quotaAmount), isActive: config.isActive }
                });
            }
            return res.status(200).json({ message: "Auto Assign configuration saved!" });
        }
    } catch (error) { res.status(500).json({ error: "Failed to process assignment" }); }
};

// 5. Get Auto Assign Config
exports.getAutoAssignQuotas = async (req, res) => {
    try {
        const quotas = await prisma.autoAssignQuota.findMany({ include: { staff: { select: { firstName: true, lastName: true } } } });
        res.status(200).json(quotas);
    } catch (error) { res.status(500).json({ error: "Failed to load quotas" }); }
};

// 6. Update Call Campaign Status
exports.updateCallCampaign = async (req, res) => {
    try {
        const { leadId, method, status, feedback } = req.body;
        const lead = await prisma.lead.findUnique({ where: { id: parseInt(leadId) } });
        if (!lead) return res.status(404).json({ error: "Lead not found" });

        let nextPhase = lead.phase;
        if (status === 'no_answer') {
            if (lead.phase === 1) nextPhase = 2;
            else if (lead.phase === 2) nextPhase = 3;
        }

        const updatedLead = await prisma.lead.update({
            where: { id: parseInt(leadId) },
            data: { callMethod: method, callStatus: status, feedback: feedback, phase: nextPhase }
        });
        res.status(200).json({ message: "Call status updated", lead: updatedLead });
    } catch (error) { res.status(500).json({ error: "Failed to update call campaign" }); }
};

// 7. Helper: Auto Assign
const runAutoAssign = async (leadId) => {
    const availableStaff = await prisma.autoAssignQuota.findFirst({
        where: { isActive: true, assigned: { lt: prisma.autoAssignQuota.fields.quotaAmount } },
        orderBy: { assigned: 'asc' }
    });
    if (availableStaff) {
        await prisma.lead.update({
            where: { id: leadId },
            data: { assignedTo: availableStaff.staffId, status: 'OPEN', isAutoAssigned: true }
        });
        await prisma.autoAssignQuota.update({
            where: { id: availableStaff.id },
            data: { assigned: { increment: 1 } }
        });
    }
};

// 8. Receive Message Webhook 
exports.receiveMessage = async (req, res) => {
    try {
        let body = req.body;
        if (body.object === "whatsapp_business_account" && body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {
            let msgData = body.entry[0].changes[0].value.messages[0];
            let contactData = body.entry[0].changes[0].value.contacts[0];
            let phone = msgData.from; 
            let name = contactData.profile.name; 
            let metaMsgId = msgData.id; 

            // Get API Key to download media
            const settings = await prisma.crmSettings.findFirst({ where: { campaignType: 'FREE_SEMINAR' } });
            
            let messageText = msgData.text ? msgData.text.body : "";
            let inMediaUrl = null;
            let inMediaType = null;

            // Handle Media Types (Stickers, Images, Audio, Documents)
            if (msgData.type === 'image' && settings?.metaApiKey) {
                const mediaInfo = await downloadMetaMedia(msgData.image.id, settings.metaApiKey);
                if (mediaInfo) { inMediaUrl = mediaInfo.mediaUrl; inMediaType = mediaInfo.mediaType; }
            } else if (msgData.type === 'sticker' && settings?.metaApiKey) {
                const mediaInfo = await downloadMetaMedia(msgData.sticker.id, settings.metaApiKey);
                if (mediaInfo) { inMediaUrl = mediaInfo.mediaUrl; inMediaType = mediaInfo.mediaType; }
            } else if (msgData.type === 'audio' && settings?.metaApiKey) {
                const mediaInfo = await downloadMetaMedia(msgData.audio.id, settings.metaApiKey);
                if (mediaInfo) { inMediaUrl = mediaInfo.mediaUrl; inMediaType = mediaInfo.mediaType; }
            } else if (msgData.type === 'document' && settings?.metaApiKey) {
                const mediaInfo = await downloadMetaMedia(msgData.document.id, settings.metaApiKey);
                if (mediaInfo) { inMediaUrl = mediaInfo.mediaUrl; inMediaType = mediaInfo.mediaType; }
            }

            if (!messageText && !inMediaUrl) {
                messageText = "Media Message";
            }

            const existingLead = await prisma.lead.findUnique({ where: { phone } });
            const needsAssignment = !existingLead || !existingLead.assignedTo; 

            const lead = await prisma.lead.upsert({
                where: { phone: phone },
                update: { 
                    name: name, lastMessage: messageText || 'Received Media', unreadCount: { increment: 1 },
                    status: existingLead?.assignedTo ? 'OPEN' : 'NEW', updatedAt: new Date() 
                },
                create: {
                    name: name, phone: phone, source: 'whatsapp', campaignType: 'FREE_SEMINAR', 
                    lastMessage: messageText || 'Received Media', unreadCount: 1, status: 'NEW', phase: 1, callStatus: 'pending', updatedAt: new Date()
                }
            });

            if (needsAssignment) await runAutoAssign(lead.id);

            await prisma.chatMessage.create({
                data: {
                    leadId: lead.id, message: messageText, mediaUrl: inMediaUrl, mediaType: inMediaType, 
                    direction: 'inbound', senderType: 'USER', senderName: name, metaMessageId: metaMsgId 
                }
            });
        }
        res.status(200).send("EVENT_RECEIVED");
    } catch (error) { res.status(500).send("ERROR"); }
};

// 9. Get Chat Messages
exports.getMessages = async (req, res) => {
    try {
        const { leadId } = req.params;
        await prisma.lead.update({
            where: { id: parseInt(leadId) },
            data: { unreadCount: 0 }
        });
        const messages = await prisma.chatMessage.findMany({
            where: { leadId: parseInt(leadId) },
            orderBy: { createdAt: 'asc' }
        });
        res.status(200).json(messages);
    } catch (error) { res.status(500).json({ error: "Failed to fetch messages" }); }
};

//10Send Message
exports.sendMessage = async (req, res) => {
    try {
        // 🔥 req.body.localUIMessage kiyanne frontend eken ena ara quote karapu box text eka
        const { leadId, message, senderName, replyToMetaId, localUIMessage } = req.body; 
        
        const lead = await prisma.lead.findUnique({ where: { id: parseInt(leadId) } });
        if (!lead) return res.status(404).json({ error: "Lead not found" });
        
        let formattedPhone = lead.phone.replace(/[^0-9]/g, ''); 
        if (formattedPhone.startsWith('0')) formattedPhone = '94' + formattedPhone.substring(1);

        let mediaUrl = null;
        let mediaType = null;
        if (req.file) {
            mediaUrl = `/storage/documents/${req.file.filename}`;
            mediaType = req.file.mimetype;
        }

        const newMsg = await prisma.chatMessage.create({
            data: {
                leadId: parseInt(leadId), 
                // 🔥 Message eka database eke save karaddi localUIMessage eka thiyenawanm eka gannawa, nattan normal eka gannawa
                message: localUIMessage || message || '', 
                mediaUrl: mediaUrl, 
                mediaType: mediaType,
                direction: 'outbound', senderType: 'STAFF', senderId: req.user?.id || null, senderName: senderName || req.user?.firstName || 'Staff'
            }
        });

        await prisma.lead.update({
            where: { id: parseInt(leadId) },
            data: { lastMessage: message ? message.substring(0,30) : 'Sent Media', status: 'OPEN', updatedAt: new Date() }
        });

        try {
            const settings = await prisma.crmSettings.findFirst({ where: { campaignType: lead.campaignType || 'FREE_SEMINAR' } });

            if (settings && settings.metaApiKey && settings.waNumId) {
                let metaPayload = {
                    messaging_product: "whatsapp",
                    recipient_type: "individual",
                    to: formattedPhone,
                };

                // WhatsApp Native Reply Context
                if (replyToMetaId && replyToMetaId !== 'null' && replyToMetaId !== 'undefined') {
                    metaPayload.context = { message_id: replyToMetaId };
                }

                if (message && !mediaUrl) {
                    metaPayload.type = "text";
                    metaPayload.text = { preview_url: false, body: message };
                } else if (mediaUrl) {
                    const liveMediaUrl = `http://72.62.249.211:5000${mediaUrl}`; 
                    if (mediaType.includes('image')) {
                        metaPayload.type = "image";
                        metaPayload.image = { link: liveMediaUrl, caption: message || "" };
                    } else if (mediaType.includes('pdf')) {
                        metaPayload.type = "document";
                        metaPayload.document = { link: liveMediaUrl, caption: message || "", filename: req.file.originalname };
                    } else if (mediaType.includes('video')) {
                        metaPayload.type = "video";
                        metaPayload.video = { link: liveMediaUrl, caption: message || "" };
                    }
                }

                const metaRes = await axios.post(
                    `https://graph.facebook.com/v19.0/${settings.waNumId}/messages`,
                    metaPayload,
                    { headers: { 'Authorization': `Bearer ${settings.metaApiKey}`, 'Content-Type': 'application/json' } }
                );
                
                if (metaRes.data?.messages?.[0]?.id) {
                    await prisma.chatMessage.update({
                        where: { id: newMsg.id },
                        data: { metaMessageId: metaRes.data.messages[0].id }
                    });
                }
            }
        } catch (metaError) {
            console.error(`❌ [META API ERROR]`, metaError.response ? metaError.response.data : metaError.message);
        }
        res.status(201).json(newMsg);
    } catch (error) {
        res.status(500).json({ error: "Failed to send message" });
    }
};

// 🔥 Helper: Download Media from Meta API 🔥
const downloadMetaMedia = async (mediaId, metaApiKey) => {
    try {
        const urlRes = await axios.get(`https://graph.facebook.com/v19.0/${mediaId}`, {
            headers: { 'Authorization': `Bearer ${metaApiKey}` }
        });
        const downloadUrl = urlRes.data.url;
        const mimeType = urlRes.data.mime_type;
        let ext = mimeType.split('/')[1];
        if(ext.includes(';')) ext = ext.split(';')[0]; 

        const mediaRes = await axios.get(downloadUrl, {
            headers: { 'Authorization': `Bearer ${metaApiKey}` },
            responseType: 'stream'
        });

        const fileName = `IN_${Date.now()}.${ext}`;
        const relativePath = `/storage/documents/${fileName}`;
        const savePath = path.join(process.cwd(), relativePath);

        const writer = fs.createWriteStream(savePath);
        mediaRes.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', () => resolve({ mediaUrl: relativePath, mediaType: mimeType }));
            writer.on('error', reject);
        });
    } catch (err) {
        console.error("Meta Media Download Error:", err.message);
        return null;
    }
};

// 🔥 NEW: Send Reaction API 🔥
exports.sendReaction = async (req, res) => {
    try {
        const { leadId, metaMessageId, emoji } = req.body;
        if (!metaMessageId) return res.status(400).json({ error: "No Meta Message ID provided" });

        const lead = await prisma.lead.findUnique({ where: { id: parseInt(leadId) } });
        if (!lead) return res.status(404).json({ error: "Lead not found" });

        let formattedPhone = lead.phone.replace(/[^0-9]/g, ''); 
        if (formattedPhone.startsWith('0')) formattedPhone = '94' + formattedPhone.substring(1);

        const settings = await prisma.crmSettings.findFirst({ where: { campaignType: lead.campaignType || 'FREE_SEMINAR' } });

        if (settings && settings.metaApiKey && settings.waNumId) {
            const payload = {
                messaging_product: "whatsapp",
                recipient_type: "individual",
                to: formattedPhone,
                type: "reaction",
                reaction: { message_id: metaMessageId, emoji: emoji }
            };

            await axios.post(
                `https://graph.facebook.com/v19.0/${settings.waNumId}/messages`,
                payload,
                { headers: { 'Authorization': `Bearer ${settings.metaApiKey}` } }
            );
            res.status(200).json({ success: true });
        } else {
            res.status(400).json({ error: "Meta settings missing" });
        }
    } catch (error) {
        console.error("Reaction Error:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to send reaction" });
    }
};

// 11. Fetch Real Meta Templates 
exports.getMetaTemplates = async (req, res) => {
    try {
        res.status(200).json([]);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch templates" });
    }
};

// 12. Get Lead Details (🔥 FIXED: Smart Phone Number Matching 🔥)
exports.getLeadDetails = async (req, res) => {
    try {
        const { phone } = req.params;
        
        // 1. අකුරු, +, හිස්තැන් ඔක්කොම අයින් කරලා ඉලක්කම් ටික විතරක් ගන්නවා
        let cleanPhone = phone.replace(/[^0-9]/g, '').trim();
        
        // 2. මුලට 94 හරි 0 හරි තියෙනවා නම් ඒක අයින් කරලා Core 9 digits ගන්නවා (උදා: 714941559)
        let corePhone = cleanPhone;
        if (corePhone.startsWith('94')) {
            corePhone = corePhone.substring(2);
        } else if (corePhone.startsWith('0')) {
            corePhone = corePhone.substring(1);
        }

        // 3. Database එකේ Phone එකේ හරි Whatsapp එකේ හරි ඔය 9 digits තියෙනවද බලනවා
        const student = await prisma.user.findFirst({
            where: {
                OR: [ 
                    { phone: { contains: corePhone } }, 
                    { whatsapp: { contains: corePhone } } 
                ],
                role: { in: ['Student', 'USER', 'user', 'student'] }
            },
            include: { payments: { include: { business: true, batch: true }, orderBy: { created_at: 'desc' } } }
        });

        if (!student) return res.status(200).json({ isEnrolled: false });

        // 4. ළමයා ඉන්නවා නම් එයාගේ Courses ටික අදිනවා
        let enrolledCourses = [];
        if (student.payments.length > 0) {
            let subjectIds = [];
            student.payments.forEach(p => {
                if (p.subjects) {
                    try {
                        const subs = JSON.parse(p.subjects);
                        subjectIds.push(...subs.map(id => parseInt(id)));
                    } catch(e) {}
                }
            });

            if (subjectIds.length > 0) {
                enrolledCourses = await prisma.course.findMany({ where: { id: { in: subjectIds } } });
            }
        }
        
        res.status(200).json({ isEnrolled: true, student, enrolledCourses });
    } catch (error) { 
        console.error("❌ Lead Details Error:", error);
        res.status(500).json({ error: "Failed to fetch lead details" }); 
    }
};

// 13. Reset Password 
exports.resetStudentPassword = async (req, res) => {
    try {
        const { studentId, newPassword } = req.body;
        await prisma.user.update({ where: { id: parseInt(studentId) }, data: { password: newPassword } });
        res.status(200).json({ message: "Password updated successfully!" });
    } catch (error) { res.status(500).json({ error: "Failed to reset password" }); }
};

// 14. Verify Webhook 
exports.verifyWebhook = (req, res) => {
    const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN || "ImaCampusMetaApp@2026";
    let mode = req.query["hub.mode"];
    let token = req.query["hub.verify_token"];
    let challenge = req.query["hub.challenge"];

    if (mode && token) {
        if (mode === "subscribe" && token === VERIFY_TOKEN) res.status(200).send(challenge);
        else res.sendStatus(403);
    } else res.sendStatus(400);
};