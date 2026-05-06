const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findMissing85() {
    try {
        const businessId = 11;
        console.log(`🔍 Hunting down the mismatched leads for BIZ ${businessId}...`);

        // 1. Frontend එකේ ALL Count එක ගන්න Controller එක වැඩ කරන විදිය (1964 leads එන Query එක)
        const frontendCountLeads = await prisma.lead.findMany({
            where: {
                campaignType: 'AFTER_SEMINAR',
                OR: [
                    { phone: { endsWith: `_BIZ_${businessId}` } },
                    { phone: { contains: `_BIZ_${businessId}_` } }
                ]
            },
            select: { id: true, name: true, phone: true, source: true, createdAt: true }
        });

        // 2. අපි කලින් ලියපු Script එකේ Logic එක (1879 leads ආපු එක)
        const scriptRaw = await prisma.lead.findMany({
            where: {
                campaignType: 'AFTER_SEMINAR',
                phone: { contains: `_BIZ_${businessId}` }
            },
            select: { id: true, phone: true }
        });
        const exactBizRegex = new RegExp(`_BIZ_${businessId}(_|$)`);
        const scriptLeads = scriptRaw.filter(l => exactBizRegex.test(l.phone));
        
        // අහුවෙච්ච 1879 දෙනාගේ IDs ටික Set එකකට දාගන්නවා
        const scriptLeadIds = new Set(scriptLeads.map(l => l.id));

        // 3. වෙනස හොයමු (Frontend එකට අහුවෙලා, Script එකට අහු නොවිච්ච 85 දෙනා)
        const mismatchedLeads = frontendCountLeads.filter(l => !scriptLeadIds.has(l.id));

        console.log(`\n📊 SUMMARY:`);
        console.log(`Frontend ALL Count : ${frontendCountLeads.length}`);
        console.log(`Script Count       : ${scriptLeads.length}`);
        console.log(`Difference         : ${mismatchedLeads.length} leads!`);

        if (mismatchedLeads.length > 0) {
            console.log(`\n🚨 Here are the mismatched leads (Showing first 85):`);
            // මේකෙන් අර අවුල් වෙච්ච 85 දෙනාගේ විස්තර ටේබල් එකක් විදියට පෙන්නනවා
            console.table(mismatchedLeads.slice(0, 85));
            
            console.log(`\n💡 උඩ Table එකේ 'phone' column එක දිහා හොඳට බලන්න.
ඔතන තියෙන phone numbers අනිත් ඒවට වඩා වෙනස් විදියකට සේව් වෙලා ඇත්තේ (e.g., Simple letters, Typing mistakes).`);
        }

    } catch (error) {
        console.error("❌ Error:", error);
    } finally {
        await prisma.$disconnect();
    }
}

findMissing85();