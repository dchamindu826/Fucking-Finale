const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function validateBridgeData() {
    try {
        const targetBusinessId = 6;
        // ඔයාට specific batch එකක් විතරක් check කරන්න ඕනේ නම් මේක 5 කරන්න. 
        // null දුන්නොත් Business 1 එකේ ඔක්කොම batch වල bridge leads ටික check කරනවා.
        const targetBatchId = null; 

        console.log(`🔍 Validating Data Isolation for Business ID: ${targetBusinessId}...`);

        const exactBizRegex = new RegExp(`_BIZ_${targetBusinessId}(_|$)`);

        // 1. Get Free Seminar Leads
        const freeRaw = await prisma.lead.findMany({
            where: { campaignType: 'FREE_SEMINAR', phone: { contains: `_BIZ_${targetBusinessId}` } },
            select: { id: true, phone: true, batchId: true }
        });
        let freeSeminarLeads = freeRaw.filter(l => exactBizRegex.test(l.phone));

        // 2. Get After Seminar Leads
        const afterRaw = await prisma.lead.findMany({
            where: { campaignType: 'AFTER_SEMINAR', phone: { contains: `_BIZ_${targetBusinessId}` } },
            select: { phone: true }
        });
        const afterSeminarLeads = afterRaw.filter(l => exactBizRegex.test(l.phone));

        // 3. Make Set of After Seminar phone numbers (Last 9 digits)
        const afterSeminarPhones = new Set(
            afterSeminarLeads.map(l => {
                const base = l.phone.split('_')[0].replace(/[^0-9]/g, '');
                return base.length >= 9 ? base.slice(-9) : base; 
            })
        );

        // 4. Find Bridge Leads
        let bridgeLeads = freeSeminarLeads.filter(lead => {
            const basePhone = lead.phone.split('_')[0].replace(/[^0-9]/g, '');
            const shortPhone = basePhone.length >= 9 ? basePhone.slice(-9) : basePhone;
            return !afterSeminarPhones.has(shortPhone);
        });

        // 5. 🚨 DATA VALIDATION ENGINE 🚨
        console.log(`\n================ DATA VALIDATION REPORT ================`);
        console.log(`Total Bridge Leads Found: ${bridgeLeads.length}`);
        
        let mixIssues = [];
        let batchesFound = new Set();

        bridgeLeads.forEach(lead => {
            const phoneStr = lead.phone;
            
            // Extract all BIZ IDs from the string
            const bizMatches = [...phoneStr.matchAll(/_BIZ_(\d+)/g)].map(m => parseInt(m[1]));
            // Extract all BATCH IDs from the string
            const batchMatches = [...phoneStr.matchAll(/_BATCH_(\d+)/g)].map(m => parseInt(m[1]));

            batchMatches.forEach(b => batchesFound.add(b));

            let issueDesc = [];

            // Check 1: Is there any Business ID other than targetBusinessId?
            if (bizMatches.some(id => id !== targetBusinessId)) {
                issueDesc.push(`Mixed BIZ IDs found: ${bizMatches.join(', ')}`);
            }

            // Check 2: If a targetBatchId is set, are there other batches?
            if (targetBatchId !== null && batchMatches.some(id => id !== targetBatchId)) {
                issueDesc.push(`Mixed BATCH IDs found: ${batchMatches.join(', ')} (Expected: ${targetBatchId})`);
            }

            if (issueDesc.length > 0) {
                mixIssues.push({
                    leadId: lead.id,
                    phone: phoneStr,
                    issues: issueDesc.join(' | ')
                });
            }
        });

        if (mixIssues.length === 0) {
            console.log(`✅ SUCCESS: No data mixing detected! 100% Data Isolation.`);
        } else {
            console.log(`❌ WARNING: Found ${mixIssues.length} leads with mixed data!`);
            console.table(mixIssues);
        }

        console.log(`\n📌 Batches actively present in this BIZ ${targetBusinessId} bridge pool:`, 
            batchesFound.size > 0 ? Array.from(batchesFound).join(', ') : "None"
        );
        console.log(`========================================================\n`);

    } catch (error) {
        console.error("❌ Validation Error:", error);
    } finally {
        await prisma.$disconnect();
    }
}

validateBridgeData();