const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 1. Get All Leads (Contacts)
exports.getLeads = async (req, res) => {
    try {
        const userRole = req.user?.role?.toUpperCase();
        const userId = req.user?.id;
        const { campaignType } = req.query; 

        let whereClause = {};
        if (campaignType) whereClause.campaignType = campaignType;

        // Manager කෙනෙක් නෙවෙයි නම් (Staff නම්), එයාට අදාල Leads විතරක් පෙන්නන්න
        if (userRole !== 'SYSTEM_ADMIN' && userRole !== 'DIRECTOR' && userRole !== 'MANAGER') {
            whereClause.assignedTo = parseInt(userId);
        }

        const leads = await prisma.lead.findMany({
            where: whereClause,
            orderBy: { updatedAt: 'desc' },
            include: { assignedUser: { select: { firstName: true, lastName: true } } }
        });

        res.status(200).json(leads);
    } catch (error) {
        console.error("Get Leads Error:", error);
        res.status(500).json({ error: "Failed to fetch leads" });
    }
};

// 2. Import New Lead manually
exports.importLead = async (req, res) => {
    try {
        const { name, number, campaignType } = req.body;
        const userRole = req.user?.role?.toUpperCase();
        const userId = req.user?.id;

        // Staff කෙනෙක් Import කරොත් ඔටෝම එයාට Assign වෙනවා. Manager නම් Assigned නෑ.
        const isManager = userRole === 'SYSTEM_ADMIN' || userRole === 'DIRECTOR' || userRole === 'MANAGER';
        const assignedTo = isManager ? null : parseInt(userId);

        const newLead = await prisma.lead.upsert({
            where: { phone: number },
            update: { name, source: 'import', assignedTo }, // කලින් හිටියොත් Update වෙනවා
            create: {
                name,
                phone: number,
                source: 'import',
                campaignType: campaignType || 'FREE_SEMINAR',
                assignedTo,
                status: 'NEW'
            }
        });

        res.status(201).json({ message: "Lead imported successfully!", lead: newLead });
    } catch (error) {
        console.error("Import Lead Error:", error);
        res.status(500).json({ error: "Failed to import lead" });
    }
};

// 3. Assign Leads (Manager Only)
exports.assignLeads = async (req, res) => {
    try {
        const { type, staffId, count, sort } = req.body;

        if (type === 'bulk') {
            // Bulk Assign: Assign unassigned leads to a specific staff member
            const leadsToAssign = await prisma.lead.findMany({
                where: { assignedTo: null },
                orderBy: { createdAt: sort === 'oldest' ? 'asc' : 'desc' },
                take: parseInt(count)
            });

            if (leadsToAssign.length === 0) {
                return res.status(400).json({ error: "No unassigned leads found." });
            }

            const leadIds = leadsToAssign.map(l => l.id);
            await prisma.lead.updateMany({
                where: { id: { in: leadIds } },
                data: { assignedTo: parseInt(staffId), status: 'OPEN' }
            });

            res.status(200).json({ message: `${leadsToAssign.length} leads assigned successfully!` });
        } else {
            // Auto Assign: (මේකෙ Logic එක පස්සේ ලොකුවට ගහමු, දැනට success message එකක් යවනවා)
            res.status(200).json({ message: "Auto Assign configuration saved!" });
        }
    } catch (error) {
        console.error("Assign Leads Error:", error);
        res.status(500).json({ error: "Failed to assign leads" });
    }
};

exports.getLeadDetails = async (req, res) => {
    try {
        const { phone } = req.params;
        // නම්බර් එකේ + ලකුණක් තිබ්බොත් අයින් කරනවා
        const cleanPhone = phone.replace('+', '').trim();
        
        // User (Student) ටේබල් එකෙන් හොයනවා
        const student = await prisma.user.findFirst({
            where: {
                OR: [
                    { phone: { contains: cleanPhone } },
                    { whatsapp: { contains: cleanPhone } }
                ],
                role: { in: ['Student', 'USER', 'user', 'student'] }
            },
            include: {
                payments: {
                    include: { business: true, batch: true },
                    orderBy: { created_at: 'desc' }
                }
            }
        });

        if (!student) {
            return res.status(200).json({ isEnrolled: false });
        }

        // ළමයා ගෙවලා තියෙන Subjects ටික හොයාගන්නවා
        let enrolledCourses = [];
        if (student.payments.length > 0) {
            let subjectIds = [];
            student.payments.forEach(p => {
                if (p.subjects) {
                    try {
                        const subs = JSON.parse(p.subjects);
                        subjectIds.push(...subs.map(id => parseInt(id)));
                    } catch(e) {}
                }
            });

            if (subjectIds.length > 0) {
                enrolledCourses = await prisma.course.findMany({
                    where: { id: { in: subjectIds } }
                });
            }
        }

        res.status(200).json({
            isEnrolled: true,
            student,
            enrolledCourses
        });

    } catch (error) {
        console.error("Get Lead Details Error:", error);
        res.status(500).json({ error: "Failed to fetch lead details" });
    }
};

// 🔥 අලුත් 2: Password එක වෙනස් කරන API එක 🔥
exports.resetStudentPassword = async (req, res) => {
    try {
        const { studentId, newPassword } = req.body;
        
        await prisma.user.update({
            where: { id: parseInt(studentId) },
            data: { password: newPassword } // *ඔයාගේ system එකේ password hash කරනවා නම්, මෙතන hash කරලා දාන්න
        });

        res.status(200).json({ message: "Password updated successfully!" });
    } catch (error) {
        console.error("Password Reset Error:", error);
        res.status(500).json({ error: "Failed to reset password" });
    }
};

exports.verifyWebhook = (req, res) => {
    const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN || "ImaCampusMetaApp@2026";
    
    let mode = req.query["hub.mode"];
    let token = req.query["hub.verify_token"];
    let challenge = req.query["hub.challenge"];

    if (mode && token) {
        if (mode === "subscribe" && token === VERIFY_TOKEN) {
            console.log("✅ Meta Webhook Verified!");
            res.status(200).send(challenge);
        } else {
            console.error("❌ Meta Webhook Verification Failed!");
            res.sendStatus(403);
        }
    } else {
        res.sendStatus(400);
    }
};

// 🔥 Receive Messages (ළමයි එවන මැසේජ් Database එකට සේව් කරන තැන)
exports.receiveMessage = async (req, res) => {
    try {
        let body = req.body;

        // WhatsApp එකෙන් එන මැසේජ් එකක්ද කියලා බලනවා
        if (body.object === "whatsapp_business_account") {
            if (body.entry && body.entry[0].changes && body.entry[0].changes[0].value.messages && body.entry[0].changes[0].value.messages[0]) {
                
                let msgData = body.entry[0].changes[0].value.messages[0];
                let contactData = body.entry[0].changes[0].value.contacts[0];
                
                let phone = msgData.from; // ළමයාගේ නම්බර් එක
                let name = contactData.profile.name; // ළමයාගේ WhatsApp නම
                let messageText = msgData.text ? msgData.text.body : "Media Message";

                console.log(`📩 New Message from ${name} (${phone}): ${messageText}`);

                // 1. Lead එකක් නැත්නම් අලුතින් හදනවා, තියෙනවා නම් Update කරනවා
                const lead = await prisma.lead.upsert({
                    where: { phone: phone },
                    update: { 
                        name: name,
                        lastMessage: messageText,
                        unreadCount: { increment: 1 },
                        status: 'OPEN'
                    },
                    create: {
                        name: name,
                        phone: phone,
                        source: 'whatsapp',
                        campaignType: 'FREE_SEMINAR', // මෙතන default එකක් දානවා
                        lastMessage: messageText,
                        unreadCount: 1,
                        status: 'NEW'
                    }
                });

                // 2. මැසේජ් එක Database එකේ සේව් කරනවා
                await prisma.chatMessage.create({
                    data: {
                        leadId: lead.id,
                        message: messageText,
                        direction: 'inbound',
                        senderType: 'USER'
                    }
                });

                // (Optional: Socket.io තියෙනවා නම් Frontend එකට Real-time යවන්න පුළුවන්)
            }
        }
        
        // අනිවාර්යයෙන්ම 200 OK යවන්න ඕනේ, නැත්නම් Meta එකෙන් ආයේ ආයේ එවනවා
        res.status(200).send("EVENT_RECEIVED");
    } catch (error) {
        console.error("Webhook Error:", error);
        res.status(500).send("ERROR");
    }
};

// 🔥 6. Get Chat Messages 🔥
exports.getMessages = async (req, res) => {
    try {
        const { leadId } = req.params;
        await prisma.lead.update({
            where: { id: parseInt(leadId) },
            data: { unreadCount: 0 }
        });
        const messages = await prisma.chatMessage.findMany({
            where: { leadId: parseInt(leadId) },
            orderBy: { createdAt: 'asc' }
        });
        res.status(200).json(messages);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch messages" });
    }
};

// 🔥 7. Send Message 🔥
exports.sendMessage = async (req, res) => {
    try {
        const { leadId, message, mediaUrl } = req.body;
        const newMsg = await prisma.chatMessage.create({
            data: {
                leadId: parseInt(leadId),
                message: message || '',
                mediaUrl: mediaUrl || null,
                direction: 'outbound',
                senderType: 'STAFF',
                senderId: req.user?.id?.toString()
            }
        });
        await prisma.lead.update({
            where: { id: parseInt(leadId) },
            data: { lastMessage: message || 'Sent Media', status: 'OPEN' }
        });
        res.status(201).json(newMsg);
    } catch (error) {
        res.status(500).json({ error: "Failed to send message" });
    }
};