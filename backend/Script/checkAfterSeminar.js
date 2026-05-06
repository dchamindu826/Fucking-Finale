const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAfterSeminarLeads() {
    try {
        const targetBusinessId = 4;
        console.log(`🔍 Checking After Seminar Data Isolation for Business ID: ${targetBusinessId}...`);

        // Business ID 1 හරියටම අල්ලගන්න Regex එක
        const exactBizRegex = new RegExp(`_BIZ_${targetBusinessId}(_|$)`);

        // 1. Get After Seminar Leads
        const afterRaw = await prisma.lead.findMany({
            where: { 
                campaignType: 'AFTER_SEMINAR', 
                phone: { contains: `_BIZ_${targetBusinessId}` } 
            },
            select: { id: true, phone: true, batchId: true }
        });

        // 2. Filter exactly for Business 1
        const afterSeminarLeads = afterRaw.filter(l => exactBizRegex.test(l.phone));

        console.log(`\n================ AFTER SEMINAR VALIDATION REPORT ================`);
        console.log(`Total After Seminar Leads Found for BIZ ${targetBusinessId}: ${afterSeminarLeads.length}`);
        
        let mixIssues = [];
        let batchCounts = {};

        afterSeminarLeads.forEach(lead => {
            const phoneStr = lead.phone;
            
            // Check 1: වෙනත් Business IDs mix වෙලාද බලනවා
            const bizMatches = [...phoneStr.matchAll(/_BIZ_(\d+)/g)].map(m => parseInt(m[1]));
            if (bizMatches.some(id => id !== targetBusinessId)) {
                mixIssues.push({
                    leadId: lead.id,
                    phone: phoneStr,
                    issues: `Mixed BIZ IDs found: ${bizMatches.join(', ')}`
                });
            }

            // Check 2: මොන මොන Batches ද තියෙන්නේ කියලා Count කරනවා
            const batchMatches = [...phoneStr.matchAll(/_BATCH_(\d+)/g)].map(m => parseInt(m[1]));
            
            if (batchMatches.length > 0) {
                batchMatches.forEach(b => {
                    batchCounts[b] = (batchCounts[b] || 0) + 1;
                });
            } else {
                // Batch tag එකක් නැති leads (e.g., _BIZ_1_AS වගේ ඒවා)
                batchCounts['No_Batch_Tag'] = (batchCounts['No_Batch_Tag'] || 0) + 1;
            }
        });

        if (mixIssues.length === 0) {
            console.log(`✅ SUCCESS: No business data mixing detected! 100% Data Isolation for After Seminar.`);
        } else {
            console.log(`❌ WARNING: Found ${mixIssues.length} leads with mixed Business IDs!`);
            console.table(mixIssues);
        }

        console.log(`\n📌 Batch Breakdown in this BIZ ${targetBusinessId} After Seminar pool:`);
        for (const [batch, count] of Object.entries(batchCounts)) {
            console.log(`   - ${batch === 'No_Batch_Tag' ? 'Without Batch Tag' : 'Batch ' + batch}: ${count} leads`);
        }
        console.log(`=================================================================\n`);

    } catch (error) {
        console.error("❌ Validation Error:", error);
    } finally {
        await prisma.$disconnect();
    }
}

checkAfterSeminarLeads();