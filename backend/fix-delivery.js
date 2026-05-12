const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixWrongDeliveryTypes() {
    try {
        console.log("🔍 Scanning for PayHere Deliveries with mismatched types...");

        // PayHere වලින් ආපු හැම Delivery රෙකෝඩ් එකක්ම Payment එකත් එක්ක ගන්නවා
        const payHereDeliveries = await prisma.delivery.findMany({
            where: {
                payment: {
                    method: 'PayHere'
                }
            },
            include: {
                payment: true
            }
        });

        let updatedCount = 0;

        for (const delivery of payHereDeliveries) {
            if (!delivery.payment) continue;

            // Payment Table එකේ තියෙන ඇත්ත Type එක හොයාගන්නවා
            let correctType = 'Monthly';
            if (parseInt(delivery.payment.payment_type) === 2) correctType = 'Installment';
            if (parseInt(delivery.payment.payment_type) === 3) correctType = 'Full';

            // Delivery එකේ තියෙන Type එකයි, ඇත්ත Type එකයි අසමාන නම් විතරක් Update කරනවා
            if (delivery.paymentType !== correctType) {
                await prisma.delivery.update({
                    where: { id: delivery.id },
                    data: { paymentType: correctType }
                });
                updatedCount++;
                console.log(`✅ Fixed Delivery ID: ${delivery.id} (Payment ID: ${delivery.paymentId}) -> Changed to ${correctType}`);
            }
        }

        console.log(`\n🎉 Process Complete! Successfully fixed ${updatedCount} delivery records.`);

    } catch (error) {
        console.error("Critical Error:", error);
    } finally {
        await prisma.$disconnect();
    }
}

fixWrongDeliveryTypes();