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

        // 🔥 FIX: Restored Phone String Mapping to reliably catch all Business leads 🔥
        if (batchId && batchId !== '') {
            whereClause.batchId = parseInt(batchId);
        } 
        else if (businessId && businessId !== '') {
            whereClause.phone = { contains: `_BIZ_${businessId}` };
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
            else if (!isManager) whereClause.assignedTo = parseInt(userId); // 🔥 FIX: Coordinators see only their leads in ALL tab
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

        // 🔥 FIX: COUNTS LOGIC 🔥
        let countWhere = { campaignType: campaignType || 'FREE_SEMINAR' };
        if (batchId && batchId !== '') {
            countWhere.batchId = parseInt(batchId);
        } else if (businessId && businessId !== '') {
            countWhere.phone = { contains: `_BIZ_${businessId}` };
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
        // 🚀 FIX: Extract businessId from req.body
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
                
                // 🚀 FIX: Secure unique phone binding for bulk import
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
            // 🚀 FIX: Secure unique phone binding for single import
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

// ==========================================
// ASSIGN LEADS (With Deep Debug Logs)
// ==========================================
exports.assignLeads = async (req, res) => {
    try {
        console.log("\n🚀 --- ASSIGN LEADS DEBUG START ---");
        console.log("📥 Payload Received (req.body):", req.body);

        const { type, staffId, count, sort, autoAssignConfig, batchId, businessId } = req.body;
        
        if (type === 'bulk') {
            let whereClause = { assignedTo: null, status: 'NEW' };
            
            // Strict Batch & Business filter for bulk assigning
            if (batchId && batchId !== '') {
                console.log(`📌 Using specific Batch ID: ${batchId}`);
                whereClause.batchId = parseInt(batchId);
            } else if (businessId && businessId !== '') {
                console.log(`🏢 Using Business ID: ${businessId}. Fetching related batches...`);
                const bizBatches = await prisma.batch.findMany({ 
                    where: { businessId: parseInt(businessId) }, 
                    select: { id: true } 
                });
                
                const batchIdsArray = bizBatches.map(b => b.id);
                console.log(`📋 Found Batches for Business ${businessId}:`, batchIdsArray);
                
                if (batchIdsArray.length > 0) {
                    whereClause.batchId = { in: batchIdsArray };
                } else {
                    console.log("⚠️ WARNING: No batches found for this business. Fallback applied to prevent mixing.");
                    whereClause.batchId = -1; 
                }
            } else {
                console.log("🚨 CRITICAL WARNING: No batchId or businessId provided! This will search ALL system leads!");
            }

            console.log("🔍 Final Prisma Where Clause:", JSON.stringify(whereClause, null, 2));

            const leadsToAssign = await prisma.lead.findMany({ 
                where: whereClause, 
                // 🔥 FIX: 'createdAt' wenuwata 'id' eken sort kara. Ethakota kawalam wenne na! 🔥
                orderBy: { id: sort === 'oldest' ? 'asc' : 'desc' }, 
                take: parseInt(count) 
            });
            
            console.log(`🎯 Leads Found in DB to Assign: ${leadsToAssign.length}`);

            if (leadsToAssign.length === 0) {
                console.log("❌ No unassigned leads found. Exiting.");
                console.log("🚀 --- ASSIGN LEADS DEBUG END ---\n");
                return res.status(400).json({ error: "No unassigned leads found for this CRM." });
            }
            
            const ids = leadsToAssign.map(l => l.id);
            console.log(`📝 Lead IDs going to be updated:`, ids);

            const updateResult = await prisma.lead.updateMany({ 
                where: { id: { in: ids } }, 
                data: { assignedTo: parseInt(staffId), status: 'OPEN', phase: 1, callStatus: 'pending' } 
            });
            
            console.log(`✅ Database Update Result:`, updateResult);
            console.log("🚀 --- ASSIGN LEADS DEBUG END ---\n");

            return res.status(200).json({ message: `${leadsToAssign.length} leads assigned successfully!` });
            
        } else if (type === 'auto') {
            console.log("🤖 Handling Auto Assign Configuration...");
            for (const config of autoAssignConfig) {
                await prisma.autoAssignQuota.upsert({
                    where: { staffId: parseInt(config.staffId) },
                    update: { quotaAmount: parseInt(config.quotaAmount), isActive: config.isActive },
                    create: { staffId: parseInt(config.staffId), quotaAmount: parseInt(config.quotaAmount), isActive: config.isActive }
                });
            }
            console.log("✅ Auto Assign config saved!");
            return res.status(200).json({ message: "Auto Assign configuration saved!" });
        }
    } catch (error) { 
        console.error("❌ ERROR in assignLeads:", error);
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
// META MEDIA DOWNLOAD HELPER
// ==========================================
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
        
        // 🔥 SAFE DIRECTORY CREATION TO PREVENT CRASHES 🔥
        const docsDir = path.join(process.cwd(), 'storage/documents');
        if (!fs.existsSync(docsDir)) {
            fs.mkdirSync(docsDir, { recursive: true });
        }
        const finalPath = path.join(docsDir, filename);
        
        fs.writeFileSync(finalPath, Buffer.from(fileResponse.data));
        return { url: `/storage/documents/${filename}`, type: mimeType };
    } catch (error) {
        console.error("Meta Media Download Error:", error.message);
        return null;
    }
};

// ==========================================
// 6. RECEIVE MESSAGE WEBHOOK (UNIFIED FOR ALL CAMPAIGNS WITH DEBUG LOGS)
// ==========================================
exports.receiveMessage = async (req, res) => {
    try {
        let body = req.body;
        
        if (body.object === "whatsapp_business_account" && body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {
            let msgData = body.entry[0].changes[0].value.messages[0];
            let contactData = body.entry[0].changes[0].value.contacts[0];
            let phone = msgData.from; 
            let name = contactData.profile.name || "Unknown"; 
            let metaMsgId = msgData.id; 

            // 🔥 FIX 1: Prevent Duplicate Webhook Messages 🔥
            const existingMessage = await prisma.chatMessage.findFirst({
                where: { metaMessageId: metaMsgId }
            });

            if (existingMessage) {
                console.log(`⚠️ Duplicate Webhook Ignored for Meta ID: ${metaMsgId}`);
                return res.status(200).send("EVENT_RECEIVED");
            }

            let metadata = body.entry[0].changes[0].value.metadata;
            let receivingWaNumId = metadata ? metadata.phone_number_id : null;

            console.log(`📱 1. Incoming Phone: ${phone}`);
            console.log(`📞 2. Receiving WA Number ID: ${receivingWaNumId}`);

            // Me waNumId eken settings hoyanawa
            const settings = await prisma.crmSettings.findFirst({ 
                where: { waNumId: receivingWaNumId } 
            });

            if (!settings) {
                console.log(`❌ ERROR: Me waNumId (${receivingWaNumId}) ekata adala CRM Settings database eke na!`);
                return res.status(200).send("EVENT_RECEIVED");
            }
            
            console.log(`✅ 3. Settings Found! Business ID: ${settings.businessId}, Bot Mode: ${settings.botMode}, Campaign: ${settings.campaignType}`);

            let messageText = "Media Message";
            let interactiveId = null;
            let isFollowUpReply = false;
            let mediaUrl = null; 
            let mediaType = null;

            // 🔥 FIX: NEW MEDIA HANDLING LOGIC ADDED HERE 🔥
            if (["image", "audio", "video", "document", "sticker"].includes(msgData.type)) {
                const mediaObj = msgData[msgData.type];
                messageText = mediaObj.caption || mediaObj.filename || `${msgData.type.toUpperCase()} Message`;
                const mediaRes = await downloadMetaMedia(mediaObj.id, settings.metaApiKey);
                if (mediaRes) { 
                    mediaUrl = mediaRes.url; 
                    mediaType = mediaRes.type; 
                }
            } else if (msgData.type === "interactive" && msgData.interactive?.type === "button_reply") {
                interactiveId = msgData.interactive.button_reply.id; 
                messageText = msgData.interactive.button_reply.title; 
                if (interactiveId === "FU_YES" || interactiveId === "FU_NO") {
                    isFollowUpReply = true;
                }
            } else if (msgData.text) {
                messageText = msgData.text.body;
            }

            // 🔥 DB UNIQUE PHONE (SEPARATES BY CRM) 🔥
            let parsedBatchId = settings.batchId ? parseInt(settings.batchId) : null;
            let dbPhone = `${phone}_BIZ_${settings.businessId}`;
            if (parsedBatchId) {
                dbPhone += `_BATCH_${parsedBatchId}`;
            }

            // ========================================================
            // 🟢 LOGIC 1: AFTER SEMINAR MESSAGE EKAK NAM 🟢
            // ========================================================
            if (settings.campaignType === 'AFTER_SEMINAR') {
                const msgLower = messageText.toLowerCase().trim();
                
                // 🔥 OPEN SEMINAR / DIRECT MESSAGES ADURAGANNAWA 🔥
                const isOpenSeminar = msgLower.includes('open seminar');
                const isYesMsg = msgLower === 'yes';

                let detInquiryType = 'NEW_INQ'; // Default goes to NEW INQ tab
                if (isOpenSeminar) {
                    detInquiryType = 'OPEN_SEMINAR'; // Goes to NEW tab -> Open Seminar
                } else if (isYesMsg) {
                    detInquiryType = 'NORMAL'; // Goes to NEW tab
                }

                // New Inq eken ena direct msgs walata witharai timer eka wadinne
                const newInqTs = (!isOpenSeminar && !isYesMsg) ? new Date() : null;

                let createDataAfterSeminar = { 
                    name: name, 
                    phone: dbPhone, 
                    source: 'whatsapp', 
                    campaignType: 'AFTER_SEMINAR', 
                    lastMessage: messageText || 'Received Media', 
                    unreadCount: 1, 
                    status: 'NEW', 
                    phase: 1, 
                    callStatus: 'pending', 
                    paymentIntention: 'NOT_DECIDED', 
                    enrollmentStatus: 'NON_ENROLLED',
                    inquiryType: detInquiryType, 
                    newInqTimestamp: newInqTs
                };

                if (parsedBatchId) {
                    createDataAfterSeminar.batch = { connect: { id: parsedBatchId } };
                }

                let existingLead = await prisma.lead.upsert({
                    where: { phone: dbPhone },
                    update: { 
                        name: name, 
                        lastMessage: messageText || 'Received Media', 
                        unreadCount: { increment: 1 }, 
                        status: 'OPEN', 
                        updatedAt: new Date(),
                        inquiryType: detInquiryType,
                        newInqTimestamp: (!isOpenSeminar && !isYesMsg) ? new Date() : undefined
                    },
                    create: createDataAfterSeminar
                });

                // 🔥 DB SAVE WITH MEDIA URL 🔥
                await prisma.chatMessage.create({ 
                    data: { leadId: existingLead.id, message: messageText, mediaUrl: mediaUrl, mediaType: mediaType, direction: 'inbound', senderType: 'USER', senderName: name, metaMessageId: metaMsgId } 
                });
                
                return res.status(200).send("EVENT_RECEIVED");
            }

            // ========================================================
            // 🔵 LOGIC 2: FREE SEMINAR MESSAGE EKAK NAM 🔵
            // ========================================================
            if (settings.campaignType === 'FREE_SEMINAR') {
                const isRestartCommand = ['hi', 'hello', 'hey', 'menu', 'start'].includes(messageText.toLowerCase().trim());
                let existingLead = await prisma.lead.findUnique({ where: { phone: dbPhone } });
                
                const timeSinceLastMsg = existingLead && existingLead.updatedAt ? new Date() - new Date(existingLead.updatedAt) : 10000;
                const isSpamming = timeSinceLastMsg < 2000; 
                
                let resetData = {};
                if (isRestartCommand) {
                    resetData = { autoReplyStep: 0, sequenceCompleted: false };
                    console.log(`🔄 4. Restart Command Detected. Resetting Steps.`);
                }

                let createDataFreeSeminar = { 
                    name: name, 
                    phone: dbPhone, 
                    source: 'whatsapp', 
                    campaignType: 'FREE_SEMINAR', 
                    lastMessage: messageText || 'Received Media', 
                    unreadCount: 1, 
                    status: 'NEW', 
                    phase: 1, 
                    callStatus: 'pending', 
                    autoReplyStep: 0, 
                    sequenceCompleted: false 
                };

                if (parsedBatchId) {
                    createDataFreeSeminar.batch = { connect: { id: parsedBatchId } };
                }

                existingLead = await prisma.lead.upsert({
                    where: { phone: dbPhone },
                    update: { 
                        name: name, 
                        lastMessage: messageText || 'Received Media', 
                        unreadCount: { increment: 1 }, 
                        status: existingLead?.assignedTo ? 'OPEN' : 'NEW', 
                        updatedAt: new Date(), 
                        ...resetData 
                    },
                    create: createDataFreeSeminar
                });

                // 🔥 DB SAVE WITH MEDIA URL 🔥
                await prisma.chatMessage.create({ 
                    data: { leadId: existingLead.id, message: messageText, mediaUrl: mediaUrl, mediaType: mediaType, direction: 'inbound', senderType: 'USER', senderName: name, metaMessageId: metaMsgId } 
                });

                const botAllowed = (settings?.botMode === 'ON' || settings?.botMode === 'AUTO_REPLY_ONLY');
                console.log(`🤖 5. Bot Allowed?: ${botAllowed}, Sequence Completed?: ${existingLead.sequenceCompleted}, Spamming?: ${isSpamming}`);

                if (botAllowed && !existingLead.sequenceCompleted && !isSpamming && !isFollowUpReply) {
                    const autoReplies = await prisma.autoReply.findMany({ 
                        where: { campaignType: 'FREE_SEMINAR', businessId: settings.businessId }, 
                        orderBy: { stepOrder: 'asc' } 
                    });
                    
                    console.log(`📂 6. Found ${autoReplies.length} Auto Replies in DB for Business ${settings.businessId}`);

                    if (autoReplies.length > 0) {
                        const currentStep = existingLead.autoReplyStep || 0;
                        const nextReply = autoReplies.find(r => r.stepOrder > currentStep);

                        if (nextReply) {
                            console.log(`🚀 7. Sending Auto Reply Step: ${nextReply.stepOrder}`);
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
                                
                                console.log(`✅ 8. Message successfully sent to Meta API!`);
                                
                                await prisma.chatMessage.create({ data: { leadId: existingLead.id, message: nextReply.message, mediaUrl: nextReply.attachment, mediaType: nextReply.attachmentType, direction: 'outbound', senderType: 'SYSTEM', senderName: 'AutoBot' } });
                                const isLastStep = autoReplies[autoReplies.length - 1].id === nextReply.id;
                                await prisma.lead.update({ where: { id: existingLead.id }, data: { autoReplyStep: nextReply.stepOrder, sequenceCompleted: isLastStep } });
                            } catch (sendErr) { 
                                console.log(`❌ ERROR 8. Meta API eken message eka reject kara!`);
                                console.log(sendErr.response?.data || sendErr.message); 
                            }
                        } else {
                            console.log(`🛑 7. No next reply found. Current Step: ${currentStep}`);
                        }
                    }
                }
                console.log("========================================\n");
                return res.status(200).send("EVENT_RECEIVED");
            }
        }
        res.status(200).send("EVENT_RECEIVED");
    } catch (error) { 
        console.error("CRITICAL WEBHOOK ERROR:", error);
        res.status(500).send("ERROR"); 
    }
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
        
        // 🔥 EXTRACT REAL PHONE (Strip _BatchID) 🔥
        let formattedPhone = lead.phone.split('_')[0].replace(/[^0-9]/g, ''); 
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
            let settings;
            if (lead.batchId) {
                const batchRecord = await prisma.batch.findUnique({ where: { id: lead.batchId } });
                if (batchRecord) settings = await prisma.crmSettings.findFirst({ where: { businessId: batchRecord.businessId, campaignType: lead.campaignType || 'FREE_SEMINAR' } });
            } else {
                settings = await prisma.crmSettings.findFirst({ where: { campaignType: lead.campaignType || 'FREE_SEMINAR' } });
            }

            if (settings && settings.metaApiKey && settings.waNumId) {
                let metaPayload = { messaging_product: "whatsapp", recipient_type: "individual", to: formattedPhone };
                if (replyToMetaId && replyToMetaId !== 'null' && replyToMetaId !== 'undefined') metaPayload.context = { message_id: replyToMetaId };

                if (message && !mediaUrl) {
                    metaPayload.type = "text"; metaPayload.text = { preview_url: false, body: message };
                } else if (mediaUrl) {
                    const liveMediaUrl = `https://imacampus.online${mediaUrl}`; 
                    if (mediaType.includes('image')) { metaPayload.type = "image"; metaPayload.image = { link: liveMediaUrl, caption: message || "" }; } 
                    else if (mediaType.includes('audio') || mediaUrl.endsWith('.mp3') || mediaUrl.endsWith('.ogg')) { metaPayload.type = "audio"; metaPayload.audio = { link: liveMediaUrl }; } 
                    else if (mediaType.includes('video')) { metaPayload.type = "video"; metaPayload.video = { link: liveMediaUrl, caption: message || "" }; } 
                    else { metaPayload.type = "document"; metaPayload.document = { link: liveMediaUrl, caption: message || "", filename: req.file ? req.file.originalname : "document.pdf" }; }
                }

                const metaRes = await axios.post(`https://graph.facebook.com/v19.0/${settings.waNumId}/messages`, metaPayload, { headers: { 'Authorization': `Bearer ${settings.metaApiKey}`, 'Content-Type': 'application/json' } });
                if (metaRes.data?.messages?.[0]?.id) await prisma.chatMessage.update({ where: { id: newMsg.id }, data: { metaMessageId: metaRes.data.messages[0].id } });
            }
        } catch (metaError) { }
        res.status(201).json(newMsg);
    } catch (error) { res.status(500).json({ error: "Failed to send message" }); }
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
    try {
        const { businessId } = req.query;
        let whereClause = { campaignType: 'FREE_SEMINAR' };
        if (businessId && businessId !== '') whereClause.businessId = parseInt(businessId);
        
        const settings = await prisma.crmSettings.findFirst({ where: whereClause });
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
    } catch (err) { res.status(500).json({ error: err.response?.data?.error?.message || "Failed to create template" }); }
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
        if (batchId && batchId !== '') {
            leadWhere.batchId = parseInt(batchId);
        } else if (businessId && businessId !== '') {
            const bizBatches = await prisma.batch.findMany({ where: { businessId: parseInt(businessId) }});
            leadWhere.batchId = { in: bizBatches.map(b => b.id) };
        }

        if (phase && phase !== 'All') leadWhere.phase = parseInt(phase);

        const businessRecord = businessId ? await prisma.business.findUnique({where:{id:parseInt(businessId)}}) : null;
        const bizName = businessRecord ? businessRecord.name : '';

        const staff = await prisma.user.findMany({ 
            where: { 
                role: { in: ['COORDINATOR', 'CALLER', 'STAFF', 'MANAGER', 'Coordinator'] },
                OR: [
                    { businessType: String(businessId) },
                    { businessType: bizName }
                ]
            } 
        });

        const leads = await prisma.lead.findMany({ where: leadWhere });
        const leadIds = leads.map(l => l.id);

        const unassignedLeads = leads.filter(l => !l.assignedTo).length;
        const totalLeads = leads.length;

        let msgWhere = { leadId: { in: leadIds.length > 0 ? leadIds : [-1] } };
        if (startDate && endDate) msgWhere.createdAt = { gte: new Date(startDate), lte: new Date(endDate) };
        const chatMessages = await prisma.chatMessage.findMany({ where: msgWhere });

        let report = []; let msgReport = [];
        let summary = { totalLeads, unassignedLeads, totalSent: 0, totalReceived: 0, totalAnswered: 0, rate: 0 };

        const globalSentLeadIds = new Set();
        const globalReceivedLeadIds = new Set();

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

            msgReport.push({ 
                agentName: agent.firstName, 
                sentMsgs: agentSentMsgs.length, 
                uniqueSent: uniqueSentIds.size, 
                receivedMsgs: agentReceivedMsgs.length, 
                uniqueReceived: uniqueReceivedIds.size 
            });

            uniqueSentIds.forEach(id => globalSentLeadIds.add(id));
            uniqueReceivedIds.forEach(id => globalReceivedLeadIds.add(id));
        });

        summary.totalSent = globalSentLeadIds.size;
        summary.totalReceived = globalReceivedLeadIds.size;
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
            let formattedPhone = lead.phone.split('_')[0].replace(/[^0-9]/g, ''); 
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
                results.failed += 1; results.reasons.push({ phone: formattedPhone, error: err.message });
            }
        }
        res.status(200).json(results);
    } catch (error) { res.status(500).json({ error: "Broadcast failed" }); }
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
// 12. AUTO FOLLOW-UP ENGINE (Safe Version)
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