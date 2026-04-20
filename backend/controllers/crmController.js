const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse'); // For PDF reading

// ==========================================
// 1. SETTINGS: CrmSettings
// ==========================================
exports.saveCrmSettings = async (req, res) => {
    try {
        const { businessId, campaignType, customPrompts, autoReplyMode, autoResponderActive } = req.body;
        
        const existing = await prisma.crmSettings.findFirst({
            where: { businessId: parseInt(businessId), campaignType }
        });

        if (existing) {
            const updated = await prisma.crmSettings.update({
                where: { id: existing.id },
                data: { customPrompts, autoReplyMode, autoResponderActive }
            });
            return res.status(200).json({ message: "Settings updated", data: updated });
        } else {
            const created = await prisma.crmSettings.create({
                data: { businessId: parseInt(businessId), campaignType, customPrompts, autoReplyMode, autoResponderActive }
            });
            return res.status(201).json({ message: "Settings saved", data: created });
        }
    } catch (error) {
        res.status(500).json({ error: "Failed to save settings" });
    }
};

exports.getCrmSettings = async (req, res) => {
    try {
        const { businessId, campaignType } = req.params;
        const settings = await prisma.crmSettings.findFirst({
            where: { businessId: parseInt(businessId), campaignType }
        });
        res.status(200).json(settings || {});
    } catch (error) {
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

        if (!file) {
            return res.status(400).json({ error: "PDF file is required" });
        }

        // PDF එක කියවලා Text එක ගන්නවා
        const dataBuffer = fs.readFileSync(file.path);
        const data = await pdfParse(dataBuffer);
        const extractedText = data.text;

        const newKB = await prisma.knowledgeBase.create({
            data: {
                businessId: parseInt(businessId),
                campaignType,
                fileName: file.originalname,
                fileUrl: `/storage/documents/${file.filename}`,
                content: extractedText
            }
        });

        res.status(201).json({ message: "Knowledge base updated successfully", data: newKB });
    } catch (error) {
        res.status(500).json({ error: "Failed to upload knowledge base" });
    }
};

// ==========================================
// 3. CAMPAIGN ARCHIVE:
// ==========================================
exports.archiveCampaign = async (req, res) => {
    try {
        const { businessId, campaignType } = req.body;

        // මෙතනදී අපි පරණ Leads ටික Status='ARCHIVED' කරනවා
        await prisma.lead.updateMany({
            where: { businessId: parseInt(businessId), campaignType, status: { not: 'ARCHIVED' } },
            data: { status: 'ARCHIVED' }
        });

        res.status(200).json({ message: "Campaign archived successfully. Ready for new batch." });
    } catch (error) {
        res.status(500).json({ error: "Failed to archive campaign" });
    }
};

// ==========================================
// 4. AUTO REPLIES: MessageTemplate
// ==========================================
exports.addAutoReply = async (req, res) => {
    try {
        const { businessId, campaignType, triggerKeyword, messageBody, isExactMatch } = req.body;
        const file = req.file;

        let attachmentUrl = null;
        if (file) {
            attachmentUrl = `/storage/documents/${file.filename}`;
        }

        const newTemplate = await prisma.messageTemplate.create({
            data: {
                businessId: parseInt(businessId),
                campaignType,
                triggerKeyword,
                messageBody,
                attachmentUrl,
                isExactMatch: isExactMatch === 'true'
            }
        });

        res.status(201).json({ message: "Auto reply added successfully", data: newTemplate });
    } catch (error) {
        res.status(500).json({ error: "Failed to add auto reply" });
    }
};

exports.getAutoReplies = async (req, res) => {
    try {
        const { businessId, campaignType } = req.query;
        let whereClause = {};
        if (businessId) whereClause.businessId = parseInt(businessId);
        if (campaignType) whereClause.campaignType = campaignType;

        const replies = await prisma.messageTemplate.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' }
        });

        res.status(200).json(replies);
    } catch (error) {
        res.status(500).json({ error: "Failed to get auto replies" });
    }
};

exports.deleteAutoReply = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.messageTemplate.delete({
            where: { id: parseInt(id) }
        });
        res.status(200).json({ message: "Auto reply deleted" });
    } catch (error) {
        res.status(500).json({ error: "Failed to delete auto reply" });
    }
};

// ==========================================
// DUMMY FUNCTIONS (To Prevent Routing Errors)
// ==========================================
// මේ ටික මම අලුතින් එකතු කලේ ඔයාගේ Routes වලට අදාල Functions මිස් වෙලා නම් සර්වර් එක Crash වෙන එක නවත්තන්න.

exports.getMessages = async (req, res) => {
    res.status(200).json([]);
};

exports.sendMessage = async (req, res) => {
    res.status(201).json({ message: "Dummy message sent" });
};