const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function masterBridgeCleanup() {
    try {
        console.log(`🧹 Starting MASTER Cleanup for ALL Businesses...`);

        // 1. Database එකේ තියෙන Businesses ඔක්කොම ගන්නවා
        const businesses = await prisma.business.findMany({ select: { id: true, name: true } });

        let totalImpostersRemoved = 0;

        for (const biz of businesses) {
            const businessId = biz.id;
            console.log(`\n🔍 Checking Business: ${biz.name} (ID: ${businessId})`);

            const exactBizRegex = new RegExp(`_BIZ_${businessId}(_|$)`);

            // 2. මේ Business එකේ ඇත්තටම Free Seminar ආපු ළමයින්ගේ අංක ටික ගන්නවා
            const validFreeRaw = await prisma.lead.findMany({
                where: { campaignType: 'FREE_SEMINAR', phone: { contains: `_BIZ_${businessId}` } },
                select: { phone: true }
            });
            
            const validFreePhones = new Set(
                validFreeRaw
                    .filter(l => exactBizRegex.test(l.phone))
                    .map(l => {
                        const base = l.phone.split('_')[0].replace(/[^0-9]/g, '');
                        return base.length >= 9 ? base.slice(-9) : base;
                    })
            );

            // 3. මේ Business එකේ After Seminar එකට Bridge එකෙන් ආපු ඔක්කොම ගන්නවා
            const bridgeTransfersRaw = await prisma.lead.findMany({
                where: { campaignType: 'AFTER_SEMINAR', source: 'bridge_transfer', phone: { contains: `_BIZ_${businessId}` } },
                select: { id: true, phone: true }
            });
            
            const bridgeTransfers = bridgeTransfersRaw.filter(l => exactBizRegex.test(l.phone));

            // 4. හොරුන්ව (Imposters) අල්ලගන්නවා (Free Seminar එකේ නැතුව, Bridge එකෙන් පැනපු අය)
            const imposters = bridgeTransfers.filter(l => {
                const base = l.phone.split('_')[0].replace(/[^0-9]/g, '');
                const shortPhone = base.length >= 9 ? base.slice(-9) : base;
                return !validFreePhones.has(shortPhone);
            });

            if (imposters.length > 0) {
                console.log(`🚨 Found ${imposters.length} imposters in ${biz.name}! Removing...`);
                const imposterIds = imposters.map(l => l.id);

                // Foreign Key constraints නිසා ඉස්සෙල්ලාම Chat Messages මකනවා
                await prisma.chatMessage.deleteMany({
                    where: { leadId: { in: imposterIds } }
                });

                // Imposter Leads ටික මකලා දානවා
                const deleted = await prisma.lead.deleteMany({
                    where: { id: { in: imposterIds } }
                });

                totalImpostersRemoved += deleted.count;
                console.log(`✅ Removed ${deleted.count} wrong leads from ${biz.name}.`);
            } else {
                console.log(`👍 All leads are authentic in ${biz.name}.`);
            }
        }

        console.log(`\n🎉 MASTER CLEANUP COMPLETE! Total corrupted leads removed globally: ${totalImpostersRemoved}`);

    } catch (error) {
        console.error("❌ Error:", error);
    } finally {
        await prisma.$disconnect();
    }
}

masterBridgeCleanup();