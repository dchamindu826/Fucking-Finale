const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 🔥 HELPER FUNCTION (උඩටම ගත්තා හැමතැනම පාවිච්චි කරන්න ලේසි වෙන්න)
const buildStatsWhereClause = (businessId, batchId, startDate, endDate, baseConditions = {}) => {
    let whereClause = { ...baseConditions };

    if (batchId && batchId !== '' && batchId !== 'ALL') {
        whereClause.batchId = parseInt(batchId);
    } else if (businessId && businessId !== '' && businessId !== 'ALL') {
        whereClause.OR = [
            { phone: { endsWith: `_BIZ_${businessId}` } },
            { phone: { endsWith: `_BIZ_${businessId}_AS` } },
            { phone: { contains: `_BIZ_${businessId}_BATCH_` } }
        ];
    }

    if (startDate && endDate) {
        whereClause.updatedAt = {
            gte: new Date(`${startDate}T00:00:00.000Z`),
            lte: new Date(`${endDate}T23:59:59.999Z`)
        };
    }
    return whereClause;
};

// ============================================================================
// 1. GET RETENTION DASHBOARD STATS (Cards 4ට සහ Chart එකට Data යැවීම)
// ============================================================================
exports.getRetentionDashboardStats = async (req, res) => {
    try {
        const { businessId, batchId } = req.query;

        // Helper එක පාවිච්චි කරලා filter කිරීම
        let whereClause = buildStatsWhereClause(businessId, batchId, null, null, { 
            campaignType: 'AFTER_SEMINAR' 
        });

        // 1. දැනට ඉන්න ළමයින්ගේ ගණන් ගැනීම (Top Cards 4 සඳහා)
        const leads = await prisma.lead.findMany({
            where: whereClause,
            select: { paymentIntention: true, enrollmentStatus: true }
        });

        let stats = {
            fullEnrolled: 0,
            monthlyEnrolled: 0,
            installmentEnrolled: 0,
            nonEnrolled: 0
        };

        leads.forEach(l => {
            if (l.enrollmentStatus === 'ENROLLED') {
                if (l.paymentIntention === 'FULL') stats.fullEnrolled++;
                else if (l.paymentIntention === 'MONTHLY') stats.monthlyEnrolled++;
                else if (l.paymentIntention === 'INSTALLMENT') stats.installmentEnrolled++;
            } else {
                stats.nonEnrolled++;
            }
        });

        // 2. මාසික Chart එකට Data ගැනීම (අපි අලුතෙන් හැදූ BatchMonthlyStats ටේබල් එකෙන්)
        let chartWhere = {};
        if (batchId && batchId !== '' && batchId !== 'ALL') {
            chartWhere.batchId = parseInt(batchId);
        } else if (businessId && businessId !== '' && businessId !== 'ALL') {
            const bizBatches = await prisma.batch.findMany({ where: { businessId: parseInt(businessId) }});
            chartWhere.batchId = { in: bizBatches.map(b => b.id) };
        }

        const monthlyHistory = await prisma.batchMonthlyStats.findMany({
            where: chartWhere,
            orderBy: { recordMonth: 'asc' } // පරණ මාසේ ඉඳන් අලුත් මාසෙට
        });

        res.status(200).json({
            success: true,
            currentStats: stats,
            chartData: monthlyHistory
        });

    } catch (error) {
        console.error("Retention Stats Error:", error);
        res.status(500).json({ error: "Failed to fetch retention stats." });
    }
};

// ============================================================================
// 2. GET RETENTION LEADS (Tabs 4 සඳහා - FULL, MONTHLY, INSTALLMENT, NON-ENROLLED)
// ============================================================================
exports.getRetentionLeads = async (req, res) => {
    try {
        const { businessId, batchId, tab } = req.query; // tab = 'FULL' | 'MONTHLY' | 'INSTALLMENT' | 'NON_ENROLLED'

        // Helper එක පාවිච්චි කරලා filter කිරීම
        let baseConditions = { campaignType: 'AFTER_SEMINAR' };
        
        // Tab එක අනුව Filter කිරීම
        if (tab === 'NON_ENROLLED') {
            baseConditions.enrollmentStatus = 'NON_ENROLLED';
        } else {
            baseConditions.enrollmentStatus = 'ENROLLED';
            baseConditions.paymentIntention = tab; // FULL, MONTHLY, or INSTALLMENT
        }

        let whereClause = buildStatsWhereClause(businessId, batchId, null, null, baseConditions);

        const leads = await prisma.lead.findMany({
            where: whereClause,
            orderBy: { updatedAt: 'desc' },
            include: { assignedUser: { select: { firstName: true, lastName: true } } }
        });

        // Phone number එක පිරිසිදු කරලා යවනවා
        const cleanedLeads = leads.map(l => ({
            ...l,
            phone: l.phone.split('_')[0]
        }));

        res.status(200).json({ success: true, leads: cleanedLeads });

    } catch (error) {
        console.error("Retention Leads Error:", error);
        res.status(500).json({ error: "Failed to fetch retention leads." });
    }
};

// ============================================================================
// 3. THE MONTHLY ENGINE (Cron Job) - හැම මාසෙම 1 වෙනිදා වැඩ කරන ලොජික් එක
// ============================================================================
exports.runMonthlyRetentionReset = async () => {
    try {
        const today = new Date();
        const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`; 
        const prevMonthStr = today.getMonth() === 0 
            ? `${today.getFullYear() - 1}-12` 
            : `${today.getFullYear()}-${String(today.getMonth()).padStart(2, '0')}`;

        console.log(`[RETENTION ENGINE] Starting monthly reset for ${currentMonthStr}...`);

        // 1. Batch ඔක්කොම ගන්නවා
        const allBatches = await prisma.batch.findMany({ select: { id: true } });

        for (const batch of allBatches) {
            // ඒ Batch එකේ MONTHLY & INSTALLMENT Enrolled ළමයි ගන්නවා
            const activeLeads = await prisma.lead.findMany({
                where: {
                    batchId: batch.id,
                    campaignType: 'AFTER_SEMINAR',
                    enrollmentStatus: 'ENROLLED',
                    paymentIntention: { in: ['MONTHLY', 'INSTALLMENT'] }
                }
            });

            const fullLeadsCount = await prisma.lead.count({
                where: { batchId: batch.id, campaignType: 'AFTER_SEMINAR', enrollmentStatus: 'ENROLLED', paymentIntention: 'FULL' }
            });
            
            const monthlyCount = activeLeads.filter(l => l.paymentIntention === 'MONTHLY').length;
            const installCount = activeLeads.filter(l => l.paymentIntention === 'INSTALLMENT').length;

            // 2. BatchMonthlyStats ටේබල් එකට ගිය මාසේ අගයන් සේව් කරනවා (Chart එකට)
            await prisma.batchMonthlyStats.create({
                data: {
                    batchId: batch.id,
                    recordMonth: prevMonthStr,
                    totalEnrolled: fullLeadsCount + monthlyCount + installCount,
                    fullCount: fullLeadsCount,
                    monthlyCount: monthlyCount,
                    installCount: installCount,
                    droppedCount: 0, 
                    upgradedCount: 0 
                }
            });

            // 3. MONTHLY & INSTALLMENT අයව NON_ENROLLED කරලා Call Phase 1 කරනවා
            if (activeLeads.length > 0) {
                const leadIds = activeLeads.map(l => l.id);
                await prisma.lead.updateMany({
                    where: { id: { in: leadIds } },
                    data: { 
                        enrollmentStatus: 'NON_ENROLLED',
                        phase: 1,               // ආයෙත් 1st Phase එකෙන් කෝල් කරන්න ඕනේ
                        callStatus: 'pending',  // අලුත් මාසෙට කෝල් එක තාම ගත්තේ නෑ
                        coordinationRound: { increment: 1 } // Round එක අලුත් මාසෙට අප්ඩේට් වෙනවා
                    }
                });
                console.log(`[RETENTION ENGINE] Reset ${activeLeads.length} leads in Batch ${batch.id} to NON_ENROLLED.`);
            }
        }

        console.log(`[RETENTION ENGINE] Monthly reset completed successfully!`);

    } catch (error) {
        console.error("[RETENTION ENGINE ERROR]:", error);
    }
};

exports.manualTriggerMonthlyReset = async (req, res) => {
    await exports.runMonthlyRetentionReset();
    res.status(200).json({ message: "Monthly reset triggered successfully!" });
};

// ============================================================================
// 4. STATS DATA FETCHING FUNCTION
// ============================================================================
exports.getRetentionCampaignData = async (req, res) => {
    try {
        const { businessId, batchId, month, startDate, endDate } = req.query;

        // 1. Strict Business ID & Date Range Filter eka apply karanawa
        let whereClause = buildStatsWhereClause(businessId, batchId, startDate, endDate, { 
            campaignType: 'AFTER_SEMINAR' 
        });

        // 2. Fetch Leads with strictly filtered where clause
        const leads = await prisma.lead.findMany({
            where: whereClause,
            include: { assignedUser: { select: { firstName: true, lastName: true } } }
        });

        // 3. Calculate Retention Stats
        let prevMonthEnrolled = 0;
        let thisMonthRenewed = 0;
        
        leads.forEach(l => {
            if (l.paymentIntention !== 'NOT_DECIDED') {
                prevMonthEnrolled++;
                if (l.enrollmentStatus === 'ENROLLED') {
                    thisMonthRenewed++;
                }
            }
        });

        const thisMonthDropped = prevMonthEnrolled - thisMonthRenewed;

        res.status(200).json({
            leads,
            stats: {
                prevMonthEnrolled,
                thisMonthRenewed,
                thisMonthDropped: thisMonthDropped > 0 ? thisMonthDropped : 0
            }
        });

    } catch (error) {
        console.error("Retention Data Error:", error);
        res.status(500).json({ error: "Failed to fetch retention campaign data" });
    }
};