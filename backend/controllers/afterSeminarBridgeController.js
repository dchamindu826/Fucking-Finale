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

        // 🔥 FIX 1: හරියටම BIZ ID එක වෙන් කරගන්න Regex එකක් හදනවා.
        // උදා: _BIZ_1 ආවොත්, ඒක _BIZ_1_ වලින් හරි _BIZ_1 වලින් හරි ඉවර වෙන්නම ඕනේ. (11, 21 අහු වෙන්නේ නෑ)
        const exactBizRegex = new RegExp(`_BIZ_${businessId}(_|$)`);

        // 1. DB එකෙන් දළ වශයෙන් BIZ ID එක තියෙන ඔක්කොම ගන්නවා
        const freeRaw = await prisma.lead.findMany({
            where: {
                campaignType: 'FREE_SEMINAR',
                phone: { contains: `_BIZ_${businessId}` }
            },
            select: { id: true, name: true, phone: true, status: true, createdAt: true, batchId: true }
        });

        // ඊට පස්සේ හරියටම අදාල Business එකේ අය විතරක් JS වලින් Filter කරනවා
        let freeSeminarLeads = freeRaw.filter(l => exactBizRegex.test(l.phone));

        // Batch එකක් දීලා තියෙනවනම් ඒකත් Filter කරනවා
        if (batchId && batchId !== '') {
            const targetBatchId = parseInt(batchId);
            freeSeminarLeads = freeSeminarLeads.filter(l => 
                l.batchId === targetBatchId || l.phone.includes(`_BATCH_${targetBatchId}`)
            );
        }

        // 2. After Seminar එකෙත් දළ වශයෙන් BIZ ID එක තියෙන ඔක්කොම ගන්නවා
        const afterRaw = await prisma.lead.findMany({
            where: {
                campaignType: 'AFTER_SEMINAR',
                phone: { contains: `_BIZ_${businessId}` }
            },
            select: { phone: true }
        });

        // අදාල Business එකේ After Seminar අය විතරක් හරියටම වෙන් කරගන්නවා
        const afterSeminarLeads = afterRaw.filter(l => exactBizRegex.test(l.phone));

        // 3. 07 සහ 94 අවුල මගාරින්න අන්තිම ඉලක්කම් 9 පමණක් අරගෙන Set එකක් හදනවා
        const afterSeminarPhones = new Set(
            afterSeminarLeads.map(l => {
                const base = l.phone.split('_')[0].replace(/[^0-9]/g, '');
                return base.length >= 9 ? base.slice(-9) : base; // Ex: 706103027
            })
        );

        // 4. Free Seminar එකේ ඉන්න, හැබැයි After Seminar එකේ නැති අයව Filter කරනවා
        const pendingBridgeLeads = freeSeminarLeads.filter(lead => {
            const basePhone = lead.phone.split('_')[0].replace(/[^0-9]/g, '');
            const shortPhone = basePhone.length >= 9 ? basePhone.slice(-9) : basePhone;
            
            // අන්තිම ඉලක්කම් 9 After Seminar එකේ තියෙනවද බලනවා
            return !afterSeminarPhones.has(shortPhone);
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

// ============================================================================
// 3. REVERT PENDING BRIDGE LEADS (තාම කතා කරපු නැති අයව ආපහු Bridge එකටම ගන්න)
// ============================================================================
exports.revertPendingBridgeLeads = async (req, res) => {
    try {
        const { businessId, batchId } = req.body;

        if (!businessId) {
            return res.status(400).json({ error: "Business ID is required." });
        }

        // හරියටම BIZ ID එක වෙන් කරගන්න Regex එකක් 
        const exactBizRegex = new RegExp(`_BIZ_${businessId}(_|$)`);

        // 1. මේ Business එකට අදාලව, Bridge එකෙන් ආපු, තාම pending තියෙන leads ටික ගන්නවා
        const pendingLeadsRaw = await prisma.lead.findMany({
            where: {
                campaignType: 'AFTER_SEMINAR',
                source: 'bridge_transfer',
                callStatus: 'pending', // කතා කරපු නැති අය පමණයි
                enrollmentStatus: 'NON_ENROLLED'
            },
            select: { id: true, phone: true }
        });

        // 2. වෙනත් Business වල අය අයින් නොකර, මේ Business එකේ අය විතරක් හරියටම filter කරනවා
        const leadsToRevert = pendingLeadsRaw.filter(l => exactBizRegex.test(l.phone));

        // Batch එකක් දීලා තියෙනවනම් ඒකත් Filter කරනවා
        let finalLeadsToRevert = leadsToRevert;
        if (batchId && batchId !== '') {
            const targetBatchId = parseInt(batchId);
            finalLeadsToRevert = leadsToRevert.filter(l => l.phone.includes(`_BATCH_${targetBatchId}`));
        }

        const leadIdsToDelete = finalLeadsToRevert.map(l => l.id);

        if (leadIdsToDelete.length === 0) {
            return res.status(200).json({ 
                success: true, 
                message: "No pending assigned leads found to revert.", 
                count: 0 
            });
        }

        // 3. ඒ Leads ටික After Seminar එකෙන් මකනවා. (එතකොට getPendingBridgeLeads එකෙන් ආයෙමත් පෙන්නනවා)
        await prisma.lead.deleteMany({
            where: { id: { in: leadIdsToDelete } }
        });

        res.status(200).json({
            success: true,
            message: `Successfully reverted ${leadIdsToDelete.length} pending leads back to the Bridge pool.`,
            count: leadIdsToDelete.length
        });

    } catch (error) {
        console.error("Revert Pending Bridge Leads Error:", error);
        res.status(500).json({ error: "Failed to revert pending leads." });
    }
};