const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function nukeTheGhost() {
    // මේ තියෙන්නේ ඔයාගේ Screenshot එකේ තිබ්බ අවුල් ගිය නම්බර් එක
    const phoneStr = '761781344'; 
    console.log(`\n🕵️‍♂️ X-RAY SCANNING FOR NUMBER: ${phoneStr}...\n`);

    try {
        // මේ නම්බර් එක තියෙන මුළු Database එකේම රෙකෝඩ්ස් ඔක්කොම අදිනවා
        const leads = await prisma.lead.findMany({
            where: { phone: { contains: phoneStr } }
        });

        if (leads.length === 0) {
            console.log("❌ No records found at all!");
            return;
        }

        console.log(`Found ${leads.length} records in the DB. Let's analyze:\n`);
        
        // ඔයාට පැහැදිලිව බලාගන්න පුළුවන් කොහේද මේ නම්බර් එක තියෙන්නේ කියලා
        console.table(leads.map(l => ({
            id: l.id,
            phone: l.phone,
            campaign: l.campaignType,
            business: l.phone.includes('BIZ_11') ? 'Tech' : l.phone.includes('BIZ_1') ? 'Art' : 'Other',
            status: l.status
        })));

        // Tech එකේ නෙවෙයි, Art එකේ තියෙන (BIZ_1) හොර රෙකෝඩ් එක අල්ලගන්නවා
        const ghostLeads = leads.filter(l => 
            l.phone.includes('BIZ_1') && 
            !l.phone.includes('BIZ_11') // Tech එකේ Original එක මකන්නේ නෑ
        );

        if (ghostLeads.length > 0) {
            console.log(`\n🚨 FOUND THE GHOST IN ART! Deleting ${ghostLeads.length} record(s)...`);
            
            const ghostIds = ghostLeads.map(l => l.id);
            
            // Foreign keys තියෙන නිසා ඉස්සෙල්ලාම Messages මකනවා
            await prisma.chatMessage.deleteMany({
                where: { leadId: { in: ghostIds } }
            });

            // ඊට පස්සේ ලීඩ් එක මකනවා
            await prisma.lead.deleteMany({
                where: { id: { in: ghostIds } }
            });
            
            console.log(`✅ GHOST NUKED SUCCESSFULLY! \nදැන් Art Coordinator ගේ Screen එක Refresh කරලා බලන්න. ළමයා අතුරුදහන් වෙලා ඇති!`);
        } else {
            console.log(`\n✅ No ghost found in Art.`);
        }

    } catch (error) {
        console.error("❌ Error:", error);
    } finally {
        await prisma.$disconnect();
    }
}

nukeTheGhost();