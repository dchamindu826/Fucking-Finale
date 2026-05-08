const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixPayment() {
    // Terminal එකෙන් දෙන Payment ID එක ගන්නවා
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.log("❌ Please provide a Payment ID! (Example: node fixPaymentType.js 83)");
        process.exit(1);
    }

    const paymentId = parseInt(args[0]);

    try {
        console.log(`⏳ Updating Payment ID: ${paymentId}...`);

        // අදාළ Payment එකේ Type එක 3 (Full Payment) විදියට Update කරනවා
        const updatedPayment = await prisma.payment.update({
            where: { id: paymentId },
            data: { payment_type: 3 } 
        });
        
        console.log(`✅ Success! Payment ID ${paymentId} is now updated to Full Payment (Type 3).`);

    } catch (error) {
        console.error("❌ Error occurred:", error.message);
    } finally {
        await prisma.$disconnect();
    }
}

fixPayment();