const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const axios = require('axios');
const fs = require('fs'); 
const path = require('path');
const pdfParse = require('pdf-parse'); 

// ==========================================
// 1. SETTINGS & CRM SETUP 
// ==========================================
exports.saveCrmSettings = async (req, res) => {
    try {
        const { businessId, campaignType, metaApiKey, waId, waNumId, geminiKeys, botMode, batchId } = req.body;
        if (!businessId || !campaignType) return res.status(400).json({ error: "Missing businessId or campaignType" });
        const existing = await prisma.crmSettings.findFirst({ where: { businessId: parseInt(businessId), campaignType: campaignType } });
        const settingsData = { metaApiKey: metaApiKey || null, waId: waId || null, waNumId: waNumId || null, geminiKeys: geminiKeys || [], botMode: botMode || 'OFF', batchId: batchId ? String(batchId) : null };
        
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

exports.getFollowUpStatus = async (req, res) => {
    try {
        const { businessId } = req.query;
        if(!businessId) return res.status(400).json({ error: "Missing business ID" });
        
        const settings = await prisma.crmSettings.findFirst({ 
            where: { businessId: parseInt(businessId), campaignType: 'AFTER_SEMINAR' } 
        });
        res.status(200).json({ isOn: settings?.botMode === 'AUTO_FOLLOW_UP' });
    } catch (error) { res.status(500).json({ error: "Failed to get follow-up status" }); }
};

exports.toggleFollowUpStatus = async (req, res) => {
    try {
        const { businessId, isOn } = req.body;
        if(!businessId) return res.status(400).json({ error: "Missing business ID" });
        
        const settings = await prisma.crmSettings.findFirst({ 
            where: { businessId: parseInt(businessId), campaignType: 'AFTER_SEMINAR' } 
        });

        if (settings) {
            await prisma.crmSettings.update({
                where: { id: settings.id },
                data: { botMode: isOn ? 'AUTO_FOLLOW_UP' : 'OFF' } 
            });
            res.status(200).json({ success: true, message: "Follow-up status updated" });
        } else {
             res.status(404).json({ error: "Settings not found for this business" });
        }
    } catch (error) { res.status(500).json({ error: "Failed to toggle follow-up" }); }
};

// ==========================================
// 2. LEAD FETCHING (WITH AUTO-SYNC ENGINE)
// ==========================================
exports.getLeads = async (req, res) => {
    try {
        const userId = req.user?.id || req.query.loggedUserId || 1;
        const userRoleRaw = req.user?.role || req.query.loggedUserRole || 'STAFF'; 
        const userRole = String(userRoleRaw).toUpperCase().replace(/ /g, '_');

        const { tab, staffPhase, status, staffId, batchId, businessId, paymentGroup, enrollmentStatus, inquiryType } = req.query; 
        const isManager = ['SYSTEM_ADMIN', 'DIRECTOR', 'MANAGER', 'SUPER', 'ASS_MANAGER'].includes(userRole);

        let whereClause = { campaignType: 'AFTER_SEMINAR' };

        if (businessId && businessId !== '') whereClause.phone = { contains: `_BIZ_${businessId}` };
        if (batchId && batchId !== '') whereClause.batchId = parseInt(batchId);
        if (paymentGroup && paymentGroup !== '') whereClause.paymentIntention = paymentGroup;
        if (enrollmentStatus && enrollmentStatus !== '') whereClause.enrollmentStatus = enrollmentStatus;
        if (inquiryType && inquiryType !== '') whereClause.inquiryType = inquiryType;

        if (tab === 'NEW') {
            if (isManager) whereClause.assignedTo = null; 
            else whereClause.assignedTo = parseInt(userId);
        } else if (tab === 'ASSIGNED') {
            whereClause.assignedTo = { not: null }; 
            if (staffId && staffId !== '') whereClause.assignedTo = parseInt(staffId);
            else if (!isManager) whereClause.assignedTo = parseInt(userId);
            if (staffPhase && staffPhase !== '') whereClause.phase = parseInt(staffPhase);
            if (status && status !== '') whereClause.callStatus = status;
        }

        let leads = await prisma.lead.findMany({
            where: whereClause, 
            orderBy: [ { unreadCount: 'desc' }, { updatedAt: 'desc' } ], 
            include: { assignedUser: { select: { firstName: true, lastName: true } }, batch: { select: { name: true } } }
        });

        const now = new Date();

        for (let i = 0; i < leads.length; i++) {
            let l = leads[i];

            // 1. 24h & 5-Day Lock Check Logic
            if (l.inquiryType === 'NEW_INQ' && l.newInqTimestamp) {
                const hoursPassed = (now - new Date(l.newInqTimestamp)) / (1000 * 60 * 60);
                const daysPassed = hoursPassed / 24;

                if (hoursPassed >= 24 && l.phase === 1 && (!l.callStatus || l.callStatus === 'pending') && !l.isLocked) {
                    await prisma.lead.update({ where: { id: l.id }, data: { isLocked: true } });
                    leads[i].isLocked = true;
                }
                if (daysPassed >= 5 && l.enrollmentStatus === 'NON_ENROLLED') {
                    leads[i].needs5DayCall = true;
                } else {
                    leads[i].needs5DayCall = false;
                }
            }

            // 2. 🔥 AUTO-SYNC ENROLLMENT FROM MAIN DATABASE 🔥
            if (l.batchId) {
                let rawPhone = l.phone ? l.phone.split('_')[0].replace(/[^0-9]/g, '') : '';
                if (rawPhone.length >= 9) {
                    const phoneSuffix = rawPhone.slice(-9); // Standardize phone to check last 9 digits (eg: 712345678)
                    
                    // Main Database eke student check karanawa
                    const student = await prisma.user.findFirst({
                        where: { phone: { endsWith: phoneSuffix } },
                        include: {
                            payments: {
                                where: { 
                                    batchId: l.batchId, 
                                    status: 1 // 🔥 1 = Approved Payment 🔥
                                },
                                orderBy: { created_at: 'desc' }
                            }
                        }
                    });

                    // Lamayata approved payment ekak thiyenawanam auto-sync karanawa
                    if (student && student.payments && student.payments.length > 0) {
                        const latestPayment = student.payments[0];
                        
                        // 1=Monthly, 2=Installment, 3=Full
                        let actualIntention = 'NOT_DECIDED';
                        if (latestPayment.payment_type === 1) actualIntention = 'MONTHLY';
                        else if (latestPayment.payment_type === 2) actualIntention = 'INSTALLMENT';
                        else if (latestPayment.payment_type === 3) actualIntention = 'FULL';

                        // CRM eke thama update wela naththam, auto update karala Open Seminar yawana eka
                        if (l.enrollmentStatus !== 'ENROLLED' || l.paymentIntention !== actualIntention) {
                            await prisma.lead.update({
                                where: { id: l.id },
                                data: {
                                    enrollmentStatus: 'ENROLLED',
                                    paymentIntention: actualIntention,
                                    inquiryType: 'OPEN_SEMINAR', // 🔥 Auto move to Open Seminar
                                    isLocked: false
                                }
                            });
                            
                            // Loop array eka update karanawa (UI ekata yaddi hari data eka penna)
                            leads[i].enrollmentStatus = 'ENROLLED';
                            leads[i].paymentIntention = actualIntention;
                            leads[i].inquiryType = 'OPEN_SEMINAR';
                            leads[i].isLocked = false;
                        }
                    }
                }
            }

            // UI ekata yaddi number eka clean karala yawima
            leads[i].phone = l.phone ? l.phone.split('_BIZ')[0] : '';
        }

        // Dashboard eke Counts tika hadima
        let countWhere = { campaignType: 'AFTER_SEMINAR' };
        if (businessId && businessId !== '') countWhere.phone = { contains: `_BIZ_${businessId}` };
        if (batchId && batchId !== '') countWhere.batchId = parseInt(batchId);

        const allLeadsForCounts = await prisma.lead.findMany({ where: countWhere });
        let counts = { NEW: 0, ASSIGNED: 0, ALL: 0, FULL: 0, MONTHLY: 0, INSTALLMENT: 0, NOT_DECIDED: 0, NEW_INQ: 0, OPEN_SEMINAR: 0 };
        let unreadCounts = { NEW: 0, NEW_INQ: 0, ASSIGNED: 0, ALL: 0, OPEN_SEMINAR: 0 };
        let totalUnread = 0;
        
        allLeadsForCounts.forEach(l => {
            if (!isManager && l.assignedTo && l.assignedTo !== parseInt(userId)) return;

            counts.ALL++;
            if (l.unreadCount > 0) {
                totalUnread++;
                unreadCounts.ALL++;
            }

            if (l.assignedTo) {
                counts.ASSIGNED++;
                if (l.unreadCount > 0) unreadCounts.ASSIGNED++;
            } else {
                if (l.inquiryType === 'NORMAL') {
                    counts.NEW++;
                    if (l.unreadCount > 0) unreadCounts.NEW++;
                } else if (l.inquiryType === 'NEW_INQ') {
                    counts.NEW_INQ++;
                    if (l.unreadCount > 0) unreadCounts.NEW_INQ++;
                } else if (l.inquiryType === 'OPEN_SEMINAR') {
                    counts.OPEN_SEMINAR++;
                    if (l.unreadCount > 0) unreadCounts.OPEN_SEMINAR++;
                }
            }

            if (l.paymentIntention === 'FULL') counts.FULL++;
            else if (l.paymentIntention === 'MONTHLY') counts.MONTHLY++;
            else if (l.paymentIntention === 'INSTALLMENT') counts.INSTALLMENT++;
            else counts.NOT_DECIDED++;
        });

        res.status(200).json({ leads, counts, unreadCounts, totalUnread });
    } catch (error) { 
        console.error("Auto Sync Engine Error:", error);
        res.status(500).json({ error: "Failed to fetch leads" }); 
    }
};

// ==========================================
// 3. IMPORT, BULK ACTIONS & ASSIGN
// ==========================================
exports.importLead = async (req, res) => {
    try {
        const { name, number, isBulk, leadsList, batchId, businessId } = req.body;
        const userId = req.user?.id;
        const userRoleRaw = req.user?.role || '';
        const userRole = userRoleRaw.toUpperCase().replace(/ /g, '_');
        const isManager = ['SYSTEM_ADMIN', 'DIRECTOR', 'MANAGER', 'SUPER', 'ASS_MANAGER'].includes(userRole);
        const assignedTo = isManager ? null : parseInt(userId);
        const parsedBatchId = batchId ? parseInt(batchId) : null;
        const parsedBusinessId = businessId ? parseInt(businessId) : null;

        if (!parsedBusinessId) return res.status(400).json({ error: "Business ID is required." });

        const baseData = {
            batchId: parsedBatchId, source: isBulk ? 'bulk_import' : 'import', campaignType: 'AFTER_SEMINAR',
            assignedTo, status: assignedTo ? 'OPEN' : 'NEW', phase: 1, callStatus: 'pending',
            paymentIntention: 'NOT_DECIDED', enrollmentStatus: 'NON_ENROLLED', inquiryType: 'NORMAL'
        };

        if (isBulk && leadsList && Array.isArray(leadsList)) {
            let importedCount = 0;
            for (const lead of leadsList) {
                const phone = lead.number?.toString().trim();
                if (!phone) continue;
                const dbPhone = parsedBatchId ? `${phone}_BIZ_${parsedBusinessId}_BATCH_${parsedBatchId}` : `${phone}_BIZ_${parsedBusinessId}`;
                await prisma.lead.upsert({
                    where: { phone: dbPhone }, update: { name: lead.name || '' }, create: { name: lead.name || '', phone: dbPhone, ...baseData }
                });
                importedCount++;
            }
            return res.status(201).json({ message: `${importedCount} leads imported successfully!` });
        } else {
            const dbPhone = parsedBatchId ? `${number}_BIZ_${parsedBusinessId}_BATCH_${parsedBatchId}` : `${number}_BIZ_${parsedBusinessId}`;
            const newLead = await prisma.lead.upsert({
                where: { phone: dbPhone }, update: { name }, create: { name, phone: dbPhone, ...baseData }
            });
            return res.status(201).json({ message: "Lead imported successfully!", lead: newLead });
        }
    } catch (error) { res.status(500).json({ error: "Failed to import lead" }); }
};

exports.bulkActions = async (req, res) => {
    try {
        const { action, leadIds, staffId } = req.body;
        if (action === 'MARK_READ') await prisma.lead.updateMany({ where: { id: { in: leadIds } }, data: { unreadCount: 0 } });
        else if (action === 'MARK_UNREAD') await prisma.lead.updateMany({ where: { id: { in: leadIds } }, data: { unreadCount: 1, assignedTo: null, status: 'NEW' } });
        else if (action === 'ASSIGN') await prisma.lead.updateMany({ where: { id: { in: leadIds } }, data: { assignedTo: parseInt(staffId), status: 'OPEN', phase: 1, callStatus: 'pending' } });
        else if (action === 'UNASSIGN') await prisma.lead.updateMany({ where: { id: { in: leadIds } }, data: { assignedTo: null, status: 'NEW', phase: 1, callStatus: 'pending' } });
        res.status(200).json({ message: "Action successful" });
    } catch (error) { res.status(500).json({ error: "Bulk action failed" }); }
};

exports.getAutoAssignQuotas = async (req, res) => {
    try {
        const quotas = await prisma.autoAssignQuota.findMany({ include: { staff: { select: { firstName: true, lastName: true } } } });
        res.status(200).json(quotas);
    } catch (error) { res.status(500).json({ error: "Failed to load quotas" }); }
};

exports.assignLeads = async (req, res) => {
    try {
        const { type, staffId, count, sort, autoAssignConfig, batchId, businessId, assignType } = req.body;
        
        if (type === 'bulk') {
            let whereClause = { assignedTo: null, status: 'NEW', campaignType: 'AFTER_SEMINAR' };
            if (businessId && businessId !== '') whereClause.phone = { contains: `_BIZ_${businessId}` };
            if (batchId && batchId !== '') whereClause.batchId = parseInt(batchId);

            if (assignType === 'NEW_INQ') whereClause.inquiryType = 'NEW_INQ';
            else whereClause.inquiryType = 'NORMAL';

            const leadsToAssign = await prisma.lead.findMany({ where: whereClause, orderBy: { id: sort === 'oldest' ? 'asc' : 'desc' }, take: parseInt(count) });
            if (leadsToAssign.length === 0) return res.status(400).json({ error: "No unassigned leads found for this category." });
            const ids = leadsToAssign.map(l => l.id);
            await prisma.lead.updateMany({ where: { id: { in: ids } }, data: { assignedTo: parseInt(staffId), status: 'OPEN', phase: 1, callStatus: 'pending' } });
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

// ==========================================
// 4. CALL CAMPAIGN & COORDINATION
// ==========================================
exports.updateCallCampaign = async (req, res) => {
    try {
        const { leadId, method, status, feedback, coordinationRound, paymentIntention, enrollmentStatus } = req.body;
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
                callMethod: method, callStatus: status, feedback: feedback, phase: nextPhase,
                coordinationRound: coordinationRound ? parseInt(coordinationRound) : lead.coordinationRound,
                paymentIntention: paymentIntention || lead.paymentIntention,
                enrollmentStatus: enrollmentStatus || lead.enrollmentStatus
            }
        });
        res.status(200).json({ message: "Call status updated", lead: updatedLead });
    } catch (error) { res.status(500).json({ error: "Failed to update call campaign" }); }
};

exports.startNewCoordination = async (req, res) => {
    try {
        const { businessId, batchId } = req.body;
        let whereClause = { campaignType: 'AFTER_SEMINAR', enrollmentStatus: 'NON_ENROLLED' };
        if (businessId && businessId !== '') whereClause.phone = { contains: `_BIZ_${businessId}` };
        if (batchId && batchId !== '') whereClause.batchId = parseInt(batchId);

        await prisma.lead.updateMany({
            where: whereClause,
            data: { callStatus: 'pending', coordinationRound: { increment: 1 } }
        });
        res.status(200).json({ message: "New coordination round started!" });
    } catch (error) { 
        console.error("Start coordination error", error);
        res.status(500).json({ error: "Failed to start new round" }); 
    }
};

exports.getAllCampaignLeads = async (req, res) => {
    try {
        const { businessId, batchId } = req.query;
        let whereClause = { campaignType: 'AFTER_SEMINAR' };
        if (businessId && businessId !== '') whereClause.phone = { contains: `_BIZ_${businessId}` };
        if (batchId && batchId !== '') whereClause.batchId = parseInt(batchId);
        
        const leads = await prisma.lead.findMany({ where: whereClause, orderBy: { updatedAt: 'desc' } }); 
        const cleanedLeads = leads.map(l => ({ ...l, phone: l.phone ? l.phone.split('_')[0] : '' }));
        res.status(200).json(cleanedLeads);
    } catch (error) { res.status(500).json({ error: "Failed to fetch leads" }); }
};

// ==========================================
// 5. CHATS, WEBHOOK & BROADCAST
// ==========================================

// 🔥 DEBUG ADDED: Helper function to download media from Meta API 🔥
const downloadMetaMedia = async (mediaId, metaApiKey) => {
    console.log(`\n--- 📥 STARTING MEDIA DOWNLOAD ---`);
    console.log(`[DEBUG] Media ID received: ${mediaId}`);
    try {
        const axios = require('axios');
        const fs = require('fs');
        const path = require('path');
        
        console.log(`[DEBUG] 1. Requesting media URL from Meta...`);
        const urlResponse = await axios.get(`https://graph.facebook.com/v19.0/${mediaId}`, {
            headers: { 'Authorization': `Bearer ${metaApiKey}` }
        });
        
        const mediaUrl = urlResponse.data.url;
        const mimeType = urlResponse.data.mime_type || '';
        console.log(`[DEBUG] 2. Meta API Responded: URL = ${mediaUrl}, MimeType = ${mimeType}`);

        if(!mediaUrl) {
            console.log(`[ERROR] Meta returned empty URL!`);
            return null;
        }

        console.log(`[DEBUG] 3. Downloading file stream/buffer from Meta URL...`);
        const fileResponse = await axios.get(mediaUrl, {
            headers: { 'Authorization': `Bearer ${metaApiKey}` },
            responseType: 'arraybuffer' 
        });

        console.log(`[DEBUG] 4. File buffer received. Buffer size: ${fileResponse.data.length} bytes`);

        let ext = 'bin';
        if (mimeType.includes('jpeg')) ext = 'jpeg';
        else if (mimeType.includes('png')) ext = 'png';
        else if (mimeType.includes('webp')) ext = 'webp';
        else if (mimeType.includes('mp4')) ext = 'mp4';
        else if (mimeType.includes('pdf')) ext = 'pdf';
        else if (mimeType.includes('ogg')) ext = 'ogg'; 
        else if (mimeType.includes('audio')) ext = 'mp3';

        const filename = `CHAT_MEDIA_${Date.now()}_${Math.floor(Math.random() * 1000)}.${ext}`;
        
        const uploadPathDir = path.join(process.cwd(), 'storage/documents');
        console.log(`[DEBUG] 5. Target upload directory: ${uploadPathDir}`);
        
        if (!fs.existsSync(uploadPathDir)){
            console.log(`[DEBUG] Directory doesn't exist. Creating now...`);
            fs.mkdirSync(uploadPathDir, { recursive: true });
        }
        
        const finalPath = path.join(uploadPathDir, filename);
        console.log(`[DEBUG] 6. Writing buffer to file system: ${finalPath}`);
        
        fs.writeFileSync(finalPath, Buffer.from(fileResponse.data));
        console.log(`[DEBUG] 7. ✅ File written successfully!`);
        
        return {
            url: `/storage/documents/${filename}`, 
            type: mimeType
        };
    } catch (error) {
        console.error("\n[CRITICAL MEDIA ERROR] Failed downloading from Meta:", error.message);
        if (error.response) console.error("[META RAW ERROR]:", error.response.data);
        return null;
    }
};

exports.receiveMessage = async (req, res) => {
    try {
        let body = req.body;
        
        if (body.object === "whatsapp_business_account" && body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {
            let msgData = body.entry[0].changes[0].value.messages[0];
            let contactData = body.entry[0].changes[0].value.contacts[0];
            let phone = msgData.from; 
            let name = contactData.profile.name || "Unknown"; 
            let metaMsgId = msgData.id; 

            console.log(`\n=== 📨 NEW INCOMING MESSAGE ===`);
            console.log(`[DEBUG] Type: ${msgData.type}, Phone: ${phone}`);

            const existingMessage = await prisma.chatMessage.findFirst({
                where: { metaMessageId: metaMsgId }
            });

            if (existingMessage) return res.status(200).send("EVENT_RECEIVED");

            let metadata = body.entry[0].changes[0].value.metadata;
            let receivingWaNumId = metadata ? metadata.phone_number_id : null;

            const settings = await prisma.crmSettings.findFirst({ 
                where: { waNumId: receivingWaNumId } 
            });

            if (!settings) return res.status(200).send("EVENT_RECEIVED");
            
            let messageText = "";
            let interactiveId = null;
            let isFollowUpReply = false;
            let mediaUrl = null;
            let mediaType = null;

            // 🔥 FIX: HANDLE MEDIA MESSAGES (Images, Audio, Video, Docs, Stickers) 🔥
            if (msgData.type === "image" && msgData.image) {
                console.log(`[DEBUG] Image detected. ID: ${msgData.image.id}`);
                messageText = msgData.image.caption || "Image Message";
                const mediaData = await downloadMetaMedia(msgData.image.id, settings.metaApiKey);
                console.log(`[DEBUG] MediaData Result:`, mediaData);
                if(mediaData) { mediaUrl = mediaData.url; mediaType = mediaData.type; }
            } 
            else if (msgData.type === "audio" && msgData.audio) {
                console.log(`[DEBUG] Audio detected. ID: ${msgData.audio.id}`);
                messageText = "Audio Message (Voice Note)";
                const mediaData = await downloadMetaMedia(msgData.audio.id, settings.metaApiKey);
                console.log(`[DEBUG] MediaData Result:`, mediaData);
                if(mediaData) { mediaUrl = mediaData.url; mediaType = mediaData.type; }
            }
            else if (msgData.type === "video" && msgData.video) {
                console.log(`[DEBUG] Video detected. ID: ${msgData.video.id}`);
                messageText = msgData.video.caption || "Video Message";
                const mediaData = await downloadMetaMedia(msgData.video.id, settings.metaApiKey);
                console.log(`[DEBUG] MediaData Result:`, mediaData);
                if(mediaData) { mediaUrl = mediaData.url; mediaType = mediaData.type; }
            }
            else if (msgData.type === "document" && msgData.document) {
                console.log(`[DEBUG] Document detected. ID: ${msgData.document.id}`);
                messageText = msgData.document.caption || msgData.document.filename || "Document Message";
                const mediaData = await downloadMetaMedia(msgData.document.id, settings.metaApiKey);
                console.log(`[DEBUG] MediaData Result:`, mediaData);
                if(mediaData) { mediaUrl = mediaData.url; mediaType = mediaData.type; }
            }
            else if (msgData.type === "sticker" && msgData.sticker) {
                console.log(`[DEBUG] Sticker detected. ID: ${msgData.sticker.id}`);
                messageText = "Sticker";
                const mediaData = await downloadMetaMedia(msgData.sticker.id, settings.metaApiKey);
                console.log(`[DEBUG] MediaData Result:`, mediaData);
                if(mediaData) { mediaUrl = mediaData.url; mediaType = mediaData.type; }
            }
            else if (msgData.type === "interactive" && msgData.interactive?.type === "button_reply") {
                interactiveId = msgData.interactive.button_reply.id; 
                messageText = msgData.interactive.button_reply.title; 
                if (interactiveId === "FU_YES" || interactiveId === "FU_NO") isFollowUpReply = true;
            } 
            else if (msgData.text) {
                messageText = msgData.text.body;
            }

            let parsedBatchId = settings.batchId ? parseInt(settings.batchId) : null;
            let dbPhone = `${phone}_BIZ_${settings.businessId}`;
            if (parsedBatchId) dbPhone += `_BATCH_${parsedBatchId}`;


            if (settings.campaignType === 'AFTER_SEMINAR') {
                const msgLower = messageText.toLowerCase().trim();
                const isOpenSeminar = msgLower.includes('open seminar');
                const isYesMsg = msgLower === 'yes';

                let currentLead = await prisma.lead.findUnique({ where: { phone: dbPhone } });
                let detInquiryType = currentLead?.inquiryType || 'NEW_INQ'; 

                if (isOpenSeminar) {
                    detInquiryType = 'OPEN_SEMINAR';
                } else if (isYesMsg) {
                    detInquiryType = 'NORMAL';
                }

                let createDataAfterSeminar = { 
                    name: name, phone: dbPhone, source: 'whatsapp', campaignType: 'AFTER_SEMINAR', 
                    lastMessage: messageText || 'Received Media', unreadCount: 1, status: 'NEW', 
                    phase: 1, callStatus: 'pending', paymentIntention: 'NOT_DECIDED', 
                    enrollmentStatus: 'NON_ENROLLED', inquiryType: detInquiryType, 
                    newInqTimestamp: (!isYesMsg && detInquiryType === 'NEW_INQ') ? new Date() : null
                };

                if (parsedBatchId) createDataAfterSeminar.batch = { connect: { id: parsedBatchId } };

                let existingLead = await prisma.lead.upsert({
                    where: { phone: dbPhone },
                    update: { 
                        name: name, 
                        lastMessage: messageText || 'Received Media', 
                        unreadCount: { increment: 1 }, 
                        status: 'OPEN', 
                        updatedAt: new Date(),
                        inquiryType: detInquiryType, 
                        newInqTimestamp: (!isYesMsg && detInquiryType === 'NEW_INQ') ? new Date() : undefined
                    },
                    create: createDataAfterSeminar
                });

                console.log(`[DEBUG] Saving ChatMessage to DB...`);
                console.log(`[DEBUG] Final DB Media Values -> URL: ${mediaUrl} | Type: ${mediaType}`);

                await prisma.chatMessage.create({ 
                    data: { 
                        leadId: existingLead.id, 
                        message: messageText, 
                        mediaUrl: mediaUrl, 
                        mediaType: mediaType, 
                        direction: 'inbound', 
                        senderType: 'USER', 
                        senderName: name, 
                        metaMessageId: metaMsgId 
                    } 
                });
                console.log(`[DEBUG] Message Saved Successfully! ✅\n`);
                return res.status(200).send("EVENT_RECEIVED");
            }

            if (settings.campaignType === 'FREE_SEMINAR') {
                const isRestartCommand = ['hi', 'hello', 'hey', 'menu', 'start'].includes(messageText.toLowerCase().trim());
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

                existingLead = await prisma.lead.upsert({
                    where: { phone: dbPhone },
                    update: { name: name, lastMessage: messageText || 'Received Media', unreadCount: { increment: 1 }, status: existingLead?.assignedTo ? 'OPEN' : 'NEW', updatedAt: new Date(), ...resetData },
                    create: createDataFreeSeminar
                });

                await prisma.chatMessage.create({ 
                    data: { 
                        leadId: existingLead.id, 
                        message: messageText, 
                        mediaUrl: mediaUrl, 
                        mediaType: mediaType, 
                        direction: 'inbound', 
                        senderType: 'USER', 
                        senderName: name, 
                        metaMessageId: metaMsgId 
                    } 
                });

                const botAllowed = (settings?.botMode === 'ON' || settings?.botMode === 'AUTO_REPLY_ONLY');
                if (botAllowed && !existingLead.sequenceCompleted && !isSpamming && !isFollowUpReply) {
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
                            } catch (sendErr) { console.error("Auto Reply Error"); }
                        }
                    }
                }
                return res.status(200).send("EVENT_RECEIVED");
            }
        }
        res.status(200).send("EVENT_RECEIVED");
    } catch (error) { 
        console.error("CRITICAL WEBHOOK ERROR:", error);
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
// 7. CRM CHAT MESSAGES
// ==========================================
// ... (getMessages eka ehemma thiyanna)

exports.sendMessage = async (req, res) => {
    try {
        const { leadId, message, senderName, replyToMetaId, localUIMessage } = req.body; 
        const lead = await prisma.lead.findUnique({ where: { id: parseInt(leadId) } });
        if (!lead) return res.status(404).json({ error: "Lead not found" });
        
        // 🔥 EXTRACT REAL PHONE AND BUSINESS ID 🔥
        let formattedPhone = lead.phone.split('_')[0].replace(/[^0-9]/g, ''); 
        if (formattedPhone.startsWith('0')) formattedPhone = '94' + formattedPhone.substring(1);

        // Phone string eken Business ID eka gannawa (eg: 0712345678_BIZ_1 -> 1)
        const bizMatch = lead.phone.match(/_BIZ_(\d+)/);
        const extractedBizId = bizMatch ? parseInt(bizMatch[1]) : null;

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
            
            // Hari CRM Settings ganna eka (Extracted Business ID or Batch ID use karala)
            if (extractedBizId) {
                settings = await prisma.crmSettings.findFirst({ 
                    where: { businessId: extractedBizId, campaignType: lead.campaignType || 'AFTER_SEMINAR' } 
                });
            } else if (lead.batchId) {
                const batchRecord = await prisma.batch.findUnique({ where: { id: lead.batchId } });
                if (batchRecord) settings = await prisma.crmSettings.findFirst({ where: { businessId: batchRecord.businessId, campaignType: lead.campaignType || 'AFTER_SEMINAR' } });
            } else {
                settings = await prisma.crmSettings.findFirst({ where: { campaignType: lead.campaignType || 'AFTER_SEMINAR' } });
            }

            if (settings && settings.metaApiKey && settings.waNumId) {
                let metaPayload = { messaging_product: "whatsapp", recipient_type: "individual", to: formattedPhone };
                if (replyToMetaId && replyToMetaId !== 'null' && replyToMetaId !== 'undefined') metaPayload.context = { message_id: replyToMetaId };

                if (message && !mediaUrl) {
                    metaPayload.type = "text"; metaPayload.text = { preview_url: false, body: message };
                } else if (mediaUrl) {
                    const liveMediaUrl = `https://imacampus.online${mediaUrl}`; 
                    const isAudio = mediaType.includes('audio') || mediaUrl.toLowerCase().endsWith('.mp3') || mediaUrl.toLowerCase().endsWith('.ogg') || mediaUrl.toLowerCase().endsWith('.wav') || mediaType.includes('ogg');

                    if (mediaType.includes('image') && !isAudio) { 
                        let imgPayload = { ...basePayload, type: "image", image: { link: liveMediaUrl, caption: message || "" } };
                        metaPayload = imgPayload;
                    } 
                    else if (isAudio) { 
                        let audioPayload = { ...basePayload, type: "audio", audio: { link: liveMediaUrl } };
                        metaPayload = audioPayload;
                    } 
                    else if (mediaType.includes('video')) { 
                        let vidPayload = { ...basePayload, type: "video", video: { link: liveMediaUrl, caption: message || "" } };
                        metaPayload = vidPayload;
                    } 
                    else { 
                        let docPayload = { ...basePayload, type: "document", document: { link: liveMediaUrl, caption: message || "", filename: req.file ? req.file.originalname : "document.pdf" } };
                        metaPayload = docPayload;
                    }
                }

                const axios = require('axios');
                console.log(`[DEBUG] Outbound message trigger to Meta for ${formattedPhone}...`);
                const metaRes = await axios.post(`https://graph.facebook.com/v19.0/${settings.waNumId}/messages`, metaPayload, { headers: { 'Authorization': `Bearer ${settings.metaApiKey}`, 'Content-Type': 'application/json' } });
                
                if (metaRes.data?.messages?.[0]?.id) {
                    await prisma.chatMessage.update({ where: { id: newMsg.id }, data: { metaMessageId: metaRes.data.messages[0].id } });
                    console.log(`[DEBUG] Meta Send Success! MsgID: ${metaRes.data.messages[0].id}`);
                }
            } else {
                console.log(`[ERROR] Send Failed: No Meta Settings found for Biz ID ${extractedBizId}`);
            }
        } catch (metaError) { 
            // 🔥 SILENT CATCH EKA AIN KALA. DAN META ERROR EKA PRINT WEI 🔥
            console.error("\n[META API ERROR in sendMessage]:", metaError.response?.data || metaError.message); 
        }
        res.status(201).json(newMsg);
    } catch (error) { 
        console.error("\n[SYSTEM ERROR in sendMessage]:", error);
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
            if (batchRecord) settings = await prisma.crmSettings.findFirst({ where: { businessId: batchRecord.businessId, campaignType: lead.campaignType } });
        } else {
            settings = await prisma.crmSettings.findFirst({ where: { campaignType: lead.campaignType } });
        }

        if (settings && settings.metaApiKey && settings.waNumId) {
            const axios = require('axios');
            await axios.post(`https://graph.facebook.com/v19.0/${settings.waNumId}/messages`, { messaging_product: "whatsapp", recipient_type: "individual", to: formattedPhone, type: "reaction", reaction: { message_id: metaMessageId, emoji: emoji } }, { headers: { 'Authorization': `Bearer ${settings.metaApiKey}` } });
            res.status(200).json({ success: true });
        }
    } catch (error) { res.status(500).json({ error: "Failed to send reaction" }); }
};

exports.sendBroadcast = async (req, res) => {
    try {
        const { leadIds, type, message, templateName } = req.body;
        const parsedLeadIds = typeof leadIds === 'string' ? JSON.parse(leadIds) : leadIds;
        const leads = await prisma.lead.findMany({ where: { id: { in: parsedLeadIds } } });
        const settings = await prisma.crmSettings.findFirst({ where: { campaignType: 'AFTER_SEMINAR' } });

        if (!settings?.metaApiKey) return res.status(400).json({ error: "Meta Config Missing" });

        let mediaUrl = null; let mediaType = null;
        if (req.file) { mediaUrl = `/storage/documents/${req.file.filename}`; mediaType = req.file.mimetype; }

        let results = { success: 0, failed: 0, reasons: [] };
        const axios = require('axios');

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

exports.updateLeadBatch = async (req, res) => {
    try {
        const { leadId, batchId } = req.body;
        await prisma.lead.update({
            where: { id: parseInt(leadId) },
            data: { batchId: batchId ? parseInt(batchId) : null }
        });
        res.status(200).json({ success: true, message: "Batch Updated!" });
    } catch (error) { 
        res.status(500).json({ error: "Failed to update batch" }); 
    }
};

// ==========================================
// 8. MONTHLY RESET CRON JOB
// ==========================================
let lastResetMonth = -1;
const runMonthlyInstallmentReset = async () => {
    const today = new Date();
    if (today.getDate() === 1 && today.getMonth() !== lastResetMonth) {
        try {
            await prisma.lead.updateMany({
                where: { campaignType: 'AFTER_SEMINAR', paymentIntention: { in: ['MONTHLY', 'INSTALLMENT'] }, enrollmentStatus: 'ENROLLED' },
                data: { enrollmentStatus: 'NON_ENROLLED' }
            });
            lastResetMonth = today.getMonth();
        } catch(e) {}
    }
};
setInterval(runMonthlyInstallmentReset, 60 * 60 * 1000);


//New Inquaries
// crmController.js ekata yatinma meka add karanna
exports.revertDeletedRound = async (req, res) => {
    try {
        const { roundToDelete, targetRound, inquiryType } = req.body;
        
        // Delete karana round eke inna leads tika, aayeth Default Round ekata (1st) genawa
        await prisma.lead.updateMany({
            where: { 
                coordinationRound: parseInt(roundToDelete),
                inquiryType: inquiryType
            },
            data: { 
                coordinationRound: parseInt(targetRound),
                // isLocked: false, // Oninam unlock karannath puluwan
            }
        });

        res.status(200).json({ message: "Leads reverted back to default round successfully" });
    } catch (error) {
        console.error("Revert round error:", error);
        res.status(500).json({ error: "Failed to revert leads" });
    }
};