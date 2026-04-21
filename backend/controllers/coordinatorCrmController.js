const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 1. Get All Leads (Contacts)
exports.getLeads = async (req, res) => {
    try {
        const userRole = req.user?.role?.toUpperCase();
        const userId = req.user?.id;
        const { campaignType, tab, staffPhase, status } = req.query; 

        let whereClause = {};
        if (campaignType) whereClause.campaignType = campaignType;

        const isManager = ['SYSTEM_ADMIN', 'DIRECTOR', 'MANAGER'].includes(userRole);

        // Tab Logic 
        if (tab === 'NEW') whereClause.status = 'NEW';
        if (tab === 'IMPORTED') whereClause.source = { in: ['import', 'bulk_import'] };
        
        if (!isManager) {
            // STAFF ROLE LOGIC
            if (tab === 'ASSIGNED' || !tab) {
                whereClause.assignedTo = parseInt(userId);
            } else if (tab === 'IMPORTED') {
                whereClause.assignedTo = parseInt(userId); // Staff sees only their imports
            } else if (tab === 'ALL') {
                whereClause.assignedTo = { not: null }; // Can see other staff leads
            }
        } else {
            // MANAGER ROLE LOGIC
            if (tab === 'ASSIGNED') whereClause.assignedTo = { not: null };
            if (tab === 'NEW') whereClause.assignedTo = null;
        }

        // Filters for Assigned Tab
        if (staffPhase) whereClause.phase = parseInt(staffPhase);
        if (status) whereClause.callStatus = status;

        const leads = await prisma.lead.findMany({
            where: whereClause,
            orderBy: [
                { unreadCount: 'desc' }, 
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

        const isManager = ['SYSTEM_ADMIN', 'DIRECTOR', 'MANAGER'].includes(userRole);
        const assignedTo = isManager ? null : parseInt(userId);
        const source = isBulk ? 'bulk_import' : 'import';

        const newLead = await prisma.lead.upsert({
            where: { phone: number },
            update: { name, source, assignedTo }, 
            create: {
                name,
                phone: number,
                source,
                campaignType: campaignType || 'FREE_SEMINAR',
                assignedTo,
                status: assignedTo ? 'OPEN' : 'NEW',
                phase: 1, 
                callStatus: 'pending'
            }
        });

        res.status(201).json({ message: "Lead imported successfully!", lead: newLead });
    } catch (error) {
        res.status(500).json({ error: "Failed to import lead" });
    }
};

// 3. Assign & Re-assign Leads
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
                data: { assignedTo: parseInt(staffId), status: 'OPEN', phase: 1, callStatus: 'pending' }
            });

            res.status(200).json({ message: `${leadsToAssign.length} leads assigned successfully!` });

        } else if (type === 'reassign') {
            await prisma.lead.updateMany({
                where: { id: { in: leadIds } },
                data: { assignedTo: parseInt(staffId), status: 'OPEN', phase: 1, callStatus: 'pending' }
            });
            res.status(200).json({ message: `Leads re-assigned successfully!` });

        } else if (type === 'auto') {
            for (const config of autoAssignConfig) {
                await prisma.autoAssignQuota.upsert({
                    where: { staffId: parseInt(config.staffId) },
                    update: { quotaAmount: config.quotaAmount, isActive: config.isActive },
                    create: { staffId: parseInt(config.staffId), quotaAmount: config.quotaAmount, isActive: config.isActive }
                });
            }
            res.status(200).json({ message: "Auto Assign configuration saved!" });
        }
    } catch (error) {
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
        res.status(500).json({ error: "Failed to update call campaign" });
    }
};

// 5. Helper: Run Auto Assign when a new message arrives
const runAutoAssign = async (leadId) => {
    const availableStaff = await prisma.autoAssignQuota.findFirst({
        where: { isActive: true, assigned: { lt: prisma.autoAssignQuota.fields.quotaAmount } },
        orderBy: { assigned: 'asc' }
    });

    if (availableStaff) {
        await prisma.lead.update({
            where: { id: leadId },
            data: { assignedTo: availableStaff.staffId, status: 'OPEN', isAutoAssigned: true }
        });
        await prisma.autoAssignQuota.update({
            where: { id: availableStaff.id },
            data: { assigned: { increment: 1 } }
        });
    }
};

// 6. Receive Message Webhook (Auto-Assign integrated)
exports.receiveMessage = async (req, res) => {
    try {
        let body = req.body;

        if (body.object === "whatsapp_business_account") {
            if (body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {
                
                let msgData = body.entry[0].changes[0].value.messages[0];
                let contactData = body.entry[0].changes[0].value.contacts[0];
                
                let phone = msgData.from; 
                let name = contactData.profile.name; 
                let messageText = msgData.text ? msgData.text.body : "Media Message";

                const existingLead = await prisma.lead.findUnique({ where: { phone } });
                const isNewLead = !existingLead;

                const lead = await prisma.lead.upsert({
                    where: { phone: phone },
                    update: { 
                        name: name,
                        lastMessage: messageText,
                        unreadCount: { increment: 1 },
                        status: existingLead?.assignedTo ? 'OPEN' : 'NEW'
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
                    }
                });

                if (isNewLead) {
                    await runAutoAssign(lead.id);
                }

                await prisma.chatMessage.create({
                    data: {
                        leadId: lead.id,
                        message: messageText,
                        direction: 'inbound',
                        senderType: 'USER',
                        senderName: name
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

// 7. Get Chat Messages
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

// 8. Send Message
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
                senderId: req.user?.id || null,
                senderName: senderName || req.user?.firstName || 'Staff'
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

// 9. Get Lead Details (RESTORED)
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

// 10. Reset Password (RESTORED)
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

// 11. Verify Webhook (RESTORED)
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