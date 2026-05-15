const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixDuplicates() {
    // 👇 ඔයාගේ duplicate වෙලා තියෙන Payment ID දෙක මෙතනට දෙන්න
    const duplicatePaymentIds = [409, 411]; 

    console.log("🔍 Duplicate payments පරීක්ෂා කිරීම ආරම්භ කරනවා...");

    for (const paymentId of duplicatePaymentIds) {
        try {
            // 1. Payment එකට අදාළ Delivery එක හොයනවා
            const delivery = await prisma.delivery.findUnique({
                where: { paymentId: paymentId }
            });

            if (!delivery) {
                console.log(`⚠️ Payment ID: ${paymentId} සඳහා Delivery record එකක් නැත.`);
                continue;
            }

            // 2. Status එක Pending (හෝ Hold) ද කියලා විතරක් චෙක් කරනවා
            if (delivery.status === 'Pending' || delivery.status === 'Hold') {
                console.log(`⏳ Payment ID: ${paymentId} හි Delivery එක '${delivery.status}' තත්ත්වයේ ඇත. මකා දැමීම ආරම්භ කරයි...`);

                // 3. මුලින්ම Delivery එක මකනවා (Cascade නිසා DeliveryItem ටිකත් මැකෙනවා)
                await prisma.delivery.delete({
                    where: { paymentId: paymentId }
                });
                console.log(`✅ Delivery record එක මැකුවා (Payment ID: ${paymentId})`);

                // 4. ඊටපස්සේ Payment එක මකනවා
                await prisma.payment.delete({
                    where: { id: paymentId }
                });
                console.log(`✅ Payment record එක මැකුවා (ID: ${paymentId})\n`);

            } else {
                // Pending නෙමෙයි නම් (Pack කරලා යවලා නම්) skip කරනවා
                console.log(`🛑 Payment ID: ${paymentId} මඟ හරින ලදී. එහි Delivery එක දැනටමත් '${delivery.status}' වී ඇත. (ආරක්ෂිතයි)\n`);
            }

        } catch (error) {
            console.error(`❌ Payment ID: ${paymentId} මකා දැමීමේදී දෝෂයක්:`, error.message);
        }
    }

    console.log("🎉 මෙහෙයුම අවසන්!");
}

// Function එක Run කිරීම
fixDuplicates()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });