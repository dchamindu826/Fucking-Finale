const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixOldData() {
    // Apita kalin output eken apu waradichcha IDs 9
    const paymentIdsToFix = [95, 118, 127, 141, 142, 146, 177, 195, 211];

    try {
        console.log("🛠️ Fixing 9 mismatched payments...\n");

        const updateResult = await prisma.payment.updateMany({
            where: { 
                id: { in: paymentIdsToFix } 
            },
            data: { 
                payment_type: 1 // 🔥 Meken thamai hariyatama Monthly Group ekata ayeth watenne
            }
        });

        console.log(`✅ Successfully fixed ${updateResult.count} payments!`);
    } catch (error) {
        console.error("❌ Error fixing payments:", error);
    } finally {
        await prisma.$disconnect();
    }
}

fixOldData();