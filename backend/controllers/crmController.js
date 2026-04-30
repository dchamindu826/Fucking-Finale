const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const pdfParse = require('pdf-parse'); 

// ==========================================
// 1. SETTINGS: CrmSettings
// ==========================================
exports.saveCrmSettings = async (req, res) => {
    try {
        const { businessId, campaignType, metaApiKey, waId, waNumId, geminiKeys, botMode, batchId } = req.body;
        
        // Ensure businessId is an integer and campaignType exists
        if (!businessId || !campaignType) {
            return res.status(400).json({ error: "Missing businessId or campaignType" });
        }

        const existing = await prisma.crmSettings.findFirst({
            where: { 
                businessId: parseInt(businessId), 
                campaignType: campaignType 
            }
        });

        // Safe conversion of data
        const settingsData = {
            metaApiKey: metaApiKey || null,
            waId: waId || null,
            waNumId: waNumId || null,
            geminiKeys: geminiKeys || [], 
            botMode: botMode || 'OFF',
            batchId: batchId ? String(batchId) : null
        };

        if (existing) {
            const updated = await prisma.crmSettings.update({
                where: { id: existing.id },
                data: settingsData
            });
            return res.status(200).json({ message: "Settings updated", data: updated });
        } else {
            const created = await prisma.crmSettings.create({
                data: { 
                    businessId: parseInt(businessId), 
                    campaignType: campaignType, 
                    ...settingsData 
                }
            });
            return res.status(201).json({ message: "Settings saved", data: created });
        }
    } catch (error) {
        console.error("Save settings error:", error);
        res.status(500).json({ error: "Failed to save settings", details: error.message });
    }
};

exports.getCrmSettings = async (req, res) => {
    try {
        const { businessId, campaignType } = req.params;
        const settings = await prisma.crmSettings.findFirst({
            where: { 
                businessId: parseInt(businessId), 
                campaignType: campaignType 
            }
        });
        res.status(200).json(settings || {});
    } catch (error) {
        console.error("Get settings error:", error);
        res.status(500).json({ error: "Failed to get settings" });
    }
};

// ==========================================
// 2. KNOWLEDGE BASE: KnowledgeBase (AI Training)
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
                businessId: parseInt(businessId),
                campaignType: campaignType || 'FREE_SEMINAR',
                fileName: file.originalname,
                fileUrl: `/storage/documents/${file.filename}`,
                content: data.text
            }
        });

        res.status(201).json({ message: "Knowledge base updated successfully", data: newKB });
    } catch (error) {
        console.error("Upload KB error:", error);
        res.status(500).json({ error: "Failed to upload knowledge base" });
    }
};

// ==========================================
// 3. AUTO REPLIES: Message Sequence
// ==========================================
exports.addAutoReply = async (req, res) => {
    try {
        console.log("--- DEBUG: ADD AUTO REPLY ---");
        console.log("Body:", req.body);
        console.log("File:", req.file);

        const { businessId, campaignType, stepOrder, message } = req.body;
        const file = req.file;

        let attachmentUrl = null;
        let attachmentType = null;
        
        if (file) {
            attachmentUrl = `/storage/documents/${file.filename}`;
            
            // 🔥 UPDATE: Video එක අඳුරගන්න කොටස 🔥
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
                businessId: parseInt(businessId),
                campaignType: campaignType || 'FREE_SEMINAR',
                stepOrder: parseInt(stepOrder) || 1,
                message: message || '',
                attachment: attachmentUrl,
                attachmentType: attachmentType
            }
        });

        res.status(201).json({ message: "Auto reply added successfully", data: newTemplate });
    } catch (error) {
        console.error("Add reply error:", error);
        res.status(500).json({ error: "Failed to add auto reply", details: error.message });
    }
};

exports.getAutoReplies = async (req, res) => {
    try {
        const { businessId, campaignType } = req.query;
        let whereClause = {};
        if (businessId) whereClause.businessId = parseInt(businessId);
        if (campaignType) whereClause.campaignType = campaignType;

        const replies = await prisma.autoReply.findMany({
            where: whereClause,
            orderBy: { stepOrder: 'asc' } 
        });

        res.status(200).json(replies);
    } catch (error) {
        console.error("Get replies error:", error);
        res.status(500).json({ error: "Failed to get auto replies" });
    }
};

exports.deleteAutoReply = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.autoReply.delete({
            where: { id: parseInt(id) }
        });
        res.status(200).json({ message: "Auto reply deleted" });
    } catch (error) {
        console.error("Delete reply error:", error);
        res.status(500).json({ error: "Failed to delete auto reply" });
    }
};

// ==========================================
// 4. CAMPAIGN ARCHIVE
// ==========================================
exports.archiveCampaign = async (req, res) => {
    try {
        const { businessId, campaignType } = req.body;

        try {
            await prisma.lead.updateMany({
                where: { businessId: parseInt(businessId), campaignType, status: { not: 'ARCHIVED' } },
                data: { status: 'ARCHIVED' }
            });
        } catch (e) {
            console.log("No lead table found to archive. Skipping lead update.");
        }

        res.status(200).json({ message: "Campaign archived successfully." });
    } catch (error) {
        console.error("Archive error:", error);
        res.status(500).json({ error: "Failed to archive campaign" });
    }
};