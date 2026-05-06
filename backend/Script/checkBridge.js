const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBridgeLeads() {
    try {
        const businessId = 1;
        console.log(`🔍 Checking pending Bridge leads for Business ID: ${businessId}...`);

        // Business ID එක හරියටම වෙන් කරගන්න Regex එකක් (1, 11 පැටලෙන්නේ නැති වෙන්න)
        const exactBizRegex = new RegExp(`_BIZ_${businessId}(_|$)`);

        // 1. FREE_SEMINAR එකේ ඉන්න BIZ_1 ළමයි ඔක්කොම ගන්නවා
        const freeRaw = await prisma.lead.findMany({
            where: {
                campaignType: 'FREE_SEMINAR',
                phone: { contains: `_BIZ_${businessId}` }
            },
            select: { id: true, phone: true }
        });
        const freeSeminarLeads = freeRaw.filter(l => exactBizRegex.test(l.phone));

        // 2. AFTER_SEMINAR එකේ ඉන්න BIZ_1 ළමයි ඔක්කොම ගන්නවා
        const afterRaw = await prisma.lead.findMany({
            where: {
                campaignType: 'AFTER_SEMINAR',
                phone: { contains: `_BIZ_${businessId}` }
            },
            select: { phone: true }
        });
        const afterSeminarLeads = afterRaw.filter(l => exactBizRegex.test(l.phone));

        // 3. 07 සහ 94 අවුල මගාරින්න After Seminar එකේ අයගේ අන්තිම ඉලක්කම් 9 අරන් Set එකක් හදනවා
        const afterSeminarPhones = new Set(
            afterSeminarLeads.map(l => {
                const base = l.phone.split('_')[0].replace(/[^0-9]/g, '');
                return base.length >= 9 ? base.slice(-9) : base; 
            })
        );

        // 4. Free Seminar එකේ ඉන්න, හැබැයි After Seminar එකේ (Set එකේ) නැති අයව Filter කරනවා
        const pendingBridgeLeads = freeSeminarLeads.filter(lead => {
            const basePhone = lead.phone.split('_')[0].replace(/[^0-9]/g, '');
            const shortPhone = basePhone.length >= 9 ? basePhone.slice(-9) : basePhone;
            return !afterSeminarPhones.has(shortPhone);
        });

        console.log(`🌉 ✅ Total Pending Bridge Leads for BIZ ${businessId}: ${pendingBridgeLeads.length}`);

        // ඕනෙ නම් ID ටිකයි Phone ටිකයි බලන්න පහළ කෑල්ල uncomment කරන්න
        // console.table(pendingBridgeLeads);

    } catch (error) {
        console.error("❌ Error fetching bridge leads:", error);
    } finally {
        await prisma.$disconnect();
    }
}

checkBridgeLeads();