const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findExactMismatches() {
    try {
        console.log("🔍 Hunting down Exact Payment Mismatches via Group Logic (READ-ONLY)...\n");

        // 1. Slip saha Payhere payments okkoma gannawa
        const allPayments = await prisma.payment.findMany({
            where: {
                method: {
                    in: ['Slip', 'Payhere', 'PayHere', 'Online']
                }
            },
            select: {
                id: true,
                amount: true,
                payment_type: true,
                method: true,
                created_at: true,
                group: {
                    select: {
                        name: true,
                        type: true // 1 = Monthly, 2 = Full
                    }
                },
                student: {
                    select: {
                        firstName: true,
                        phone: true
                    }
                }
            }
        });

        let monthlySavedAsFull = [];
        let fullSavedAsMonthly = [];

        // 2. Logic eka check kireema
        allPayments.forEach(payment => {
            if (!payment.group) return; 

            const groupType = payment.group.type; 
            const savedPaymentType = payment.payment_type; 
            
            // Date eka lassanata format kireema (YYYY-MM-DD)
            const paymentDate = payment.created_at 
                ? new Date(payment.created_at).toISOString().split('T')[0] 
                : "N/A";

            // Method eka Slip ho Online widihata wenas kireema
            let displayMethod = "Unknown";
            if (payment.method) {
                const methodLower = payment.method.toLowerCase();
                if (methodLower === 'slip') {
                    displayMethod = 'Slip';
                } else if (methodLower.includes('payhere') || methodLower === 'online') {
                    displayMethod = 'Online';
                } else {
                    displayMethod = payment.method;
                }
            }

            // Mismatch 1: Monthly (1) gewala Full (3) or Installment (2) widihata save wela
            if (groupType === 1 && (savedPaymentType === 3 || savedPaymentType === 2)) {
                monthlySavedAsFull.push({
                    Payment_ID: payment.id,
                    Date: paymentDate,                 // 🔥 Aluthin add kala
                    Method: displayMethod,             // 🔥 Aluthin format kala
                    Student: payment.student?.firstName || "N/A",
                    Phone: payment.student?.phone || "N/A",
                    Amount: payment.amount,
                    Class_Group: `${payment.group.name} (Monthly)`,
                    Saved_As: savedPaymentType === 3 ? "Full" : "Installment",
                    Issue: "🚨 Monthly -> Full"
                });
            }

            // Mismatch 2: Full (2) gewala Monthly (1) widihata save wela
            else if (groupType === 2 && savedPaymentType === 1) {
                fullSavedAsMonthly.push({
                    Payment_ID: payment.id,
                    Date: paymentDate,                 // 🔥 Aluthin add kala
                    Method: displayMethod,             // 🔥 Aluthin format kala
                    Student: payment.student?.firstName || "N/A",
                    Phone: payment.student?.phone || "N/A",
                    Amount: payment.amount,
                    Class_Group: `${payment.group.name} (Full)`,
                    Saved_As: "Monthly",
                    Issue: "🚨 Full -> Monthly"
                });
            }
        });

        // ==========================================
        // RESULTS DISPLAY
        // ==========================================
        console.log(`✅ Total Payments Checked: ${allPayments.length}\n`);

        console.log(`❌ Mismatch 01: Monthly gewala Full kiyala watichcha ewa -> Count: ${monthlySavedAsFull.length}`);
        if (monthlySavedAsFull.length > 0) {
            console.table(monthlySavedAsFull);
        }

        console.log(`\n❌ Mismatch 02: Full gewala Monthly kiyala watichcha ewa -> Count: ${fullSavedAsMonthly.length}`);
        if (fullSavedAsMonthly.length > 0) {
            console.table(fullSavedAsMonthly);
        }

        console.log("\n⚠️ Logics and Data remained untouched. Read-Only check complete.");

    } catch (error) {
        console.error("❌ Error running script:", error);
    } finally {
        await prisma.$disconnect();
    }
}

findExactMismatches();