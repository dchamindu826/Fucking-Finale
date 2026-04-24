const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const axios = require('axios');
const fs = require('fs'); 
const path = require('path');
const pdfParse = require('pdf-parse'); 

// ==========================================
// 1. SETTINGS: CrmSettings
// ==========================================
exports.saveCrmSettings = async (req, res) => {
    try {
        const { businessId, campaignType, metaApiKey, waId, waNumId, geminiKeys, botMode, batchId } = req.body;
        if (!businessId || !campaignType) return res.status(400).json({ error: "Missing businessId or campaignType" });

        const existing = await prisma.crmSettings.findFirst({ where: { businessId: parseInt(businessId), campaignType: campaignType } });

        const settingsData = {
            metaApiKey: metaApiKey || null,
            waId: waId || null,
            waNumId: waNumId || null,
            geminiKeys: geminiKeys || [], 
            botMode: botMode || 'OFF',
            batchId: batchId ? String(batchId) : null
        };

        if (existing) {
            const updated = await prisma.crmSettings.update({ where: { id: existing.id }, data: settingsData });
            return res.status(200).json({ message: "Settings updated", data: updated });
        } else {
            const created = await prisma.crmSettings.create({ data: { businessId: parseInt(businessId), campaignType: campaignType, ...settingsData } });
            return res.status(201).json({ message: "Settings saved", data: created });
        }
    } catch (error) { res.status(500).json({ error: "Failed to save settings", details: error.message }); }
};

exports.getCrmSettings = async (req, res) => {
    try {
        const { businessId, campaignType } = req.params;
        const settings = await prisma.crmSettings.findFirst({ where: { businessId: parseInt(businessId), campaignType: campaignType } });
        res.status(200).json(settings || {});
    } catch (error) { res.status(500).json({ error: "Failed to get settings" }); }
};

// ==========================================
// 2. KNOWLEDGE BASE: KnowledgeBase
// ==========================================
exports.uploadKnowledge = async (req, res) => {
    try {
        const { businessId, campaignType } = req.body;
        const file = req.file;
        if (!file) return res.status(400).json({ error: "PDF file is required" });

        const dataBuffer = fs.readFileSync(file.path);
        const data = await pdfParse(dataBuffer);

        const newKB = await prisma.knowledgeBase.create({
            data: {
                businessId: parseInt(businessId), campaignType: campaignType || 'FREE_SEMINAR',
                fileName: file.originalname, fileUrl: `/storage/documents/${file.filename}`, content: data.text
            }
        });
        res.status(201).json({ message: "Knowledge base updated", data: newKB });
    } catch (error) { res.status(500).json({ error: "Failed to upload knowledge base" }); }
};

// ==========================================
// 3. AUTO REPLIES SETUP
// ==========================================
exports.addAutoReply = async (req, res) => {
    try {
        const { businessId, campaignType, stepOrder, message } = req.body;
        const file = req.file;

        let attachmentUrl = null; let attachmentType = null;
        if (file) {
            attachmentUrl = `/storage/documents/${file.filename}`;
            attachmentType = file.mimetype.includes('image') ? 'Image' : 'Document';
        }

        const newTemplate = await prisma.autoReply.create({
            data: {
                businessId: parseInt(businessId), campaignType: campaignType || 'FREE_SEMINAR',
                stepOrder: parseInt(stepOrder) || 1, message: message || '',
                attachment: attachmentUrl, attachmentType: attachmentType
            }
        });
        res.status(201).json({ message: "Auto reply added", data: newTemplate });
    } catch (error) { res.status(500).json({ error: "Failed to add auto reply" }); }
};

exports.getAutoReplies = async (req, res) => {
    try {
        const { businessId, campaignType } = req.query;
        let whereClause = {};
        if (businessId) whereClause.businessId = parseInt(businessId);
        if (campaignType) whereClause.campaignType = campaignType;
        const replies = await prisma.autoReply.findMany({ where: whereClause, orderBy: { stepOrder: 'asc' } });
        res.status(200).json(replies);
    } catch (error) { res.status(500).json({ error: "Failed to get auto replies" }); }
};

exports.deleteAutoReply = async (req, res) => {
    try {
        await prisma.autoReply.delete({ where: { id: parseInt(req.params.id) } });
        res.status(200).json({ message: "Auto reply deleted" });
    } catch (error) { res.status(500).json({ error: "Failed to delete auto reply" }); }
};

// ==========================================
// 4. CAMPAIGN ARCHIVE
// ==========================================
exports.archiveCampaign = async (req, res) => {
    try {
        const { businessId, campaignType } = req.body;
        try {
            await prisma.lead.updateMany({ where: { businessId: parseInt(businessId), campaignType, status: { not: 'ARCHIVED' } }, data: { status: 'ARCHIVED' } });
        } catch (e) { console.log("No lead table found to archive"); }
        res.status(200).json({ message: "Campaign archived successfully." });
    } catch (error) { res.status(500).json({ error: "Failed to archive campaign" }); }
};

// ==========================================
// 5. CRM LEADS MANAGEMENT
// ==========================================
// 1. GET LEADS 
exports.getLeads = async (req, res) => {
    try {
        // 🔥 Backend Robust Role Check 🔥
        const userRoleRaw = req.user?.role || 'MANAGER'; 
        const userRole = userRoleRaw.toUpperCase().replace(' ', '_');
        const userId = req.user?.id || 1;
        const { campaignType, tab, staffPhase, status, staffId } = req.query; 

        let whereClause = { campaignType: campaignType || 'FREE_SEMINAR' };
        const isManager = ['SYSTEM_ADMIN', 'DIRECTOR', 'MANAGER', 'SUPER', 'ASS_MANAGER'].includes(userRole);

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
            if (staffId && staffId !== '') whereClause.assignedTo = parseInt(staffId);
            else if (!isManager) whereClause.assignedTo = parseInt(userId);
            if (staffPhase && staffPhase !== '') whereClause.phase = parseInt(staffPhase);
            if (status && status !== '') whereClause.callStatus = status;
        }
        else if (tab === 'ALL') {
            if (!isManager) whereClause.OR = [ { assignedTo: null }, { assignedTo: parseInt(userId) } ];
            else delete whereClause.assignedTo; 
        }

        const leads = await prisma.lead.findMany({
            where: whereClause, orderBy: [ { unreadCount: 'desc' }, { updatedAt: 'desc' } ], 
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
    } catch (error) { res.status(500).json({ error: "Failed to fetch leads" }); }
};

// 2. IMPORT LEAD
exports.importLead = async (req, res) => {
    try {
        const { name, number, campaignType, isBulk, leadsList } = req.body;
        
        // 🔥 Backend Robust Role Check 🔥
        const userRoleRaw = req.user?.role || '';
        const userRole = userRoleRaw.toUpperCase().replace(' ', '_');
        const userId = req.user?.id;
        const isManager = ['SYSTEM_ADMIN', 'DIRECTOR', 'MANAGER', 'SUPER', 'ASS_MANAGER'].includes(userRole);
        const assignedTo = isManager ? null : parseInt(userId);

        if (isBulk && leadsList && Array.isArray(leadsList)) {
            let importedCount = 0;
            for (const lead of leadsList) {
                const phone = lead.number?.toString().trim();
                if (!phone) continue;
                await prisma.lead.upsert({
                    where: { phone: phone },
                    update: { name: lead.name || '', source: 'bulk_import' }, 
                    create: { name: lead.name || '', phone: phone, source: 'bulk_import', campaignType: campaignType || 'FREE_SEMINAR', assignedTo, status: assignedTo ? 'OPEN' : 'NEW', phase: 1, callStatus: 'pending' }
                });
                importedCount++;
            }
            return res.status(201).json({ message: `${importedCount} leads imported successfully!` });
        } else {
            const newLead = await prisma.lead.upsert({
                where: { phone: number },
                update: { name, source: 'import' }, 
                create: { name, phone: number, source: 'import', campaignType: campaignType || 'FREE_SEMINAR', assignedTo, status: assignedTo ? 'OPEN' : 'NEW', phase: 1, callStatus: 'pending' }
            });
            return res.status(201).json({ message: "Lead imported successfully!", lead: newLead });
        }
    } catch (error) { res.status(500).json({ error: "Failed to import lead" }); }
};

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

exports.assignLeads = async (req, res) => {
    try {
        const { type, staffId, count, sort, autoAssignConfig } = req.body;
        if (type === 'bulk') {
            const leadsToAssign = await prisma.lead.findMany({ where: { assignedTo: null, status: 'NEW' }, orderBy: { createdAt: sort === 'oldest' ? 'asc' : 'desc' }, take: parseInt(count) });
            if (leadsToAssign.length === 0) return res.status(400).json({ error: "No unassigned leads found." });
            const ids = leadsToAssign.map(l => l.id);
            await prisma.lead.updateMany({ where: { id: { in: ids } }, data: { assignedTo: parseInt(staffId), status: 'OPEN', phase: 1, callStatus: 'pending' } });
            return res.status(200).json({ message: `${leadsToAssign.length} leads assigned!` });
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

exports.getAutoAssignQuotas = async (req, res) => {
    try {
        const quotas = await prisma.autoAssignQuota.findMany({ include: { staff: { select: { firstName: true, lastName: true } } } });
        res.status(200).json(quotas);
    } catch (error) { res.status(500).json({ error: "Failed to load quotas" }); }
};

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

const runAutoAssign = async (leadId) => {
    const availableStaff = await prisma.autoAssignQuota.findFirst({
        where: { isActive: true, assigned: { lt: prisma.autoAssignQuota.fields.quotaAmount } },
        orderBy: { assigned: 'asc' }
    });
    if (availableStaff) {
        await prisma.lead.update({ where: { id: leadId }, data: { assignedTo: availableStaff.staffId, status: 'OPEN', isAutoAssigned: true } });
        await prisma.autoAssignQuota.update({ where: { id: availableStaff.id }, data: { assigned: { increment: 1 } } });
    }
};

// ==========================================
// 6. RECEIVE MESSAGE WEBHOOK & AUTO REPLY LOGIC 
// ==========================================
exports.receiveMessage = async (req, res) => {
    try {
        let body = req.body;
        if (body.object === "whatsapp_business_account" && body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {
            let msgData = body.entry[0].changes[0].value.messages[0];
            let contactData = body.entry[0].changes[0].value.contacts[0];
            let phone = msgData.from; 
            let name = contactData.profile.name; 
            let metaMsgId = msgData.id; 

            console.log(`\n\n💬 === NEW INBOUND MESSAGE FROM: ${phone} ===`);

            const settings = await prisma.crmSettings.findFirst({ where: { campaignType: 'FREE_SEMINAR' } });
            
            let messageText = msgData.text ? msgData.text.body : "Media Message";
            
            const isRestartCommand = ['hi', 'hello', 'hey', 'menu', 'start'].includes(messageText.toLowerCase().trim());

            let existingLead = await prisma.lead.findUnique({ where: { phone } });
            let needsAssignment = !existingLead || !existingLead.assignedTo; 
            
            const timeSinceLastMsg = existingLead && existingLead.updatedAt ? new Date() - new Date(existingLead.updatedAt) : 10000;
            const isSpamming = timeSinceLastMsg < 2000; 
            
            if(isSpamming) console.log("⚠️ SPAM DETECTED: Ignoring Auto Reply to prevent duplicates.");

            let resetData = {};
            if (isRestartCommand) {
                resetData = { autoReplyStep: 0, sequenceCompleted: false };
                console.log("🔄 User sent restart command (hi/hello). FORCE RESETTING Auto Reply Sequence!");
            }

            existingLead = await prisma.lead.upsert({
                where: { phone: phone },
                update: { 
                    name: name, lastMessage: messageText || 'Received Media', unreadCount: { increment: 1 },
                    status: existingLead?.assignedTo ? 'OPEN' : 'NEW', updatedAt: new Date(), ...resetData
                },
                create: {
                    name: name, phone: phone, source: 'whatsapp', campaignType: 'FREE_SEMINAR', 
                    lastMessage: messageText || 'Received Media', unreadCount: 1, status: 'NEW', phase: 1, callStatus: 'pending', 
                    autoReplyStep: 0, sequenceCompleted: false 
                }
            });

            if (needsAssignment) await runAutoAssign(existingLead.id);

            await prisma.chatMessage.create({
                data: { leadId: existingLead.id, message: messageText, direction: 'inbound', senderType: 'USER', senderName: name, metaMessageId: metaMsgId }
            });

            if ((settings?.botMode === 'ON' || settings?.botMode === 'AUTO_REPLY_ONLY') && !existingLead.sequenceCompleted && !isSpamming) {
                const autoReplies = await prisma.autoReply.findMany({ 
                    where: { campaignType: 'FREE_SEMINAR', businessId: settings.businessId }, 
                    orderBy: { stepOrder: 'asc' } 
                });
                
                if (autoReplies.length > 0) {
                    const currentStep = existingLead.autoReplyStep || 0;
                    const nextReply = autoReplies.find(r => r.stepOrder > currentStep);

                    if (nextReply) {
                        let formattedPhone = phone.startsWith('0') ? '94' + phone.substring(1) : phone;
                        let metaPayload = { messaging_product: "whatsapp", recipient_type: "individual", to: formattedPhone };

                        if (nextReply.attachment) {
                            const attachmentPath = nextReply.attachment.startsWith('/') ? nextReply.attachment : `/${nextReply.attachment}`;
                            const liveMediaUrl = `https://imacampus.online${attachmentPath}`; 
                            
                            if (nextReply.attachmentType === 'Image') {
                                metaPayload.type = "image"; metaPayload.image = { link: liveMediaUrl, caption: nextReply.message || "" };
                            } else {
                                metaPayload.type = "document"; metaPayload.document = { link: liveMediaUrl, caption: nextReply.message || "" };
                            }
                        } else {
                            metaPayload.type = "text"; metaPayload.text = { body: nextReply.message };
                        }

                        try {
                            await axios.post(`https://graph.facebook.com/v19.0/${settings.waNumId}/messages`, metaPayload, { headers: { 'Authorization': `Bearer ${settings.metaApiKey}` } });

                            await prisma.chatMessage.create({
                                data: { leadId: existingLead.id, message: nextReply.message, mediaUrl: nextReply.attachment, mediaType: nextReply.attachmentType, direction: 'outbound', senderType: 'SYSTEM', senderName: 'AutoBot' }
                            });

                            const isLastStep = autoReplies[autoReplies.length - 1].id === nextReply.id;
                            await prisma.lead.update({
                                where: { id: existingLead.id },
                                data: { autoReplyStep: nextReply.stepOrder, sequenceCompleted: isLastStep }
                            });

                        } catch (sendErr) {
                            console.error(`❌ Meta Send ERROR:`, sendErr.response?.data || sendErr.message);
                        }
                    } 
                }
            } 
        }
        res.status(200).send("EVENT_RECEIVED");
    } catch (error) { res.status(500).send("ERROR"); }
};

// ==========================================
// 7. CRM CHAT MESSAGES
// ==========================================
exports.getMessages = async (req, res) => {
    try {
        const { leadId } = req.params;
        await prisma.lead.update({ where: { id: parseInt(leadId) }, data: { unreadCount: 0 } });
        const messages = await prisma.chatMessage.findMany({ where: { leadId: parseInt(leadId) }, orderBy: { createdAt: 'asc' } });
        res.status(200).json(messages);
    } catch (error) { res.status(500).json({ error: "Failed to fetch messages" }); }
};

exports.sendMessage = async (req, res) => {
    try {
        const { leadId, message, senderName, replyToMetaId, localUIMessage } = req.body; 
        const lead = await prisma.lead.findUnique({ where: { id: parseInt(leadId) } });
        if (!lead) return res.status(404).json({ error: "Lead not found" });
        
        let formattedPhone = lead.phone.replace(/[^0-9]/g, ''); 
        if (formattedPhone.startsWith('0')) formattedPhone = '94' + formattedPhone.substring(1);

        let mediaUrl = null; let mediaType = null;
        if (req.file) { mediaUrl = `/storage/documents/${req.file.filename}`; mediaType = req.file.mimetype; }

        const newMsg = await prisma.chatMessage.create({
            data: {
                leadId: parseInt(leadId), message: localUIMessage || message || '', mediaUrl, mediaType,
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
                let metaPayload = { messaging_product: "whatsapp", recipient_type: "individual", to: formattedPhone };
                if (replyToMetaId && replyToMetaId !== 'null' && replyToMetaId !== 'undefined') metaPayload.context = { message_id: replyToMetaId };

                if (message && !mediaUrl) {
                    metaPayload.type = "text"; metaPayload.text = { preview_url: false, body: message };
                } else if (mediaUrl) {
                    const liveMediaUrl = `https://imacampus.online${mediaUrl}`; 
                    if (mediaType.includes('image')) { metaPayload.type = "image"; metaPayload.image = { link: liveMediaUrl, caption: message || "" }; } 
                    else if (mediaType.includes('pdf')) { metaPayload.type = "document"; metaPayload.document = { link: liveMediaUrl, caption: message || "", filename: req.file.originalname }; } 
                    else if (mediaType.includes('video')) { metaPayload.type = "video"; metaPayload.video = { link: liveMediaUrl, caption: message || "" }; }
                }

                const metaRes = await axios.post(`https://graph.facebook.com/v19.0/${settings.waNumId}/messages`, metaPayload, { headers: { 'Authorization': `Bearer ${settings.metaApiKey}`, 'Content-Type': 'application/json' } });
                if (metaRes.data?.messages?.[0]?.id) await prisma.chatMessage.update({ where: { id: newMsg.id }, data: { metaMessageId: metaRes.data.messages[0].id } });
            }
        } catch (metaError) { console.error(`❌ [META API ERROR]`, metaError.message); }
        res.status(201).json(newMsg);
    } catch (error) { res.status(500).json({ error: "Failed to send message" }); }
};

exports.sendReaction = async (req, res) => {
    try {
        const { leadId, metaMessageId, emoji } = req.body;
        if (!metaMessageId) return res.status(400).json({ error: "No Meta Message ID provided" });

        const lead = await prisma.lead.findUnique({ where: { id: parseInt(leadId) } });
        let formattedPhone = lead.phone.replace(/[^0-9]/g, ''); 
        if (formattedPhone.startsWith('0')) formattedPhone = '94' + formattedPhone.substring(1);

        const settings = await prisma.crmSettings.findFirst({ where: { campaignType: lead.campaignType || 'FREE_SEMINAR' } });
        if (settings && settings.metaApiKey && settings.waNumId) {
            await axios.post(`https://graph.facebook.com/v19.0/${settings.waNumId}/messages`, {
                messaging_product: "whatsapp", recipient_type: "individual", to: formattedPhone, type: "reaction", reaction: { message_id: metaMessageId, emoji: emoji }
            }, { headers: { 'Authorization': `Bearer ${settings.metaApiKey}` } });
            res.status(200).json({ success: true });
        }
    } catch (error) { res.status(500).json({ error: "Failed to send reaction" }); }
};

// ==========================================
// 8. META TEMPLATES LOGIC 
// ==========================================
const uploadToMeta = async (fileObj, accessToken) => {
    try {
        const debugRes = await axios.get(`https://graph.facebook.com/v19.0/debug_token`, { params: { input_token: accessToken, access_token: accessToken } });
        const appId = debugRes.data.data.app_id;

        const fileBuffer = fs.readFileSync(fileObj.path);
        const fileLength = fileBuffer.length;
        const fileType = fileObj.mimetype;

        const sessionUrl = `https://graph.facebook.com/v19.0/${appId}/uploads?file_length=${fileLength}&file_type=${fileType}`;
        const sessionRes = await axios.post(sessionUrl, null, { headers: { Authorization: `Bearer ${accessToken}` } });
        const uploadId = sessionRes.data.id;

        const uploadUrl = `https://graph.facebook.com/v19.0/${uploadId}`;
        const handleRes = await axios.post(uploadUrl, fileBuffer, {
            headers: { Authorization: `Bearer ${accessToken}`, "OAuth-Token": accessToken, "file_offset": 0 }
        });
        return handleRes.data.h;
    } catch (error) {
        console.error("❌ Meta Upload Failed:", error.response?.data || error.message);
        return null;
    }
};

exports.getMetaTemplates = async (req, res) => {
    try {
        const settings = await prisma.crmSettings.findFirst({ where: { campaignType: 'FREE_SEMINAR' } });
        if (!settings || !settings.metaApiKey || !settings.waId) return res.status(400).json({ error: "WABA ID is missing in CRM Settings." });

        const url = `https://graph.facebook.com/v19.0/${settings.waId}/message_templates`;
        const response = await axios.get(url, { headers: { Authorization: `Bearer ${settings.metaApiKey}` } });
        res.status(200).json(response.data.data);
    } catch (error) { res.status(500).json({ error: "Failed to fetch templates" }); }
};

exports.createMetaTemplate = async (req, res) => {
    try {
        const { name, category, language, bodyText, headerType, headerText, footerText, buttons } = req.body;
        const settings = await prisma.crmSettings.findFirst({ where: { campaignType: 'FREE_SEMINAR' } });

        if (!settings?.metaApiKey || !settings?.waId) return res.status(400).json({ error: "WABA ID or API Key missing in DB." });

        let components = [];

        if (headerType && headerType !== 'NONE') {
            let headerComp = { type: "HEADER", format: headerType };
            if (headerType === 'TEXT') headerComp.text = headerText;
            else if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerType) && req.file) {
                const fileHandle = await uploadToMeta(req.file, settings.metaApiKey);
                if (!fileHandle) return res.status(400).json({ error: "Meta File Upload Failed" });
                headerComp.example = { header_handle: [fileHandle] };
            }
            components.push(headerComp);
        }

        let bodyComp = { type: "BODY", text: bodyText };
        const varCount = (bodyText.match(/{{/g) || []).length;
        if (varCount > 0) bodyComp.example = { body_text: [Array(varCount).fill("Sample")] };
        components.push(bodyComp);

        if (footerText) components.push({ type: "FOOTER", text: footerText });
        if (buttons) {
            let parsedButtons = typeof buttons === 'string' ? JSON.parse(buttons) : buttons;
            if (parsedButtons.length > 0) {
                let btnComps = parsedButtons.map(btn => ({ type: "QUICK_REPLY", text: btn.text }));
                components.push({ type: "BUTTONS", buttons: btnComps });
            }
        }

        const payload = { name: name.toLowerCase().replace(/ /g, '_'), category: category || 'MARKETING', language: language || "en_US", components };

        const metaRes = await axios.post(`https://graph.facebook.com/v19.0/${settings.waId}/message_templates`, payload, {
            headers: { Authorization: `Bearer ${settings.metaApiKey}` }
        });

        res.status(201).json({ success: true, data: metaRes.data });
    } catch (err) {
        console.error("❌ META TEMPLATE FAILED:", err.response?.data || err.message);
        res.status(500).json({ error: err.response?.data?.error?.message || "Failed to create template" });
    }
};

exports.deleteMetaTemplate = async (req, res) => {
    try {
        const settings = await prisma.crmSettings.findFirst({ where: { campaignType: 'FREE_SEMINAR' } });
        await axios.delete(`https://graph.facebook.com/v19.0/${settings.waId}/message_templates?name=${req.params.name}`, {
            headers: { Authorization: `Bearer ${settings.metaApiKey}` }
        });
        res.status(200).json({ message: "Template deleted!" });
    } catch (error) { res.status(500).json({ error: "Delete failed" }); }
};

// ==========================================
// 9. ADVANCED STATS & BROADCAST
// ==========================================
exports.getCampaignStats = async (req, res) => {
    try {
        const { businessId, batchId, phase, startDate, endDate } = req.query;

        let leadWhere = { campaignType: 'FREE_SEMINAR' };
        if (businessId && businessId !== '') leadWhere.businessId = parseInt(businessId);
        if (batchId && batchId !== '') leadWhere.batchId = parseInt(batchId);
        if (phase && phase !== 'All') leadWhere.phase = parseInt(phase);

        const staff = await prisma.user.findMany({ where: { role: { in: ['Coordinator', 'STAFF'] } } });
        const leads = await prisma.lead.findMany({ where: leadWhere });

        const unassignedLeads = leads.filter(l => !l.assignedTo).length;
        const totalLeads = leads.length;

        let msgWhere = {};
        if (startDate && endDate) msgWhere.createdAt = { gte: new Date(startDate), lte: new Date(endDate) };
        const chatMessages = await prisma.chatMessage.findMany({ where: msgWhere });

        let report = []; let msgReport = [];
        let summary = { totalLeads, unassignedLeads, totalSent: 0, totalReceived: 0, totalAnswered: 0, rate: 0 };

        staff.forEach(agent => {
            const agentLeads = leads.filter(l => l.assignedTo === agent.id);
            const assigned = agentLeads.length;
            const answered = agentLeads.filter(l => l.callStatus === 'answered').length;
            const noAnswer = agentLeads.filter(l => l.callStatus === 'no_answer').length;
            const reject = agentLeads.filter(l => l.callStatus === 'reject').length;
            const pending = agentLeads.filter(l => l.callStatus === 'pending' || !l.callStatus).length;
            const responseRate = assigned > 0 ? ((answered / assigned) * 100).toFixed(1) : 0;

            report.push({ agentName: agent.firstName, assigned, answered, noAnswer, reject, pending, responseRate });
            summary.totalAnswered += answered;

            const agentSentMsgs = chatMessages.filter(m => m.direction === 'outbound' && m.senderId === agent.id);
            const uniqueSentIds = new Set(agentSentMsgs.map(m => m.leadId));
            const assignedLeadIds = new Set(agentLeads.map(l => l.id));
            const agentReceivedMsgs = chatMessages.filter(m => m.direction === 'inbound' && assignedLeadIds.has(m.leadId));
            const uniqueReceivedIds = new Set(agentReceivedMsgs.map(m => m.leadId));

            msgReport.push({ agentName: agent.firstName, sentMsgs: agentSentMsgs.length, uniqueSent: uniqueSentIds.size, receivedMsgs: agentReceivedMsgs.length, uniqueReceived: uniqueReceivedIds.size });

            summary.totalSent += agentSentMsgs.length;
            summary.totalReceived += agentReceivedMsgs.length;
        });

        summary.rate = (totalLeads - unassignedLeads) > 0 ? ((summary.totalAnswered / (totalLeads - unassignedLeads)) * 100).toFixed(1) : 0;
        res.status(200).json({ summary, report, msgReport });
    } catch (error) { res.status(500).json({ error: "Failed to load stats" }); }
};

exports.sendBroadcast = async (req, res) => {
    try {
        const { leadIds, type, message, templateName } = req.body;
        const parsedLeadIds = typeof leadIds === 'string' ? JSON.parse(leadIds) : leadIds;
        const leads = await prisma.lead.findMany({ where: { id: { in: parsedLeadIds } } });
        const settings = await prisma.crmSettings.findFirst({ where: { campaignType: 'FREE_SEMINAR' } });

        if (!settings?.metaApiKey) return res.status(400).json({ error: "Meta Config Missing" });

        let mediaUrl = null; let mediaType = null;
        if (req.file) { mediaUrl = `/storage/documents/${req.file.filename}`; mediaType = req.file.mimetype; }

        let results = { success: 0, failed: 0, reasons: [] };

        for (const lead of leads) {
            let formattedPhone = lead.phone.replace(/[^0-9]/g, ''); 
            if (formattedPhone.startsWith('0')) formattedPhone = '94' + formattedPhone.substring(1);
            let metaPayload = { messaging_product: "whatsapp", recipient_type: "individual", to: formattedPhone };

            if (type === '24H') {
                if (mediaUrl) {
                    const liveMediaUrl = `https://imacampus.online${mediaUrl}`;
                    if (mediaType.includes('image')) { metaPayload.type = "image"; metaPayload.image = { link: liveMediaUrl, caption: message || "" }; }
                    else if (mediaType.includes('pdf')) { metaPayload.type = "document"; metaPayload.document = { link: liveMediaUrl, caption: message || "", filename: req.file.originalname }; }
                    else if (mediaType.includes('video')) { metaPayload.type = "video"; metaPayload.video = { link: liveMediaUrl, caption: message || "" }; }
                } else {
                    metaPayload.type = "text"; metaPayload.text = { preview_url: true, body: message };
                }
            } else {
                metaPayload.type = "template"; 
                metaPayload.template = { name: templateName, language: { code: "en_US" } };

                let templateComponents = [];

                if (req.body.components) {
                    let parsedComps = typeof req.body.components === 'string' ? JSON.parse(req.body.components) : req.body.components;
                    templateComponents = parsedComps.map(comp => {
                        if (comp.type === 'button' || comp.type === 'buttons') {
                            return { ...comp, type: "button", sub_type: "quick_reply", index: comp.index || 0, parameters: comp.parameters || [{ type: "payload", payload: `BTN_${comp.index || 0}` }] };
                        }
                        return comp;
                    });
                } else {
                    if (mediaUrl) {
                        const liveMediaUrl = `https://imacampus.online${mediaUrl}`;
                        let mediaTypeStr = "document";
                        if (mediaType.includes('image')) mediaTypeStr = "image";
                        else if (mediaType.includes('video')) mediaTypeStr = "video";
                        templateComponents.push({ type: "header", parameters: [ { type: mediaTypeStr, [mediaTypeStr]: { link: liveMediaUrl } } ] });
                    }
                    if (message && message.trim() !== '') {
                        const variables = message.split(',').map(v => v.trim());
                        const textParams = variables.map(v => ({ type: "text", text: v }));
                        templateComponents.push({ type: "body", parameters: textParams });
                    }
                }
                if (templateComponents.length > 0) metaPayload.template.components = templateComponents;
            }

            try {
                await axios.post(`https://graph.facebook.com/v19.0/${settings.waNumId}/messages`, metaPayload, { headers: { 'Authorization': `Bearer ${settings.metaApiKey}` } });
                results.success += 1;
            } catch (err) {
                results.failed += 1; results.reasons.push({ phone: lead.phone, error: err.response?.data?.error?.message || "Unknown error" });
            }
        }
        res.status(200).json(results);
    } catch (error) { res.status(500).json({ error: "Broadcast failed" }); }
};

exports.getAllCampaignLeads = async (req, res) => {
    try {
        const leads = await prisma.lead.findMany({ orderBy: { updatedAt: 'desc' } }); 
        res.status(200).json(leads);
    } catch (error) { res.status(500).json({ error: "Failed to fetch leads" }); }
};

// ==========================================
// 10. STUDENT VERIFICATIONS & DETAILS
// ==========================================
exports.getLeadDetails = async (req, res) => {
    try {
        const { phone } = req.params;
        let cleanPhone = phone.replace(/[^0-9]/g, '').trim();
        let corePhone = cleanPhone;
        if (corePhone.startsWith('94')) corePhone = corePhone.substring(2);
        else if (corePhone.startsWith('0')) corePhone = corePhone.substring(1);

        const student = await prisma.user.findFirst({
            where: {
                OR: [ { phone: { contains: corePhone } }, { whatsapp: { contains: corePhone } } ],
                role: { in: ['Student', 'USER', 'user', 'student'] }
            },
            include: { payments: { include: { business: true, batch: true }, orderBy: { created_at: 'desc' } } }
        });

        if (!student) return res.status(200).json({ isEnrolled: false });

        let enrolledCourses = [];
        if (student.payments.length > 0) {
            let subjectIds = [];
            student.payments.forEach(p => {
                if (p.subjects) {
                    try { const subs = JSON.parse(p.subjects); subjectIds.push(...subs.map(id => parseInt(id))); } catch(e) {}
                }
            });
            if (subjectIds.length > 0) enrolledCourses = await prisma.course.findMany({ where: { id: { in: subjectIds } } });
        }
        res.status(200).json({ isEnrolled: true, student, enrolledCourses });
    } catch (error) { res.status(500).json({ error: "Failed to fetch lead details" }); }
};

exports.resetStudentPassword = async (req, res) => {
    try {
        const { studentId, newPassword } = req.body;
        await prisma.user.update({ where: { id: parseInt(studentId) }, data: { password: newPassword } });
        res.status(200).json({ message: "Password updated successfully!" });
    } catch (error) { res.status(500).json({ error: "Failed to reset password" }); }
};

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

// 20H Follow up engine 
exports.runAutoFollowUpEngine = async () => {
    try {
        console.log("⏳ Running 20H Unread Follow-up Check...");
        const settings = await prisma.crmSettings.findFirst({ where: { campaignType: 'FREE_SEMINAR' } });
        if (!settings || !settings.metaApiKey) return;

        const twentyHoursAgo = new Date(Date.now() - 20 * 60 * 60 * 1000);
        const twentyThreeHoursAgo = new Date(Date.now() - 23 * 60 * 60 * 1000);

        const unreadLeads = await prisma.lead.findMany({
            where: { unreadCount: { gt: 0 }, updatedAt: { lte: twentyHoursAgo, gte: twentyThreeHoursAgo } }
        });

        if (unreadLeads.length === 0) return;

        for (const lead of unreadLeads) {
            let formattedPhone = lead.phone.replace(/[^0-9]/g, ''); 
            if (formattedPhone.startsWith('0')) formattedPhone = '94' + formattedPhone.substring(1);

            let metaPayload = {
                messaging_product: "whatsapp", recipient_type: "individual", to: formattedPhone, type: "interactive",
                interactive: { type: "button", body: { text: "ආයුබෝවන් පුතේ, ඔයාගේ ගැටලුවට විසඳුමක් හම්බුනාද?" }, action: { buttons: [ { type: "reply", reply: { id: "FU_YES", title: "ඔව්" } }, { type: "reply", reply: { id: "FU_NO", title: "නැත" } } ] } }
            };

            try {
                await axios.post(`https://graph.facebook.com/v19.0/${settings.waNumId}/messages`, metaPayload, { headers: { 'Authorization': `Bearer ${settings.metaApiKey}` } });
                await prisma.chatMessage.create({ data: { leadId: lead.id, message: "ආයුබෝවන් පුතේ, ඔයාගේ ගැටලුවට විසඳුමක් හම්බුනාද? (Buttons Sent)", direction: 'outbound', senderType: 'SYSTEM', senderName: 'FollowUpBot' } });
            } catch (err) {}
        }
    } catch (error) { console.error("Follow-up Engine Error:", error); }
};

setInterval(() => { exports.runAutoFollowUpEngine(); }, 60 * 60 * 1000);