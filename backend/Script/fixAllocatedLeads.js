const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function rescueMismatchedLeads() {
    try {
        const businessId = 1;
        console.log(`🛠️ Starting Cleanup for the 85 mixed leads...`);

        // 1. අර 85 දෙනාව හොයාගන්න පරණ ලොජික් එකම පාවිච්චි කරනවා
        const frontendCountLeads = await prisma.lead.findMany({
            where: {
                campaignType: 'AFTER_SEMINAR',
                OR: [
                    { phone: { endsWith: `_BIZ_${businessId}` } },
                    { phone: { contains: `_BIZ_${businessId}_` } }
                ]
            }
        });

        const scriptRaw = await prisma.lead.findMany({
            where: { campaignType: 'AFTER_SEMINAR', phone: { contains: `_BIZ_${businessId}` } }
        });
        const exactBizRegex = new RegExp(`_BIZ_${businessId}(_|$)`);
        const scriptLeadIds = new Set(scriptRaw.filter(l => exactBizRegex.test(l.phone)).map(l => l.id));
        
        // මේ ඉන්නේ අර වරදින්න Assign වෙච්ච 85 දෙනා
        const mismatchedLeads = frontendCountLeads.filter(l => !scriptLeadIds.has(l.id));
        const mismatchedIds = mismatchedLeads.map(l => l.id);

        console.log(`🎯 Found ${mismatchedIds.length} leads to rescue!`);

        if (mismatchedIds.length > 0) {
            // 2. ඒ 85 දෙනාව Unassign කරලා Reset කරනවා
            const result = await prisma.lead.updateMany({
                where: { id: { in: mismatchedIds } },
                data: {
                    assignedTo: null,          // Staff ගෙන් ගැලෙව්වා
                    status: 'NEW',             // ආයෙත් 'NEW' tab එකට දැම්මා
                    phase: 1,                  // Phase 1 ට ගත්තා
                    callStatus: 'pending',     // තාම කෝල් කරලා නෑ විදියට හැදුවා
                    unreadCount: 1             // අලුත් නිසා 1ක් දැම්මා
                    // feedback එක එහෙම්මම තිබ්බා Business 11 එකේ අයට බලාගන්න
                }
            });

            console.log(`✅ SUCCESS: ${result.count} leads successfully reset and returned to Business 11's NEW pool!`);
        } else {
            console.log(`👍 No mismatched leads found to update.`);
        }

    } catch (error) {
        console.error("❌ Error during cleanup:", error);
    } finally {
        await prisma.$disconnect();
    }
}

rescueMismatchedLeads();