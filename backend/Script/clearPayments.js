// clearPayments.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clearStudentData() {
    // Terminal එකෙන් දෙන Student ID එක ගන්නවා
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.log("❌ Please provide a Student ID! (Example: node clearPayments.js 123)");
        process.exit(1);
    }

    const studentId = parseInt(args[0]);

    try {
        console.log(`⏳ Searching records for Student ID: ${studentId}...`);

        // 1. මේ ලමයාට අදාළ Payments ඔක්කොම හොයාගන්නවා
        const payments = await prisma.payment.findMany({
            where: { studentId: studentId },
            select: { id: true }
        });

        if (payments.length === 0) {
            console.log(`✅ No payments found for Student ID: ${studentId}. Nothing to clear.`);
            return;
        }

        const paymentIds = payments.map(p => p.id);

        // 2. Foreign Key constraints අවුල් යන්නේ නැති වෙන්න, මුලින්ම ඒ Payments වලට අදාළ Delivery records තියෙනවා නම් මකනවා
        const deletedDeliveries = await prisma.delivery.deleteMany({
            where: { paymentId: { in: paymentIds } }
        });
        if (deletedDeliveries.count > 0) {
            console.log(`🗑️ Cleared ${deletedDeliveries.count} related delivery records.`);
        }

        // 3. අන්තිමට Payments ටික මකලා දානවා
        const deletedPayments = await prisma.payment.deleteMany({
            where: { id: { in: paymentIds } }
        });
        
        console.log(`✅ Successfully cleared ${deletedPayments.count} payment records for Student ID: ${studentId}.`);

    } catch (error) {
        console.error("❌ Error occurred while clearing records:", error);
    } finally {
        await prisma.$disconnect();
    }
}

clearStudentData();