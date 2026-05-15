// fix-history.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runDataMigration() {
    console.log("==================================================");
    console.log("🚀 STARTING 10000% SAFE HISTORICAL DATA RECOVERY...");
    console.log("==================================================");

    try {
        // 1. දැනට Round 1 ට වඩා වැඩි Round (උදා: 2, 3) වල ඉන්න Leads ලා විතරක් ගන්නවා.
        // අපි මේ අයගේ data update කරන්නේ නෑ, read කරනවා විතරයි.
        const advancedLeads = await prisma.lead.findMany({
            where: { coordinationRound: { gt: 1 } }
        });

        console.log(`🔍 Found ${advancedLeads.length} leads in advanced rounds. Analyzing history...`);

        let restoredCount = 0;

        for (const lead of advancedLeads) {
            const basePhone = lead.phone;
            const currentRound = lead.coordinationRound;

            // 2. පරණ History data ටික ගන්නවා LeadRoundProgress table එකෙන් 
            const history = await prisma.leadRoundProgress.findMany({
                where: { leadId: lead.id }
            });

            // 3. අතුරුදහන් වුණ පරණ Rounds (1 ඉඳන් currentRound එකට කලින් එක වෙනකම්) ටිකට අදාලව අලුත් Records හදනවා
            for (let r = 1; r < currentRound; r++) {
                const roundHistory = history.find(h => h.roundNum === r);
                
                // පරණ Record එකේ ෆෝන් නම්බර් එක වෙනස් කරනවා DB එකේ ගැටෙන්නේ නැති වෙන්න. 
                // දැනට Active Lead එකේ නම්බර් එකට මේකෙන් කිසිම බලපෑමක් නෑ.
                const historicalPhone = `${basePhone}_HISTORY_ROUND_${r}`;

                // මේ ෆෝන් නම්බර් එක දැනටමත් තියෙනවද බලනවා (දෙපාරක් රන් වුනොත් duplicate නොවෙන්න)
                const exists = await prisma.lead.findUnique({
                    where: { phone: historicalPhone }
                });

                if (exists) continue; // තිබ්බොත් මුකුත් කරන්නේ නෑ, ඊළඟ එකට යනවා.

                // 🔥 CREATE ONLY: අලුතෙන් Record එක Insert කරනවා විතරයි. 🔥
                await prisma.lead.create({
                    data: {
                        name: lead.name,
                        phone: historicalPhone,
                        source: lead.source,
                        campaignType: lead.campaignType,
                        assignedTo: lead.assignedTo,
                        status: 'OPEN',
                        // History එකේ තිබ්බ Data ගන්නවා, නැත්තම් පරණ Lead එකේම default අගයන් දානවා
                        phase: roundHistory ? roundHistory.phase : 1, 
                        callStatus: roundHistory ? roundHistory.callStatus : 'answered', 
                        paymentIntention: lead.paymentIntention,
                        enrollmentStatus: lead.enrollmentStatus,
                        inquiryType: lead.inquiryType,
                        newInqTimestamp: lead.newInqTimestamp,
                        batchId: lead.batchId,
                        feedback: roundHistory ? roundHistory.feedback : lead.feedback, 
                        coordinationRound: r,
                        callAttempt: roundHistory ? roundHistory.callAttempt : 1,
                        callMethod: roundHistory ? roundHistory.callMethod : 'direct',
                        isLocked: false,
                        unreadCount: 0,
                        autoReplyStep: lead.autoReplyStep || 0,
                        sequenceCompleted: lead.sequenceCompleted || false
                    }
                });
                restoredCount++;
            }
        }

        console.log("==================================================");
        console.log(`✅ SUCCESS! Safely restored ${restoredCount} historical records.`);
        console.log("==================================================");

    } catch (error) {
        console.error("❌ ERROR DURING MIGRATION:", error);
    } finally {
        // වැඩේ ඉවර වුනාම Database Connection එක වහනවා
        await prisma.$disconnect();
    }
}

// Function එක Call කරනවා
runDataMigration();