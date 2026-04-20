const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 1. Get All Leads (Contacts) - Updated for Tabs and Unread sorting
exports.getLeads = async (req, res) => {
    try {
        const userRole = req.user?.role?.toUpperCase();
        const userId = req.user?.id;
        const { campaignType, tab, staffPhase, status } = req.query; 

        let whereClause = {};
        if (campaignType) whereClause.campaignType = campaignType;

        // Tab Logic (All, Assigned, Imported, New)
        if (tab === 'NEW') whereClause.status = 'NEW';
        if (tab === 'IMPORTED') whereClause.source = 'import';
        
        // Staff/Manager Role Logic
        if (userRole !== 'SYSTEM_ADMIN' && userRole !== 'DIRECTOR' && userRole !== 'MANAGER') {
            // Staff sees only their assigned leads unless 'All' is selected (if policy allows)
            if (tab === 'ASSIGNED' || !tab) {
                whereClause.assignedTo = parseInt(userId);
            }
        } else {
            // Manager assigning logic
            if (tab === 'ASSIGNED') whereClause.assignedTo = { not: null };
        }

        // Filters for Assigned Tab
        if (staffPhase) whereClause.phase = parseInt(staffPhase);
        if (status) whereClause.callStatus = status;

        const leads = await prisma.lead.findMany({
            where: whereClause,
            orderBy: [
                { unreadCount: 'desc' }, // Unread messages bubble to top
                { updatedAt: 'desc' }
            ],
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
        const { name, number, campaignType, isBulk } = req.body;
        const userRole = req.user?.role?.toUpperCase();
        const userId = req.user?.id;

        const isManager = userRole === 'SYSTEM_ADMIN' || userRole === 'DIRECTOR' || userRole === 'MANAGER';
        const assignedTo = isManager ? null : parseInt(userId);

        const newLead = await prisma.lead.upsert({
            where: { phone: number },
            update: { name, source: isBulk ? 'bulk_import' : 'import', assignedTo }, 
            create: {
                name,
                phone: number,
                source: isBulk ? 'bulk_import' : 'import',
                campaignType: campaignType || 'FREE_SEMINAR',
                assignedTo,
                status: 'NEW',
                phase: 1, // Start at phase 1
                callStatus: 'pending'
            }
        });

        res.status(201).json({ message: "Lead imported successfully!", lead: newLead });
    } catch (error) {
        console.error("Import Lead Error:", error);
        res.status(500).json({ error: "Failed to import lead" });
    }
};

// 3. Assign & Re-assign Leads (Manager Only)
exports.assignLeads = async (req, res) => {
    try {
        const { type, staffId, count, sort, leadIds, autoAssignConfig } = req.body;

        if (type === 'bulk') {
            const leadsToAssign = await prisma.lead.findMany({
                where: { assignedTo: null, status: 'NEW' },
                orderBy: { createdAt: sort === 'oldest' ? 'asc' : 'desc' },
                take: parseInt(count)
            });

            if (leadsToAssign.length === 0) return res.status(400).json({ error: "No unassigned leads found." });

            const ids = leadsToAssign.map(l => l.id);
            await prisma.lead.updateMany({
                where: { id: { in: ids } },
                data: { assignedTo: parseInt(staffId), status: 'OPEN' }
            });

            res.status(200).json({ message: `${leadsToAssign.length} leads assigned successfully!` });

        } else if (type === 'reassign') {
            // Re-assign logic (Mistakes or Phase 1 pendings)
            await prisma.lead.updateMany({
                where: { id: { in: leadIds } },
                data: { assignedTo: parseInt(staffId), status: 'OPEN', phase: 1, callStatus: 'pending' }
            });
            res.status(200).json({ message: `Leads re-assigned successfully!` });

        } else if (type === 'auto') {
            // Auto Assign configuration save logic (Assuming you have a settings table, mocking here)
            // config = { staffId1: quoteAmount, staffId2: quoteAmount, isActive: true }
            res.status(200).json({ message: "Auto Assign configuration saved!", config: autoAssignConfig });
        }
    } catch (error) {
        console.error("Assign Leads Error:", error);
        res.status(500).json({ error: "Failed to assign leads" });
    }
};

// 4. Update Call Campaign Status & Phase Logic
exports.updateCallCampaign = async (req, res) => {
    try {
        const { leadId, method, status, feedback } = req.body;
        
        const lead = await prisma.lead.findUnique({ where: { id: parseInt(leadId) } });
        if (!lead) return res.status(404).json({ error: "Lead not found" });

        let nextPhase = lead.phase;
        
        // Phase Shifting Logic based on NO_ANSWER
        if (status === 'no_answer') {
            if (lead.phase === 1) nextPhase = 2;
            else if (lead.phase === 2) nextPhase = 3;
        }

        const updatedLead = await prisma.lead.update({
            where: { id: parseInt(leadId) },
            data: {
                callMethod: method,
                callStatus: status,
                feedback: feedback,
                phase: nextPhase
            }
        });

        res.status(200).json({ message: "Call status updated", lead: updatedLead });
    } catch (error) {
        console.error("Call Campaign Update Error:", error);
        res.status(500).json({ error: "Failed to update call campaign" });
    }
};

// Get Lead Details (Unchanged)
exports.getLeadDetails = async (req, res) => {
    try {
        const { phone } = req.params;
        const cleanPhone = phone.replace('+', '').trim();
        
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

        if (!student) return res.status(200).json({ isEnrolled: false });

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

        res.status(200).json({ isEnrolled: true, student, enrolledCourses });

    } catch (error) {
        console.error("Get Lead Details Error:", error);
        res.status(500).json({ error: "Failed to fetch lead details" });
    }
};

// Reset Password (Unchanged)
exports.resetStudentPassword = async (req, res) => {
    try {
        const { studentId, newPassword } = req.body;
        
        await prisma.user.update({
            where: { id: parseInt(studentId) },
            data: { password: newPassword } 
        });

        res.status(200).json({ message: "Password updated successfully!" });
    } catch (error) {
        console.error("Password Reset Error:", error);
        res.status(500).json({ error: "Failed to reset password" });
    }
};

// Verify Webhook (Unchanged)
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

// Receive Message (Unchanged logic, just added auto-assign trigger comment)
exports.receiveMessage = async (req, res) => {
    try {
        let body = req.body;

        if (body.object === "whatsapp_business_account") {
            if (body.entry && body.entry[0].changes && body.entry[0].changes[0].value.messages && body.entry[0].changes[0].value.messages[0]) {
                
                let msgData = body.entry[0].changes[0].value.messages[0];
                let contactData = body.entry[0].changes[0].value.contacts[0];
                
                let phone = msgData.from; 
                let name = contactData.profile.name; 
                let messageText = msgData.text ? msgData.text.body : "Media Message";

                console.log(`📩 New Message from ${name} (${phone}): ${messageText}`);

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
                        campaignType: 'FREE_SEMINAR', 
                        lastMessage: messageText,
                        unreadCount: 1,
                        status: 'NEW',
                        phase: 1,
                        callStatus: 'pending'
                        // NOTE: මෙතනදි ඔයාගේ Auto-Assign Logic එක call කරන්න පුළුවන්
                    }
                });

                await prisma.chatMessage.create({
                    data: {
                        leadId: lead.id,
                        message: messageText,
                        direction: 'inbound',
                        senderType: 'USER'
                    }
                });
            }
        }
        res.status(200).send("EVENT_RECEIVED");
    } catch (error) {
        console.error("Webhook Error:", error);
        res.status(500).send("ERROR");
    }
};

// 6. Get Chat Messages (Included sender details)
exports.getMessages = async (req, res) => {
    try {
        const { leadId } = req.params;
        await prisma.lead.update({
            where: { id: parseInt(leadId) },
            data: { unreadCount: 0 }
        });
        const messages = await prisma.chatMessage.findMany({
            where: { leadId: parseInt(leadId) },
            orderBy: { createdAt: 'asc' },
            // include user details to show WHO sent it
            include: { senderUser: { select: { firstName: true, lastName: true } } } 
        });
        res.status(200).json(messages);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch messages" });
    }
};

// 7. Send Message (Tracking sender name)
exports.sendMessage = async (req, res) => {
    try {
        const { leadId, message, mediaUrl, senderName } = req.body;
        const newMsg = await prisma.chatMessage.create({
            data: {
                leadId: parseInt(leadId),
                message: message || '',
                mediaUrl: mediaUrl || null,
                direction: 'outbound',
                senderType: 'STAFF',
                senderId: req.user?.id?.toString(),
                senderName: senderName || 'Staff' // Save name to show in chat bubble
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