const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkFreeSeminarLeads() {
    try {
        const businessId = 6;
        const batchId = 12;

        console.log(`🔍 Checking leads for Business ID: ${businessId} & Batch ID: ${batchId}...`);

        const leadCount = await prisma.lead.count({
            where: {
                campaignType: 'FREE_SEMINAR',
                batchId: batchId,
                phone: {
                    contains: `_BIZ_${businessId}`
                }
            }
        });

        console.log(`✅ Total FREE_SEMINAR Leads: ${leadCount}`);

        // ඔයාට ඒ ළමයින්ගේ විස්තර ටිකක් බලාගන්න ඕනේ නම් මේකත් පාවිච්චි කරන්න පුළුවන්:
        /*
        const leads = await prisma.lead.findMany({
            where: {
                campaignType: 'FREE_SEMINAR',
                batchId: batchId,
                phone: { contains: `_BIZ_${businessId}` }
            },
            select: { id: true, name: true, phone: true, status: true }
        });
        console.table(leads);
        */

    } catch (error) {
        console.error("❌ Error fetching leads:", error);
    } finally {
        await prisma.$disconnect();
    }
}

checkFreeSeminarLeads();