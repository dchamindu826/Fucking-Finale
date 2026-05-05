const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ============================================================================
// 1. GET PENDING BRIDGE LEADS (Free Seminar එකේ ඉන්න, After එකේ නැති අය)
// ============================================================================
exports.getPendingBridgeLeads = async (req, res) => {
    try {
        const { businessId, batchId } = req.query;

        if (!businessId) {
            return res.status(400).json({ error: "Business ID is required." });
        }

        let freeWhere = {
            campaignType: 'FREE_SEMINAR',
            OR: [
                { phone: { endsWith: `_BIZ_${businessId}` } },
                { phone: { contains: `_BIZ_${businessId}_` } }
            ]
        };

        // Batch එකක් තෝරලා තියෙනවා නම් විතරක් ඒකෙන් Filter කරනවා
        if (batchId && batchId !== '') {
            freeWhere.batchId = parseInt(batchId);
        }

        // 1. Free Seminar එකේ ඉන්න ඔක්කොම Leads ලා ගන්නවා
        const freeSeminarLeads = await prisma.lead.findMany({
            where: freeWhere,
            select: { id: true, name: true, phone: true, status: true, createdAt: true }
        });

        // 2. After Seminar එකේ දැනටමත් ඉන්න Leads ලා ගන්නවා
        const afterSeminarLeads = await prisma.lead.findMany({
            where: {
                campaignType: 'AFTER_SEMINAR',
                OR: [
                    { phone: { endsWith: `_BIZ_${businessId}` } },
                    { phone: { contains: `_BIZ_${businessId}_` } }
                ]
            },
            select: { phone: true }
        });

        const afterSeminarPhones = new Set(
            afterSeminarLeads.map(l => l.phone.split('_')[0].replace(/[^0-9]/g, ''))
        );

        // 3. Free Seminar එකේ ඉන්න, හැබැයි After Seminar එකේ නැති අයව Filter කරනවා
        const pendingBridgeLeads = freeSeminarLeads.filter(lead => {
            const basePhone = lead.phone.split('_')[0].replace(/[^0-9]/g, '');
            return !afterSeminarPhones.has(basePhone);
        });

        const cleanedLeads = pendingBridgeLeads.map(l => ({
            id: l.id,
            name: l.name || 'Unknown',
            phone: l.phone.split('_')[0],
            status: l.status,
            createdAt: l.createdAt
        }));

        res.status(200).json({
            success: true,
            totalPending: cleanedLeads.length,
            leads: cleanedLeads
        });

    } catch (error) {
        console.error("Bridge Leads Fetch Error:", error);
        res.status(500).json({ error: "Failed to fetch pending bridge leads." });
    }
};

// ============================================================================
// 2. PUSH TO AFTER SEMINAR CAMPAIGN 
// ============================================================================
exports.pushToAfterSeminar = async (req, res) => {
    try {
        const { leadIds, businessId, batchId, staffId } = req.body;

        if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
            return res.status(400).json({ error: "No leads selected to push." });
        }

        const selectedFreeLeads = await prisma.lead.findMany({
            where: { id: { in: leadIds } }
        });

        let pushedCount = 0;

        for (const freeLead of selectedFreeLeads) {
            const basePhone = freeLead.phone.split('_')[0].replace(/[^0-9]/g, '');
            const targetBatchId = batchId || freeLead.batchId;
            
            const afterSeminarPhone = targetBatchId 
                ? `${basePhone}_BIZ_${businessId}_BATCH_${targetBatchId}_AS`
                : `${basePhone}_BIZ_${businessId}_AS`;

            await prisma.lead.upsert({
                where: { phone: afterSeminarPhone },
                update: {
                    assignedTo: staffId ? parseInt(staffId) : null,
                    status: staffId ? 'OPEN' : 'NEW',
                },
                create: {
                    name: freeLead.name,
                    phone: afterSeminarPhone,
                    source: 'bridge_transfer',
                    campaignType: 'AFTER_SEMINAR',
                    batchId: targetBatchId ? parseInt(targetBatchId) : null,
                    assignedTo: staffId ? parseInt(staffId) : null,
                    status: staffId ? 'OPEN' : 'NEW',
                    phase: 1, 
                    callStatus: 'pending',
                    coordinationRound: 1, 
                    paymentIntention: 'NOT_DECIDED',
                    enrollmentStatus: 'NON_ENROLLED',
                    inquiryType: 'NORMAL'
                }
            });

            pushedCount++;
        }

        res.status(200).json({
            success: true,
            message: `Successfully pushed ${pushedCount} leads to After Seminar!`,
            pushedCount
        });

    } catch (error) {
        console.error("Push to After Seminar Error:", error);
        res.status(500).json({ error: "Failed to push leads." });
    }
};