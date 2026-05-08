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
            if (file.mimetype.includes('image')) {
                attachmentType = 'Image';
            } else if (file.mimetype.includes('video')) {
                attachmentType = 'Video';
            } else {
                attachmentType = 'Document';
            }
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
exports.getLeads = async (req, res) => {
    try {
        const userId = req.user?.id || req.query.loggedUserId || 1;
        const userRoleRaw = req.user?.role || req.query.loggedUserRole || 'STAFF'; 
        const userRole = String(userRoleRaw).toUpperCase().replace(/ /g, '_');

        const { campaignType, tab, staffPhase, status, staffId, batchId, businessId } = req.query; 
        const isManager = ['SYSTEM_ADMIN', 'DIRECTOR', 'MANAGER', 'SUPER', 'ASS_MANAGER'].includes(userRole);

        let whereClause = { campaignType: campaignType || 'FREE_SEMINAR' };

        // 🔥 FIX: Replaced Phone String Mapping with strict Batch ID lookup
        if (batchId && batchId !== '') {
            whereClause.batchId = parseInt(batchId);
        } else if (businessId && businessId !== '') {
            const bizBatches = await prisma.batch.findMany({ where: { businessId: parseInt(businessId) }, select: { id: true }});
            whereClause.batchId = { in: bizBatches.map(b => b.id) };
        }

        // 🔥 TAB FILTERING LOGIC 🔥
        if (tab === 'NEW') {
            whereClause.status = 'NEW';
            if (isManager) whereClause.assignedTo = null; 
            else whereClause.assignedTo = parseInt(userId);
        } 
        else if (tab === 'IMPORTED') {
            whereClause.source = { in: ['import', 'bulk_import'] };
            if (staffId && staffId !== '') whereClause.assignedTo = parseInt(staffId);
            else if (!isManager) whereClause.assignedTo = parseInt(userId);
        } 
        else if (tab === 'ASSIGNED') {
            whereClause.assignedTo = { not: null }; 
            if (staffId && staffId !== '') {
                whereClause.assignedTo = parseInt(staffId);
            } else if (!isManager) {
                whereClause.assignedTo = parseInt(userId);
            }
            if (staffPhase && staffPhase !== '') whereClause.phase = parseInt(staffPhase);
            if (status && status !== '') whereClause.callStatus = status;
        }
        else if (tab === 'ALL') {
            if (staffId && staffId !== '') whereClause.assignedTo = parseInt(staffId);
            else if (!isManager) whereClause.assignedTo = parseInt(userId);
        }

        const leads = await prisma.lead.findMany({
            where: whereClause, 
            orderBy: [ { unreadCount: 'desc' }, { updatedAt: 'desc' } ], 
            include: { 
                assignedUser: { select: { firstName: true, lastName: true } }, 
                batch: { select: { name: true } } 
            }
        });

        const cleanedLeads = leads.map(l => ({
            ...l,
            phone: l.phone ? l.phone.split('_BIZ')[0] : ''
        }));

        // 🔥 FIX: COUNTS LOGIC - Strict Batch isolation
        let countWhere = { campaignType: campaignType || 'FREE_SEMINAR' };
        if (batchId && batchId !== '') {
            countWhere.batchId = parseInt(batchId);
        } else if (businessId && businessId !== '') {
            const bizBatches = await prisma.batch.findMany({ where: { businessId: parseInt(businessId) }, select: { id: true }});
            countWhere.batchId = { in: bizBatches.map(b => b.id) };
        }

        const allLeadsForCounts = await prisma.lead.findMany({ where: countWhere });
        let counts = { NEW: 0, IMPORTED: 0, ASSIGNED: 0, ALL: 0 };
        let unreadCounts = { NEW: 0, IMPORTED: 0, ASSIGNED: 0, ALL: 0 };
        let totalUnread = 0;

        allLeadsForCounts.forEach(l => {
            if (!isManager && l.assignedTo && l.assignedTo !== parseInt(userId)) return;

            counts.ALL++;
            if (l.status === 'NEW' && !l.assignedTo) counts.NEW++;
            if (l.source === 'import' || l.source === 'bulk_import') counts.IMPORTED++;
            
            if (l.assignedTo) {
                if (staffId && staffId !== '') {
                    if (l.assignedTo === parseInt(staffId)) counts.ASSIGNED++;
                } else {
                    counts.ASSIGNED++;
                }
            }

            if (l.unreadCount > 0) {
                totalUnread++;
                unreadCounts.ALL++;
                if (l.status === 'NEW' && !l.assignedTo) unreadCounts.NEW++;
                if (l.source === 'import' || l.source === 'bulk_import') unreadCounts.IMPORTED++;
                
                if (l.assignedTo) {
                    if (staffId && staffId !== '') {
                        if (l.assignedTo === parseInt(staffId)) unreadCounts.ASSIGNED++;
                    } else {
                        unreadCounts.ASSIGNED++;
                    }
                }
            }
        });

        if (!res.headersSent) {
            return res.status(200).json({ leads: cleanedLeads, counts, unreadCounts, totalUnread });
        }
        
    } catch (error) { 
        console.error("Error in getLeads:", error);
        if (!res.headersSent) {
            return res.status(500).json({ error: "Failed to fetch leads" }); 
        }
    }
};

exports.importLead = async (req, res) => {
    try {
        const { name, number, campaignType, isBulk, leadsList, batchId, businessId } = req.body;
        
        const userRoleRaw = req.user?.role || '';
        const userRole = userRoleRaw.toUpperCase().replace(/ /g, '_');
        const userId = req.user?.id;
        const isManager = ['SYSTEM_ADMIN', 'DIRECTOR', 'MANAGER', 'SUPER', 'ASS_MANAGER'].includes(userRole);
        const assignedTo = isManager ? null : parseInt(userId);
        const parsedBatchId = batchId ? parseInt(batchId) : null;
        const parsedBusinessId = businessId ? parseInt(businessId) : null;

        if (!parsedBusinessId) {
            return res.status(400).json({ error: "Business ID is required to isolate leads properly." });
        }

        if (isBulk && leadsList && Array.isArray(leadsList)) {
            let importedCount = 0;
            for (const lead of leadsList) {
                const phone = lead.number?.toString().trim();
                if (!phone) continue;
                
                const dbPhone = parsedBatchId 
                    ? `${phone}_BIZ_${parsedBusinessId}_BATCH_${parsedBatchId}` 
                    : `${phone}_BIZ_${parsedBusinessId}`;

                await prisma.lead.upsert({
                    where: { phone: dbPhone },
                    update: { name: lead.name || '', source: 'bulk_import' }, 
                    create: { name: lead.name || '', phone: dbPhone, batchId: parsedBatchId, source: 'bulk_import', campaignType: campaignType || 'FREE_SEMINAR', assignedTo, status: assignedTo ? 'OPEN' : 'NEW', phase: 1, callStatus: 'pending' }
                });
                importedCount++;
            }
            return res.status(201).json({ message: `${importedCount} leads imported successfully!` });
        } else {
            const dbPhone = parsedBatchId 
                ? `${number}_BIZ_${parsedBusinessId}_BATCH_${parsedBatchId}` 
                : `${number}_BIZ_${parsedBusinessId}`;

            const newLead = await prisma.lead.upsert({
                where: { phone: dbPhone },
                update: { name, source: 'import' }, 
                create: { name, phone: dbPhone, batchId: parsedBatchId, source: 'import', campaignType: campaignType || 'FREE_SEMINAR', assignedTo, status: assignedTo ? 'OPEN' : 'NEW', phase: 1, callStatus: 'pending' }
            });
            return res.status(201).json({ message: "Lead imported successfully!", lead: newLead });
        }
    } catch (error) { res.status(500).json({ error: "Failed to import lead" }); }
};

exports.bulkActions = async (req, res) => {
    try {
        const { action, leadIds, staffId } = req.body;
        if (action === 'MARK_READ') {
            await prisma.lead.updateMany({ where: { id: { in: leadIds } }, data: { unreadCount: 0 } });
        } 
        else if (action === 'MARK_UNREAD') {
            await prisma.lead.updateMany({ where: { id: { in: leadIds } }, data: { unreadCount: 1, assignedTo: null, status: 'NEW' } });
        } 
        else if (action === 'ASSIGN') {
            await prisma.lead.updateMany({ where: { id: { in: leadIds } }, data: { assignedTo: parseInt(staffId), status: 'OPEN', phase: 1, callStatus: 'pending' } });
        } 
        else if (action === 'UNASSIGN') {
            await prisma.lead.updateMany({ where: { id: { in: leadIds } }, data: { assignedTo: null, status: 'NEW', phase: 1, callStatus: 'pending' } });
        }
        res.status(200).json({ message: "Action successful" });
    } catch (error) { res.status(500).json({ error: "Bulk action failed" }); }
};

exports.assignLeads = async (req, res) => {
    try {
        console.log("\n🚀 --- ASSIGN LEADS DEBUG START ---");
        console.log("📥 Payload Received (req.body):", req.body);

        const { type, staffId, count, sort, autoAssignConfig, batchId, businessId } = req.body;
        
        if (type === 'bulk') {
            let whereClause = { assignedTo: null, status: 'NEW' };
            
            if (batchId && batchId !== '') {
                whereClause.batchId = parseInt(batchId);
            } else if (businessId && businessId !== '') {
                const bizBatches = await prisma.batch.findMany({ 
                    where: { businessId: parseInt(businessId) }, 
                    select: { id: true } 
                });
                
                const batchIdsArray = bizBatches.map(b => b.id);
                if (batchIdsArray.length > 0) {
                    whereClause.batchId = { in: batchIdsArray };
                } else {
                    whereClause.batchId = -1; 
                }
            } else {
                console.log("🚨 CRITICAL WARNING: No batchId or businessId provided!");
            }

            const leadsToAssign = await prisma.lead.findMany({ 
                where: whereClause, 
                orderBy: { id: sort === 'oldest' ? 'asc' : 'desc' }, 
                take: parseInt(count) 
            });
            
            if (leadsToAssign.length === 0) {
                return res.status(400).json({ error: "No unassigned leads found for this CRM." });
            }
            
            const ids = leadsToAssign.map(l => l.id);
            const updateResult = await prisma.lead.updateMany({ 
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
    } catch (error) { 
        res.status(500).json({ error: "Failed to process assignment" }); 
    }
};

exports.getAutoAssignQuotas = async (req, res) => {
    try {
        const quotas = await prisma.autoAssignQuota.findMany({ include: { staff: { select: { firstName: true, lastName: true } } } });
        res.status(200).json(quotas);
    } catch (error) { res.status(500).json({ error: "Failed to load quotas" }); }
};

exports.updateCallCampaign = async (req, res) => {
    try {
        const { leadId, method, status, feedback, coordinationRound } = req.body;
        const lead = await prisma.lead.findUnique({ where: { id: parseInt(leadId) } });
        if (!lead) return res.status(404).json({ error: "Lead not found" });

        let nextPhase = lead.phase;
        if (status === 'no_answer') {
            if (lead.phase === 1) nextPhase = 2;
            else if (lead.phase === 2) nextPhase = 3;
        }

        const updatedLead = await prisma.lead.update({
            where: { id: parseInt(leadId) },
            data: { 
                callMethod: method, 
                callStatus: status, 
                feedback: feedback, 
                phase: nextPhase,
                coordinationRound: coordinationRound ? parseInt(coordinationRound) : lead.coordinationRound
            }
        });
        res.status(200).json({ message: "Call status updated", lead: updatedLead });
    } catch (error) { res.status(500).json({ error: "Failed to update call campaign" }); }
};

const downloadMetaMedia = async (mediaId, metaApiKey) => {
    try {
        const urlResponse = await axios.get(`https://graph.facebook.com/v19.0/${mediaId}`, {
            headers: { 'Authorization': `Bearer ${metaApiKey}` }
        });
        const mediaUrl = urlResponse.data.url;
        const mimeType = urlResponse.data.mime_type;

        const fileResponse = await axios.get(mediaUrl, {
            headers: { 'Authorization': `Bearer ${metaApiKey}` },
            responseType: 'arraybuffer' 
        });

        let ext = 'bin';
        if (mimeType.includes('jpeg')) ext = 'jpeg';
        else if (mimeType.includes('png')) ext = 'png';
        else if (mimeType.includes('webp')) ext = 'webp';
        else if (mimeType.includes('mp4')) ext = 'mp4';
        else if (mimeType.includes('pdf')) ext = 'pdf';
        else if (mimeType.includes('ogg')) ext = 'ogg'; 
        else if (mimeType.includes('audio')) ext = 'mp3';

        const filename = `WM_${Date.now()}_${mediaId.substring(0,5)}.${ext}`;
        const docsDir = path.join(process.cwd(), 'storage/documents');
        if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });
        const finalPath = path.join(docsDir, filename);
        
        fs.writeFileSync(finalPath, Buffer.from(fileResponse.data));
        return { url: `/storage/documents/${filename}`, type: mimeType };
    } catch (error) { return null; }
};

// ==========================================
// 6. RECEIVE MESSAGE WEBHOOK (UNIFIED FIX WITH LOGS)
// ==========================================
exports.receiveMessage = async (req, res) => {
    // 🔥 මෙන්න මේ ලොග් එක තමයි අපි අලුතෙන් දැම්මේ, මේකෙන් හරියටම පෙනෙයි Webhook එකට එන දේවල්
    console.log("\n🚀 ================= WEBHOOK HIT! =================");
    console.log("📥 Payload:", JSON.stringify(req.body).substring(0, 300)); 
    
    try {
        let body = req.body;

        if (body.object === "whatsapp_business_account") {

            // 1. DELIVERY STATUS TRACKER 
            if (body.entry?.[0]?.changes?.[0]?.value?.statuses?.[0]) {
                const hasMessage = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
                if (!hasMessage) {
                    return res.status(200).send("EVENT_RECEIVED");
                }
            }

            // 2. INCOMING MESSAGES TRACKER
            if (body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {
                let msgData = body.entry[0].changes[0].value.messages[0];
                let contactData = body.entry?.[0]?.changes?.[0]?.value?.contacts?.[0] || {};
                let phone = msgData.from; 
                let name = contactData?.profile?.name || "Unknown";
                let metaMsgId = msgData.id; 

                const existingMessage = await prisma.chatMessage.findFirst({ where: { metaMessageId: metaMsgId } });
                if (existingMessage) return res.status(200).send("EVENT_RECEIVED");

                let metadata = body.entry[0].changes[0].value.metadata;
                let receivingWaNumId = metadata ? metadata.phone_number_id : null;

                const settings = await prisma.crmSettings.findFirst({ 
                    where: { waNumId: receivingWaNumId },
                    orderBy: { id: 'desc' } 
                });

                if (!settings) {
                    console.error(`🚨 CRITICAL: No CRM Settings found for incoming waNumId: ${receivingWaNumId}. Phone: ${phone}`);
                    return res.status(200).send("EVENT_RECEIVED");
                }
                
                let messageText = "Media Message";
                let interactiveId = null;
                let isFollowUpReply = false;
                let mediaUrl = null; 
                let mediaType = null;

                if (["image", "audio", "video", "document", "sticker"].includes(msgData.type)) {
                    const mediaObj = msgData[msgData.type];
                    messageText = mediaObj.caption || mediaObj.filename || `${msgData.type.toUpperCase()} Message`;
                    const mediaRes = await downloadMetaMedia(mediaObj.id, settings.metaApiKey);
                    if (mediaRes) { mediaUrl = mediaRes.url; mediaType = mediaRes.type; }
                } else if (msgData.type === "interactive" && msgData.interactive?.type === "button_reply") {
                    interactiveId = msgData.interactive.button_reply.id; 
                    messageText = msgData.interactive.button_reply.title; 
                    if (interactiveId === "FU_YES" || interactiveId === "FU_NO") isFollowUpReply = true;
                } else if (msgData.text) {
                    messageText = msgData.text.body;
                }

                let parsedBatchId = settings.batchId ? parseInt(settings.batchId) : null;
                let dbPhone = `${phone}_BIZ_${settings.businessId}`;
                if (parsedBatchId) dbPhone += `_BATCH_${parsedBatchId}`;

                const msgLower = messageText.toLowerCase().trim();
                const isRestartCommand = ['hi', 'hello', 'hey', 'menu', 'start'].includes(msgLower);

                // ========================================================
                // 🟢 AFTER SEMINAR LOGIC
                // ========================================================
                if (settings.campaignType === 'AFTER_SEMINAR') {
                    
                    const existingLeadCheck = await prisma.lead.findUnique({ where: { phone: dbPhone } });
                    const timeSinceLastMsg = existingLeadCheck && existingLeadCheck.updatedAt ? new Date() - new Date(existingLeadCheck.updatedAt) : 10000;
                    const isSpamming = timeSinceLastMsg < 2000; 

                    let resetData = {};
                    if (isRestartCommand) resetData = { autoReplyStep: 0, sequenceCompleted: false };

                    let detInquiryType = 'NEW_INQ';
                    let newInqTs = null;

                    if (!existingLeadCheck) {
                        if (msgLower === 'opening seminar') detInquiryType = 'OPEN_SEMINAR';
                        else if (msgLower === 'yes') detInquiryType = 'NORMAL';
                        else { detInquiryType = 'NEW_INQ'; newInqTs = new Date(); }
                    } else {
                        detInquiryType = existingLeadCheck.inquiryType || 'NEW_INQ';
                        if (msgLower === 'opening seminar') detInquiryType = 'OPEN_SEMINAR';
                    }

                    let createDataAfterSeminar = { 
                        name: name, phone: dbPhone, source: 'whatsapp', campaignType: 'AFTER_SEMINAR', 
                        lastMessage: messageText || 'Received Media', unreadCount: 1, status: 'NEW', 
                        phase: 1, callStatus: 'pending', paymentIntention: 'NOT_DECIDED', enrollmentStatus: 'NON_ENROLLED',
                        inquiryType: detInquiryType, newInqTimestamp: newInqTs, autoReplyStep: 0, sequenceCompleted: false
                    };
                    if (parsedBatchId) createDataAfterSeminar.batch = { connect: { id: parsedBatchId } };

                    let existingLead;
                    try {
                        existingLead = await prisma.lead.upsert({
                            where: { phone: dbPhone },
                            update: { 
                                name: name, lastMessage: messageText || 'Received Media', unreadCount: { increment: 1 }, 
                                status: existingLeadCheck?.assignedTo ? 'OPEN' : 'NEW', updatedAt: new Date(), 
                                inquiryType: detInquiryType, ...resetData
                            },
                            create: createDataAfterSeminar
                        });
                    } catch (upsertError) {
                        console.error("🚨 Prisma Upsert Error (AFTER_SEMINAR):", upsertError.message); 
                        if (upsertError.code === 'P2002') {
                            await new Promise(resolve => setTimeout(resolve, 50)); 
                            try {
                                existingLead = await prisma.lead.update({
                                    where: { phone: dbPhone },
                                    data: { name: name, lastMessage: messageText, unreadCount: { increment: 1 }, status: 'OPEN', updatedAt: new Date(), inquiryType: detInquiryType, ...resetData }
                                });
                            } catch (updateErr) {
                                console.error("🚨 Prisma Update Error (AFTER_SEMINAR):", updateErr.message); 
                            }
                        }
                    }

                    if(existingLead) {
                        await prisma.chatMessage.create({ 
                            data: { leadId: existingLead.id, message: messageText, mediaUrl: mediaUrl, mediaType: mediaType, direction: 'inbound', senderType: 'USER', senderName: name, metaMessageId: metaMsgId } 
                        });
                    }

                    // Auto Reply Sender
                    const botAllowed = (settings?.botMode === 'ON' || settings?.botMode === 'AUTO_REPLY_ONLY');
                    if (botAllowed && existingLead && !existingLead.sequenceCompleted && !isSpamming && !isFollowUpReply) {
                        const autoReplies = await prisma.autoReply.findMany({ 
                            where: { campaignType: 'AFTER_SEMINAR', businessId: settings.businessId }, 
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
                                    if (nextReply.attachmentType === 'Image') { metaPayload.type = "image"; metaPayload.image = { link: liveMediaUrl, caption: nextReply.message || "" }; } 
                                    else if (nextReply.attachmentType === 'Video') { metaPayload.type = "video"; metaPayload.video = { link: liveMediaUrl, caption: nextReply.message || "" }; } 
                                    else { metaPayload.type = "document"; metaPayload.document = { link: liveMediaUrl, caption: nextReply.message || "" }; }
                                } else { 
                                    metaPayload.type = "text"; metaPayload.text = { body: nextReply.message }; 
                                }

                                try {
                                    const axios = require('axios');
                                    await axios.post(`https://graph.facebook.com/v19.0/${settings.waNumId}/messages`, metaPayload, { headers: { 'Authorization': `Bearer ${settings.metaApiKey}` } });
                                    await prisma.chatMessage.create({ data: { leadId: existingLead.id, message: nextReply.message, mediaUrl: nextReply.attachment, mediaType: nextReply.attachmentType, direction: 'outbound', senderType: 'SYSTEM', senderName: 'AutoBot' } });
                                    const isLastStep = autoReplies[autoReplies.length - 1].id === nextReply.id;
                                    await prisma.lead.update({ where: { id: existingLead.id }, data: { autoReplyStep: nextReply.stepOrder, sequenceCompleted: isLastStep } });
                                } catch (sendErr) { console.error("Auto Reply Error:", sendErr.message); }
                            }
                        }
                    }
                    return res.status(200).send("EVENT_RECEIVED");
                }

                // ========================================================
                // 🔵 FREE SEMINAR LOGIC
                // ========================================================
                else if (settings.campaignType === 'FREE_SEMINAR') {
                    
                    let existingLead = await prisma.lead.findUnique({ where: { phone: dbPhone } });
                    const timeSinceLastMsg = existingLead && existingLead.updatedAt ? new Date() - new Date(existingLead.updatedAt) : 10000;
                    const isSpamming = timeSinceLastMsg < 2000; 
                    
                    let resetData = {};
                    if (isRestartCommand) resetData = { autoReplyStep: 0, sequenceCompleted: false };

                    let createDataFreeSeminar = { 
                        name: name, phone: dbPhone, source: 'whatsapp', campaignType: 'FREE_SEMINAR', 
                        lastMessage: messageText || 'Received Media', unreadCount: 1, status: 'NEW', 
                        phase: 1, callStatus: 'pending', autoReplyStep: 0, sequenceCompleted: false 
                    };
                    if (parsedBatchId) createDataFreeSeminar.batch = { connect: { id: parsedBatchId } };

                    try {
                        existingLead = await prisma.lead.upsert({
                            where: { phone: dbPhone },
                            update: { name: name, lastMessage: messageText || 'Received Media', unreadCount: { increment: 1 }, status: existingLead?.assignedTo ? 'OPEN' : 'NEW', updatedAt: new Date(), ...resetData },
                            create: createDataFreeSeminar
                        });
                    } catch(e) {
                        console.error("🚨 Prisma Upsert Error (FREE_SEMINAR):", e.message); 
                        try {
                            existingLead = await prisma.lead.update({ where: { phone: dbPhone }, data: { name: name, lastMessage: messageText, unreadCount: { increment: 1 }, status: 'OPEN', updatedAt: new Date(), ...resetData } });
                        } catch (updateErr) {
                            console.error("🚨 Prisma Update Error (FREE_SEMINAR):", updateErr.message); 
                        }
                    }

                    if(existingLead) {
                        await prisma.chatMessage.create({ 
                            data: { leadId: existingLead.id, message: messageText, mediaUrl: mediaUrl, mediaType: mediaType, direction: 'inbound', senderType: 'USER', senderName: name, metaMessageId: metaMsgId } 
                        });
                    }

                    // Auto Reply Sender
                    const botAllowed = (settings?.botMode === 'ON' || settings?.botMode === 'AUTO_REPLY_ONLY');
                    if (botAllowed && existingLead && !existingLead.sequenceCompleted && !isSpamming && !isFollowUpReply) {
                        const autoReplies = await prisma.autoReply.findMany({ where: { campaignType: 'FREE_SEMINAR', businessId: settings.businessId }, orderBy: { stepOrder: 'asc' } });
                        
                        if (autoReplies.length > 0) {
                            const currentStep = existingLead.autoReplyStep || 0;
                            const nextReply = autoReplies.find(r => r.stepOrder > currentStep);

                            if (nextReply) {
                                let formattedPhone = phone.startsWith('0') ? '94' + phone.substring(1) : phone;
                                let metaPayload = { messaging_product: "whatsapp", recipient_type: "individual", to: formattedPhone };

                                if (nextReply.attachment) {
                                    const attachmentPath = nextReply.attachment.startsWith('/') ? nextReply.attachment : `/${nextReply.attachment}`;
                                    const liveMediaUrl = `https://imacampus.online${attachmentPath}`; 
                                    if (nextReply.attachmentType === 'Image') { metaPayload.type = "image"; metaPayload.image = { link: liveMediaUrl, caption: nextReply.message || "" }; } 
                                    else if (nextReply.attachmentType === 'Video') { metaPayload.type = "video"; metaPayload.video = { link: liveMediaUrl, caption: nextReply.message || "" }; } 
                                    else { metaPayload.type = "document"; metaPayload.document = { link: liveMediaUrl, caption: nextReply.message || "" }; }
                                } else { 
                                    metaPayload.type = "text"; metaPayload.text = { body: nextReply.message }; 
                                }

                                try {
                                    const axios = require('axios');
                                    await axios.post(`https://graph.facebook.com/v19.0/${settings.waNumId}/messages`, metaPayload, { headers: { 'Authorization': `Bearer ${settings.metaApiKey}` } });
                                    await prisma.chatMessage.create({ data: { leadId: existingLead.id, message: nextReply.message, mediaUrl: nextReply.attachment, mediaType: nextReply.attachmentType, direction: 'outbound', senderType: 'SYSTEM', senderName: 'AutoBot' } });
                                    const isLastStep = autoReplies[autoReplies.length - 1].id === nextReply.id;
                                    await prisma.lead.update({ where: { id: existingLead.id }, data: { autoReplyStep: nextReply.stepOrder, sequenceCompleted: isLastStep } });
                                } catch (sendErr) { console.error("Auto Reply Error:", sendErr.message); }
                            }
                        }
                    }
                    return res.status(200).send("EVENT_RECEIVED");
                }
                else {
                    console.warn(`🚨 WARNING: Unhandled Campaign Type -> ${settings.campaignType}. Lead was NOT saved. Phone: ${phone}`);
                    return res.status(200).send("EVENT_RECEIVED");
                }
            }
        } 
        
        res.status(200).send("EVENT_RECEIVED");
    } catch (error) { 
        console.error("🚨 Webhook Error CRITICAL:", error);
        res.status(500).send("ERROR"); 
    }
};

exports.getMessages = async (req, res) => {
    try {
        const { leadId } = req.params;
        await prisma.lead.update({ where: { id: parseInt(leadId) }, data: { unreadCount: 0 } });
        const messages = await prisma.chatMessage.findMany({ where: { leadId: parseInt(leadId) }, orderBy: { createdAt: 'asc' } });
        res.status(200).json(messages);
    } catch (error) { res.status(500).json({ error: "Failed to fetch messages" }); }
};

// ==========================================
// DEBUG VERSION: SEND MESSAGE
// ==========================================
exports.sendMessage = async (req, res) => {
    console.log("\n🚀 ================= SEND MESSAGE TRIGGERED =================");
    try {
        const { leadId, message, senderName, replyToMetaId, localUIMessage } = req.body; 
        console.log("📥 [DEBUG 1] Request Body:", { leadId, message, senderName });

        const lead = await prisma.lead.findUnique({ where: { id: parseInt(leadId) } });
        if (!lead) {
            console.log("❌ [DEBUG 2] Error: Lead not found in DB");
            return res.status(404).json({ error: "Lead not found" });
        }
        console.log("✅ [DEBUG 3] Lead found:", lead.phone);
        
        let formattedPhone = lead.phone.split('_')[0].replace(/[^0-9]/g, ''); 
        if (formattedPhone.startsWith('0')) formattedPhone = '94' + formattedPhone.substring(1);
        console.log(`📱 [DEBUG 4] Formatted Phone Number: ${formattedPhone}`);

        let mediaUrl = null; let mediaType = null;
        if (req.file) { 
            mediaUrl = `/storage/documents/${req.file.filename}`; 
            mediaType = req.file.mimetype; 
            console.log("📎 [DEBUG 5] Attached Media:", mediaUrl);
        }

        console.log("💾 [DEBUG 6] Saving message to Database...");
        const newMsg = await prisma.chatMessage.create({
            data: {
                leadId: parseInt(leadId), message: localUIMessage || message || '', mediaUrl, mediaType,
                direction: 'outbound', senderType: 'STAFF', senderId: req.user?.id || null, senderName: senderName || req.user?.firstName || 'Staff'
            }
        });
        console.log("✅ [DEBUG 7] Message saved to DB with ID:", newMsg.id);

        await prisma.lead.update({
            where: { id: parseInt(leadId) },
            data: { lastMessage: message ? message.substring(0,30) : 'Sent Media', status: 'OPEN', updatedAt: new Date() }
        });

        try {
            console.log("⚙️ [DEBUG 8] Fetching CRM Settings...");
            let settings = null;
            const bizMatch = lead.phone.match(/_BIZ_(\d+)/);
            const parsedBizId = bizMatch ? parseInt(bizMatch[1]) : null;
            console.log(`🏢 [DEBUG 9] Extracted Business ID from Phone: ${parsedBizId}`);

            if (lead.batchId) {
                const batchRecord = await prisma.batch.findUnique({ where: { id: lead.batchId } });
                if (batchRecord) {
                    settings = await prisma.crmSettings.findFirst({ 
                        where: { businessId: batchRecord.businessId, campaignType: lead.campaignType || 'AFTER_SEMINAR' } 
                    });
                }
            } 
            
            if (!settings && parsedBizId) {
                settings = await prisma.crmSettings.findFirst({ 
                    where: { businessId: parsedBizId, campaignType: lead.campaignType || 'AFTER_SEMINAR' } 
                });
            }

            if (!settings && parsedBizId) {
                settings = await prisma.crmSettings.findFirst({ where: { businessId: parsedBizId } });
            }

            if (!settings) settings = await prisma.crmSettings.findFirst(); 

            if (settings && settings.metaApiKey && settings.waNumId) {
                console.log(`✅ [DEBUG 10] Using Meta Settings -> WA Num ID: ${settings.waNumId}, Campaign: ${settings.campaignType}`);
                
                let metaPayload = { messaging_product: "whatsapp", recipient_type: "individual", to: formattedPhone };
                if (replyToMetaId && replyToMetaId !== 'null' && replyToMetaId !== 'undefined') metaPayload.context = { message_id: replyToMetaId };

                if (message && !mediaUrl) {
                    metaPayload.type = "text"; metaPayload.text = { preview_url: false, body: message };
                } else if (mediaUrl) {
                    const liveMediaUrl = `https://imacampus.online${mediaUrl}`; 
                    const isAudio = mediaType.includes('audio') || mediaUrl.toLowerCase().endsWith('.mp3') || mediaUrl.toLowerCase().endsWith('.ogg') || mediaUrl.toLowerCase().endsWith('.wav');

                    if (mediaType.includes('image') && !isAudio) { 
                        metaPayload.type = "image"; metaPayload.image = { link: liveMediaUrl, caption: message || "" };
                    } else if (isAudio) { 
                        metaPayload.type = "audio"; metaPayload.audio = { link: liveMediaUrl };
                    } else if (mediaType.includes('video')) { 
                        metaPayload.type = "video"; metaPayload.video = { link: liveMediaUrl, caption: message || "" };
                    } else { 
                        metaPayload.type = "document"; metaPayload.document = { link: liveMediaUrl, caption: message || "", filename: req.file ? req.file.originalname : "document.pdf" };
                    }
                }

                console.log("📦 [DEBUG 11] Meta Payload ready, sending to Facebook API...");

                const axios = require('axios');
                const metaRes = await axios.post(`https://graph.facebook.com/v19.0/${settings.waNumId}/messages`, metaPayload, { 
                    headers: { 'Authorization': `Bearer ${settings.metaApiKey}`, 'Content-Type': 'application/json' } 
                });
                
                console.log(`🚀 [DEBUG 12] Meta API Success! Message ID: ${metaRes.data?.messages?.[0]?.id}`);
                
                if (metaRes.data?.messages?.[0]?.id) {
                    await prisma.chatMessage.update({ where: { id: newMsg.id }, data: { metaMessageId: metaRes.data.messages[0].id } });
                }
            } else {
                console.error("🚨 [DEBUG 13] Error: No Meta API Key or waNumId found in Database for this setting!", settings);
            }
        } catch (metaError) { 
            console.error("🚨 [DEBUG 14] META API ERROR DETAILS:", metaError.response?.data || metaError.message);
        }
        res.status(201).json(newMsg);
    } catch (error) { 
        console.error("🚨 [DEBUG 15] Server Catch Error:", error);
        res.status(500).json({ error: "Failed to send message" }); 
    }
};


exports.sendReaction = async (req, res) => {
    try {
        const { leadId, metaMessageId, emoji } = req.body;
        if (!metaMessageId) return res.status(400).json({ error: "No Meta Message ID provided" });

        const lead = await prisma.lead.findUnique({ where: { id: parseInt(leadId) } });
        let formattedPhone = lead.phone.split('_')[0].replace(/[^0-9]/g, ''); 
        if (formattedPhone.startsWith('0')) formattedPhone = '94' + formattedPhone.substring(1);

        let settings;
        if (lead.batchId) {
            const batchRecord = await prisma.batch.findUnique({ where: { id: lead.batchId } });
            if (batchRecord) settings = await prisma.crmSettings.findFirst({ where: { businessId: batchRecord.businessId, campaignType: lead.campaignType || 'FREE_SEMINAR' } });
        } else {
            settings = await prisma.crmSettings.findFirst({ where: { campaignType: lead.campaignType || 'FREE_SEMINAR' } });
        }

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
    } catch (error) { return null; }
};

exports.getMetaTemplates = async (req, res) => {
    console.log("\n🔍 === DEBUG: GET META TEMPLATES START ===");
    try {
        const { businessId, batchId } = req.query;
        console.log("📥 1. Incoming Request Query:", req.query);

        let whereClause = { campaignType: 'FREE_SEMINAR' };
        
        if (batchId && batchId !== '' && batchId !== 'undefined' && batchId !== 'null') {
            whereClause.batchId = String(batchId); 
        } else if (businessId && businessId !== '' && businessId !== 'undefined' && businessId !== 'null') {
            whereClause.businessId = parseInt(businessId);
        }

        const settings = await prisma.crmSettings.findFirst({ 
            where: whereClause,
            orderBy: { id: 'desc' }
        });

        if (!settings) return res.status(400).json({ error: "No CRM Settings found in Database." });

        console.log(`⚙️ 2. Found DB Settings -> ID: ${settings.id}, waId: ${settings.waId}, waNumId: ${settings.waNumId}`);

        if (!settings.metaApiKey || !settings.waId) {
            return res.status(400).json({ error: "WABA ID or API Key is missing in CRM Settings." });
        }

        // ========================================================
        // 🔥 DEBUG 1: waId එක යටතේ තියෙන Phone Numbers Check කිරීම
        // ========================================================
        try {
            console.log(`\n🕵️‍♂️ DEBUG: Checking phone numbers under waId: ${settings.waId}...`);
            const phoneCheck = await axios.get(`https://graph.facebook.com/v19.0/${settings.waId}/phone_numbers`, { 
                headers: { Authorization: `Bearer ${settings.metaApiKey}` } 
            });
            
            console.log("📱 3. Phone Numbers found under this WABA ID:");
            let isPhoneMatched = false;
            phoneCheck.data.data.forEach(p => {
                console.log(`   - Name: ${p.verified_name || 'N/A'}, Phone: ${p.display_phone_number}, ID: ${p.id}`);
                if (p.id === settings.waNumId) isPhoneMatched = true;
            });
            
            if (!isPhoneMatched) {
                console.log(`\n🚨 CRITICAL WARNING 🚨`);
                console.log(`ඔයාගේ DB එකේ තියෙන waNumId (${settings.waNumId}) මේ waId (${settings.waId}) එක ඇතුලේ නෑ!`);
                console.log(`ඒ කියන්නේ waId එක වැරදියි! Templates පෙන්නන්නේ නැත්තේ මේකයි.\n`);
            } else {
                console.log(`✅ SUCCESS: waId එකයි waNumId එකයි හරියට Match වෙනවා!\n`);
            }
        } catch(e) {
            console.log("🚨 Failed to verify waId. Error:", e.response?.data?.error?.message || e.message);
        }
        // ========================================================

        // Fetching Templates
        const url = `https://graph.facebook.com/v19.0/${settings.waId}/message_templates?limit=100`;
        console.log("🌐 4. Calling Meta API URL:", url);

        const response = await axios.get(url, { 
            headers: { Authorization: `Bearer ${settings.metaApiKey}` } 
        });
        
        console.log(`✅ 5. Meta API Success! Found ${response.data.data?.length || 0} templates.`);
        console.log("🔍 === DEBUG: GET META TEMPLATES END ===\n");
        
        res.status(200).json(response.data.data);

    } catch (error) { 
        console.error("🚨 META API ERROR DETAILS:", error.response?.data || error.message);
        res.status(500).json({ 
            error: "Failed to fetch templates", 
            details: error.response?.data?.error?.message || error.message 
        }); 
    }
};

exports.createMetaTemplate = async (req, res) => {
    try {
        const { name, category, language, bodyText, headerType, headerText, footerText, buttons, businessId } = req.body;
        
        // 🔥 FIX: Find the correct Meta config using businessId 🔥
        let whereClause = { campaignType: 'FREE_SEMINAR' };
        if (businessId && businessId !== 'undefined' && businessId !== 'null') {
            whereClause.businessId = parseInt(businessId);
        }

        const settings = await prisma.crmSettings.findFirst({ 
            where: whereClause,
            orderBy: { id: 'desc' }
        });

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
        console.error("Template Create Error:", err.response?.data || err.message);
        res.status(500).json({ error: err.response?.data?.error?.message || "Failed to create template" }); 
    }
};

exports.deleteMetaTemplate = async (req, res) => {
    try {
        const { businessId } = req.query;
        
        let whereClause = { campaignType: 'FREE_SEMINAR' };
        if (businessId && businessId !== 'undefined') {
            whereClause.businessId = parseInt(businessId);
        }

        const settings = await prisma.crmSettings.findFirst({ 
            where: whereClause,
            orderBy: { id: 'desc' }
        });

        if (!settings?.metaApiKey || !settings?.waId) return res.status(400).json({ error: "WABA ID or API Key missing in DB." });

        await axios.delete(`https://graph.facebook.com/v19.0/${settings.waId}/message_templates?name=${req.params.name}`, {
            headers: { Authorization: `Bearer ${settings.metaApiKey}` }
        });
        res.status(200).json({ message: "Template deleted!" });
    } catch (error) { 
        console.error("Delete Error:", error.response?.data || error.message);
        res.status(500).json({ error: "Delete failed" }); 
    }
};

// ==========================================
// 9. ADVANCED STATS & BROADCAST (🔥 COMPLETELY FIXED 🔥)
// ==========================================
exports.getCampaignStats = async (req, res) => {
    try {
        const { businessId, batchId, startDate, endDate, phase } = req.query;

        let bizFilter = businessId ? parseInt(businessId) : undefined;
        let batchFilter = batchId ? parseInt(batchId) : undefined;

        if (!bizFilter && !batchFilter) {
            return res.status(200).json({ summary: {}, report: [], msgReport: [] });
        }

        const start = startDate ? new Date(startDate) : new Date(new Date().setHours(0,0,0,0));
        const end = endDate ? new Date(endDate) : new Date(new Date().setHours(23,59,59,999));

        const settings = await prisma.crmSettings.findFirst({
            where: batchFilter ? { batchId: String(batchFilter) } : { businessId: bizFilter, campaignType: 'FREE_SEMINAR' }
        });

        let totalSent = 0;
        let totalReceived = 0;

        if (settings) {
            // A. Unique Received
            const receivedLogs = await prisma.webhookLog.groupBy({
                by: ['phone'],
                where: {
                    waNumId: settings.waNumId,
                    createdAt: { gte: start, lte: end }
                }
            });
            totalReceived = receivedLogs.length;

            // B. Unique Sent (Strict Batch mapping)
            let sentWhere = {
                direction: 'outbound',
                createdAt: { gte: start, lte: end },
                lead: { campaignType: 'FREE_SEMINAR' }
            };

            if (batchFilter) {
                sentWhere.lead.batchId = batchFilter;
            } else if (bizFilter) {
                const bizBatches = await prisma.batch.findMany({ where: { businessId: bizFilter }, select: { id: true } });
                sentWhere.lead.batchId = { in: bizBatches.map(b => b.id) };
            }

            const sentMessages = await prisma.chatMessage.groupBy({
                by: ['leadId'],
                where: sentWhere
            });
            totalSent = sentMessages.length;
        }

        // 2. Call Progress & General Stats (Strict Batch Mapping)
        let leadWhere = { campaignType: 'FREE_SEMINAR' };
        
        if (batchFilter) {
            leadWhere.batchId = batchFilter;
        } else if (bizFilter) {
            const bizBatches = await prisma.batch.findMany({ where: { businessId: bizFilter }, select: { id: true } });
            leadWhere.batchId = { in: bizBatches.map(b => b.id) };
        }

        // 🔥 Frontend eken ena Phase filter eka add kara
        if (phase && phase !== 'All') {
            leadWhere.phase = parseInt(phase);
        }

        const leads = await prisma.lead.findMany({ 
            where: leadWhere,
            include: { assignedUser: { select: { firstName: true } } }
        });

        const unassignedLeads = leads.filter(l => !l.assignedTo).length;
        const coveredLeads = leads.filter(l => l.callStatus && l.callStatus !== 'pending').length;
        const rate = leads.length > 0 ? Math.round((coveredLeads / leads.length) * 100) : 0;

        const agentMap = {};
        leads.forEach(l => {
            if (!l.assignedTo) return;
            const name = l.assignedUser?.firstName || "Staff";
            if (!agentMap[name]) agentMap[name] = { agentName: name, assigned: 0, answered: 0, noAnswer: 0, reject: 0, pending: 0 };
            
            agentMap[name].assigned++;
            if (l.callStatus === 'answered') agentMap[name].answered++;
            else if (l.callStatus === 'no_answer') agentMap[name].noAnswer++;
            else if (l.callStatus === 'reject') agentMap[name].reject++;
            else agentMap[name].pending++;
        });

        // 3. WhatsApp Message Report
        let msgReportWhere = {
            createdAt: { gte: start, lte: end },
            lead: leadWhere
        };

        const staffMsgStats = await prisma.chatMessage.findMany({
            where: msgReportWhere,
            include: { lead: true }
        });

        const msgReportMap = {};
        staffMsgStats.forEach(m => {
            const agentName = m.senderType === 'STAFF' ? m.senderName : (m.lead?.assignedTo ? "Staff" : "System");
            if (!msgReportMap[agentName]) msgReportMap[agentName] = { agentName, uniqueSent: new Set(), uniqueReceived: new Set() };
            
            if (m.direction === 'outbound') msgReportMap[agentName].uniqueSent.add(m.leadId);
            else msgReportMap[agentName].uniqueReceived.add(m.leadId);
        });

        const msgReport = Object.values(msgReportMap).map(item => ({
            agentName: item.agentName,
            uniqueSent: item.uniqueSent.size,
            uniqueReceived: item.uniqueReceived.size
        }));

        res.status(200).json({
            summary: {
                totalLeads: leads.length,
                unassignedLeads,
                rate,
                totalSent,     
                totalReceived  
            },
            report: Object.values(agentMap),
            msgReport: msgReport
        });

    } catch (error) {
        console.error("Campaign Stats Error:", error);
        res.status(500).json({ error: "Failed to load stats" });
    }
};

// ==========================================
// 9. ADVANCED STATS & BROADCAST (🔥 COMPLETELY FIXED 🔥)
// ==========================================

exports.sendBroadcast = async (req, res) => {
    try {
        // 🔥 FIX: req.body එකෙන් templateLanguage එක ගන්නවා
        const { leadIds, type, message, templateName, templateLanguage } = req.body;
        const parsedLeadIds = typeof leadIds === 'string' ? JSON.parse(leadIds) : leadIds;
        const leads = await prisma.lead.findMany({ where: { id: { in: parsedLeadIds } } });
        
        let defaultSettings = await prisma.crmSettings.findFirst({ where: { campaignType: 'FREE_SEMINAR' } });

        let mediaUrl = null; let mediaType = null;
        if (req.file) { mediaUrl = `/storage/documents/${req.file.filename}`; mediaType = req.file.mimetype; }

        let results = { success: 0, failed: 0, reasons: [] };
        let settingsCache = {}; 

        for (const lead of leads) {
            let formattedPhone = lead.phone.split('_')[0].replace(/[^0-9]/g, ''); 
            if (formattedPhone.startsWith('0')) formattedPhone = '94' + formattedPhone.substring(1);
            
            // ==========================================
            // 🔥 මේ ටික තමයි අත්වැරදීමකින් delete වෙලා තිබ්බේ
            // ==========================================
            let leadSettings = defaultSettings;
            if (lead.batchId) {
                if (settingsCache[lead.batchId]) {
                    leadSettings = settingsCache[lead.batchId];
                } else {
                    const batchRecord = await prisma.batch.findUnique({ where: { id: lead.batchId } });
                    if (batchRecord) {
                        leadSettings = await prisma.crmSettings.findFirst({ 
                            where: { businessId: batchRecord.businessId, campaignType: lead.campaignType || 'FREE_SEMINAR' } 
                        }) || defaultSettings;
                    }
                    settingsCache[lead.batchId] = leadSettings;
                }
            } else if (lead.campaignType) {
                leadSettings = await prisma.crmSettings.findFirst({ where: { campaignType: lead.campaignType } }) || defaultSettings;
            }
            // ==========================================

            if (!leadSettings?.metaApiKey) {
                results.failed += 1; results.reasons.push({ phone: formattedPhone, error: "Meta Config Missing for this lead" });
                continue;
            }

            let metaPayload = { messaging_product: "whatsapp", recipient_type: "individual", to: formattedPhone };

            if (type === '24H') {
                if (mediaUrl) {
                    const liveMediaUrl = `https://imacampus.online${mediaUrl}`;
                    if (mediaType.includes('image')) { metaPayload.type = "image"; metaPayload.image = { link: liveMediaUrl, caption: message || "" }; }
                    else if (mediaType.includes('pdf') || mediaType.includes('document')) { metaPayload.type = "document"; metaPayload.document = { link: liveMediaUrl, caption: message || "", filename: req.file.originalname || "document.pdf" }; }
                    else if (mediaType.includes('video')) { metaPayload.type = "video"; metaPayload.video = { link: liveMediaUrl, caption: message || "" }; }
                    else if (mediaType.includes('audio')) { metaPayload.type = "audio"; metaPayload.audio = { link: liveMediaUrl }; }
                } else {
                    const hasUrl = message && (message.includes('http://') || message.includes('https://'));
                    metaPayload.type = "text"; 
                    metaPayload.text = { preview_url: Boolean(hasUrl), body: message || "..." };
                }
            } else {
                metaPayload.type = "template"; 
                
                // 🔥 FIX: Template එකේ Language එක dynamic විදියට මෙතනින් යනවා
                metaPayload.template = { 
                    name: templateName, 
                    language: { code: templateLanguage || "en_US" } 
                };

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
                const axios = require('axios');
                // Meta API එකට යවනවා
                const metaRes = await axios.post(`https://graph.facebook.com/v19.0/${leadSettings.waNumId}/messages`, metaPayload, { 
                    headers: { 'Authorization': `Bearer ${leadSettings.metaApiKey}`, 'Content-Type': 'application/json' } 
                });
                
                // Database එකට Save කරනවා
                await prisma.chatMessage.create({
                    data: {
                        leadId: lead.id,
                        message: type === '24H' ? (message || 'Media Broadcast') : `Template: ${templateName}`,
                        mediaUrl: mediaUrl,
                        mediaType: mediaType,
                        direction: 'outbound',
                        senderType: 'SYSTEM',
                        senderName: 'BroadcastBot',
                        metaMessageId: metaRes.data?.messages?.[0]?.id || null
                    }
                });

                results.success += 1;
            } catch (err) {
                results.failed += 1; 
                const metaErrorMsg = err.response?.data?.error?.message || err.message;
                results.reasons.push({ phone: formattedPhone, error: metaErrorMsg });
            }
        }
        res.status(200).json(results);
    } catch (error) { 
        console.error("Broadcast Execution Error:", error);
        res.status(500).json({ error: "Broadcast failed", details: error.message }); 
    }
};

exports.getAllCampaignLeads = async (req, res) => {
    try {
        const { businessId, batchId } = req.query;
        let whereClause = { campaignType: 'FREE_SEMINAR' };
        if (batchId && batchId !== '') {
            whereClause.batchId = parseInt(batchId);
        } else if (businessId && businessId !== '') {
            const bizBatches = await prisma.batch.findMany({ where: { businessId: parseInt(businessId) }});
            whereClause.batchId = { in: bizBatches.map(b => b.id) };
        }
        
        const leads = await prisma.lead.findMany({ where: whereClause, orderBy: { updatedAt: 'desc' } }); 
        const cleanedLeads = leads.map(l => ({
            ...l,
            phone: l.phone ? l.phone.split('_')[0] : ''
        }));
        res.status(200).json(cleanedLeads);
    } catch (error) { res.status(500).json({ error: "Failed to fetch leads" }); }
};

// ==========================================
// 10. STUDENT VERIFICATIONS & DETAILS
// ==========================================
exports.getLeadDetails = async (req, res) => {
    try {
        const { phone } = req.params;
        let cleanPhone = phone.split('_')[0].replace(/[^0-9]/g, '').trim();
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

// ==========================================
// 11. TOGGLE FOLLOW UP CONFIG LOGIC
// ==========================================
const FOLLOWUP_CONFIG_PATH = path.join(__dirname, 'followup-config.json');

const getFollowUpStatus = () => {
    try {
        if (fs.existsSync(FOLLOWUP_CONFIG_PATH)) {
            return JSON.parse(fs.readFileSync(FOLLOWUP_CONFIG_PATH, 'utf-8')).isOn;
        }
    } catch(e){}
    return false; 
};

exports.getFollowUpStatusAPI = (req, res) => {
    res.status(200).json({ isOn: getFollowUpStatus() });
};

exports.toggleFollowUpAPI = (req, res) => {
    try {
        const { isOn } = req.body;
        fs.writeFileSync(FOLLOWUP_CONFIG_PATH, JSON.stringify({ isOn }));
        res.status(200).json({ message: "Updated", isOn });
    } catch (error) { res.status(500).json({ error: "Failed to update toggle" }); }
};

// ==========================================
// 12. AUTO FOLLOW-UP ENGINE
// ==========================================
exports.runAutoFollowUpEngine = async () => {
    try {
        if (!getFollowUpStatus()) return;

        const settingsList = await prisma.crmSettings.findMany({ where: { campaignType: 'FREE_SEMINAR' } });
        
        for (const settings of settingsList) {
            if (!settings.metaApiKey) continue;

            const twentyHoursAgo = new Date(Date.now() - 20 * 60 * 60 * 1000);
            const twentyThreeHoursAgo = new Date(Date.now() - 23 * 60 * 60 * 1000);

            const unreadLeads = await prisma.lead.findMany({
                where: { 
                    batchId: settings.batchId ? parseInt(settings.batchId) : null,
                    unreadCount: { gt: 0 }, 
                    updatedAt: { lte: twentyHoursAgo, gte: twentyThreeHoursAgo } 
                }
            });

            for (const lead of unreadLeads) {
                let formattedPhone = lead.phone.split('_')[0].replace(/[^0-9]/g, ''); 
                if (formattedPhone.startsWith('0')) formattedPhone = '94' + formattedPhone.substring(1);

                let metaPayload = {
                    messaging_product: "whatsapp", recipient_type: "individual", to: formattedPhone, type: "interactive",
                    interactive: { type: "button", body: { text: "ආයුබෝවන් පුතේ, ඔයාගේ ගැටලුවට විසඳුමක් හම්බුනාද?" }, action: { buttons: [ { type: "reply", reply: { id: "FU_YES", title: "ඔව්" } }, { type: "reply", reply: { id: "FU_NO", title: "නැත" } } ] } }
                };

                try {
                    await axios.post(`https://graph.facebook.com/v19.0/${settings.waNumId}/messages`, metaPayload, { headers: { 'Authorization': `Bearer ${settings.metaApiKey}` } });
                    await prisma.chatMessage.create({ data: { leadId: lead.id, message: "FollowUp Sent", direction: 'outbound', senderType: 'SYSTEM', senderName: 'FollowUpBot' } });
                } catch (err) {}
            }
        }
    } catch (error) { }
};

exports.testFollowUpMessage = async (req, res) => {
    try {
        const { testPhone } = req.body; 
        if (!testPhone) return res.status(400).json({ error: "Please provide a test phone number." });

        const settings = await prisma.crmSettings.findFirst({ where: { campaignType: 'FREE_SEMINAR' } });
        if (!settings || !settings.metaApiKey) return res.status(400).json({ error: "Meta config missing" });

        let formattedPhone = testPhone.replace(/[^0-9]/g, ''); 
        if (formattedPhone.startsWith('0')) formattedPhone = '94' + formattedPhone.substring(1);

        let metaPayload = {
            messaging_product: "whatsapp", 
            recipient_type: "individual", 
            to: formattedPhone, 
            type: "interactive",
            interactive: { 
                type: "button", 
                body: { text: "ආයුබෝවන් පුතේ, ඔයාගේ ගැටලුවට විසඳුමක් හම්බුනාද? (TEST)" }, 
                action: { 
                    buttons: [ 
                        { type: "reply", reply: { id: "FU_YES", title: "ඔව්" } }, 
                        { type: "reply", reply: { id: "FU_NO", title: "නැත" } } 
                    ] 
                } 
            }
        };

        const response = await axios.post(`https://graph.facebook.com/v19.0/${settings.waNumId}/messages`, metaPayload, { 
            headers: { 'Authorization': `Bearer ${settings.metaApiKey}` } 
        });

        res.status(200).json({ success: true, message: "Test message sent", data: response.data });
    } catch (error) { 
        res.status(500).json({ error: "Test failed", details: error.response?.data || error.message }); 
    }
};

setInterval(() => { exports.runAutoFollowUpEngine(); }, 60 * 60 * 1000);


// ==========================================
// 🔥 GET UNIQUE NUMBERS COUNT (META vs DB)
// ==========================================
exports.getUniqueNumbersCount = async (req, res) => {
    try {
        const { businessId, waId, days } = req.query;

        if (!businessId && !waId) {
            return res.status(400).json({ error: "Please provide either businessId or waId" });
        }

        let whereClause = {};
        if (waId) {
            whereClause.waId = waId;
        } else if (businessId) {
            whereClause.businessId = parseInt(businessId);
        }

        const settings = await prisma.crmSettings.findFirst({
            where: whereClause
        });

        if (!settings) {
            return res.status(404).json({ error: "CRM Settings not found for the given ID." });
        }

        const daysToLookBack = parseInt(days) || 30;
        const startDateObj = new Date();
        startDateObj.setDate(startDateObj.getDate() - daysToLookBack);

        const webhookLogs = await prisma.webhookLog.findMany({
            where: { createdAt: { gte: startDateObj } },
            select: { phone: true }
        });
        
        const uniqueMetaNumbers = [...new Set(webhookLogs.map(log => log.phone))];
        const totalNumbersFromMeta = uniqueMetaNumbers.length;

        // Strict batch filter applied here too
        let dbSearchWhere = { createdAt: { gte: startDateObj } };
        if (settings.batchId) {
            dbSearchWhere.batchId = parseInt(settings.batchId);
        } else {
            const bizBatches = await prisma.batch.findMany({ where: { businessId: settings.businessId }, select: { id: true } });
            dbSearchWhere.batchId = { in: bizBatches.map(b => b.id) };
        }

        const savedLeadRecords = await prisma.lead.findMany({
            where: dbSearchWhere,
            select: { phone: true }
        });
        
        const savedPhoneNumbers = savedLeadRecords.map(l => l.phone.split('_')[0]);
        const uniqueSavedNumbers = [...new Set(savedPhoneNumbers)];
        const totalNumbersInDB = uniqueSavedNumbers.length;

        const missedNumbers = uniqueMetaNumbers.filter(phone => !uniqueSavedNumbers.includes(phone));

        res.status(200).json({
            success: true,
            accountInfo: {
                businessId: settings.businessId,
                wabaId: settings.waId
            },
            timeRange: `Last ${daysToLookBack} days`,
            summary: {
                totalUniqueNumbersFromMeta: totalNumbersFromMeta, 
                totalUniqueNumbersInDB: totalNumbersInDB,         
                missedNumbersCount: missedNumbers.length          
            },
            missedNumbersList: missedNumbers
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to get unique numbers count" });
    }
};