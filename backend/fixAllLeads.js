const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 🔥 MEKA FALSE NISA KELINMA DATABASE EKA FIX WENAWA 🔥
const DRY_RUN_MODE = false;

async function fixAllUsersLeads() {
    console.log(`\n🕵️‍♂️ RUNNING FULL SYSTEM FIX for ALL STAFF`);
    console.log(`🛡️ DRY RUN MODE IS: ${DRY_RUN_MODE ? 'ON (Read-Only)' : 'OFF (Updating Database)'}\n`);

    try {
        const businesses = await prisma.business.findMany();
        const bizMap = {}; 
        businesses.forEach(b => bizMap[b.id] = b.name);

        const batches = await prisma.batch.findMany();
        const batchToBizMap = {}; 
        batches.forEach(b => batchToBizMap[b.id] = b.businessId);

        const staff = await prisma.user.findMany({
            where: { role: { notIn: ['STUDENT', 'Student', 'USER'] } }
        });
        const staffMap = {}; 
        staff.forEach(s => staffMap[s.id] = s);

        const assignedLeads = await prisma.lead.findMany({
            where: { assignedTo: { not: null } },
            include: { batch: true }
        });

        let leadsToReset = [];

        for (const lead of assignedLeads) {
            const batchId = lead.batchId;
            const staffId = lead.assignedTo;

            if (!batchId || !staffId) continue;

            const staffMember = staffMap[staffId];
            if (!staffMember) continue;

            const bizId = batchToBizMap[batchId];
            const bizName = bizMap[bizId];

            const role = (staffMember.role || '').toUpperCase().replace(/ /g, '_');
            const isTopLevel = ['SYSTEM_ADMIN', 'DIRECTOR', 'SUPER'].includes(role);

            // Adminlata okkoma penna puluwan nisa eyalawa skip karanawa
            if (!isTopLevel) {
                const staffBiz = String(staffMember.businessType || '').toLowerCase().trim();
                const bIdStr = String(bizId).toLowerCase().trim();
                const bNameStr = String(bizName).toLowerCase().trim();

                if (staffBiz !== bIdStr && staffBiz !== bNameStr) {
                    leadsToReset.push(lead.id);
                }
            }
        }

        console.log(`🚨 Total Mismatched Leads Found System-wide: ${leadsToReset.length}\n`);

        if (DRY_RUN_MODE) {
            console.log("🛑 DRY RUN ON. No data modified.");
        } else {
            if (leadsToReset.length > 0) {
                console.log("⏳ Updating database... Resetting leads to NEW.");
                const result = await prisma.lead.updateMany({
                    where: { id: { in: leadsToReset } },
                    data: {
                        assignedTo: null,
                        status: 'NEW',
                        callStatus: 'pending',
                        phase: 1
                    }
                });
                console.log(`✅ Successfully reset ${result.count} leads back to NEW/UNASSIGNED!\n`);
            } else {
                console.log("✅ Nothing to reset! System is clean.\n");
            }
        }

    } catch (error) {
        console.error("❌ Error occurred:", error);
    } finally {
        await prisma.$disconnect();
    }
}

fixAllUsersLeads();