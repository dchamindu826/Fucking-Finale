const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 🔥 1. OYATA TEST KARANNA ONA STAFF KENAGE ID EKA METHANATA DANNA 🔥
// (Prisma Studio eken hari URL eken hari Staff ID eka balaganna. E.g., Dhanushka ge ID eka)
const TARGET_STAFF_ID = 58; 

// 🔥 2. MEKA false THIYEDDI DATABASE EKA UPDATE WENAWA 🔥
// Dan meka false karala thiyenne. Run kalama kelinma leads tika NEW walata reset wenawa.
const DRY_RUN_MODE = false;

async function testSingleUserFix() {
    console.log(`\n🕵️‍♂️ TEST RUN: Checking leads for Staff ID: ${TARGET_STAFF_ID}`);
    console.log(`🛡️ DRY RUN MODE IS: ${DRY_RUN_MODE ? 'ON (Read-Only)' : 'OFF (Updating Database)'}\n`);

    try {
        // Get all businesses and batches
        const businesses = await prisma.business.findMany();
        const bizMap = {}; 
        businesses.forEach(b => bizMap[b.id] = b.name);

        const batches = await prisma.batch.findMany();
        const batchToBizMap = {}; 
        batches.forEach(b => batchToBizMap[b.id] = b.businessId);

        // Get the target staff member
        const staffMember = await prisma.user.findUnique({
            where: { id: TARGET_STAFF_ID }
        });

        if (!staffMember) {
            console.log("❌ Staff member not found! Check the TARGET_STAFF_ID.");
            return;
        }

        console.log(`👤 Checking Staff: ${staffMember.firstName} ${staffMember.lastName} | Assigned Business: ${staffMember.businessType}`);

        // Get leads assigned ONLY to this staff member
        const assignedLeads = await prisma.lead.findMany({
            where: { assignedTo: TARGET_STAFF_ID },
            include: { batch: true } // Let's get batch info to show you
        });

        console.log(`Total leads currently assigned to this staff: ${assignedLeads.length}\n`);

        let leadsToReset = [];

        // Check for mismatches
        for (const lead of assignedLeads) {
            const batchId = lead.batchId;
            if (!batchId) continue;

            const bizId = batchToBizMap[batchId];
            const bizName = bizMap[bizId];

            const staffBiz = String(staffMember.businessType || '').toLowerCase().trim();
            const bIdStr = String(bizId).toLowerCase().trim();
            const bNameStr = String(bizName).toLowerCase().trim();

            // Mismatch calculation
            if (staffBiz !== bIdStr && staffBiz !== bNameStr) {
                leadsToReset.push(lead.id);
                if (DRY_RUN_MODE) {
                    console.log(`⚠️ MISMATCH FOUND -> Lead Phone: ${lead.phone.split('_')[0]} | Lead Business: ${bizName} (Batch: ${lead.batch?.name})`);
                }
            }
        }

        console.log(`\n📊 Summary for Staff ID ${TARGET_STAFF_ID}:`);
        console.log(`✅ Correctly Assigned Leads: ${assignedLeads.length - leadsToReset.length}`);
        console.log(`🚨 Mismatched Leads to Reset: ${leadsToReset.length}\n`);

        // Execution phase
        if (DRY_RUN_MODE) {
            console.log("🛑 THIS WAS A DRY RUN. No data was modified.");
            console.log("If the mismatched leads above look correct, change 'DRY_RUN_MODE = false' in the script and run again to fix them.\n");
        } else {
            if (leadsToReset.length > 0) {
                console.log("⏳ Updating database...");
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
                console.log("✅ Nothing to reset!\n");
            }
        }

    } catch (error) {
        console.error("❌ Error occurred:", error);
    } finally {
        await prisma.$disconnect();
    }
}

testSingleUserFix();