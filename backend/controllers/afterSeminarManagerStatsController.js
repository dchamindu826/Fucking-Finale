const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 1. OVERALL PROGRESS STATS (ROBUST VERSION)
exports.getManagerDashboardStats = async (req, res) => {
    try {
        const { businessId, batchId } = req.query;
        let whereClause = { campaignType: 'AFTER_SEMINAR' };
        let courseWhere = {};

        // 1. Batch / Business Filters
        if (batchId && batchId !== 'ALL') {
            whereClause.batchId = parseInt(batchId);
            const batchGroups = await prisma.group.findMany({ where: { batchId: parseInt(batchId) }, select: { id: true } });
            courseWhere.groupId = { in: batchGroups.map(g => g.id) };
        } else if (businessId && businessId !== 'ALL') {
            whereClause.OR = [
    { phone: { endsWith: `BIZ_${businessId}` } },
    { phone: { endsWith: `BIZ_${businessId}_AS` } },
    { phone: { contains: `BIZ_${businessId}_BATCH_` } }
];
            const bizBatches = await prisma.batch.findMany({ where: { businessId: parseInt(businessId) }, select: { id: true } });
            const bizGroups = await prisma.group.findMany({ where: { batchId: { in: bizBatches.map(b => b.id) } }, select: { id: true } });
            courseWhere.groupId = { in: bizGroups.map(g => g.id) };
        }

        // 2. Fetch REAL Leads
        const leads = await prisma.lead.findMany({
            where: whereClause,
            include: { assignedUser: { select: { firstName: true, lastName: true } } }
        });

        let stats = { totalLeads: leads.length, assignedLeads: 0, unassignedLeads: 0, openSemLeads: 0, newInqLeads: 0 };
        let staffMap = {};
        let fullPayCount = 0; let monthlyCount = 0; let installCount = 0; let totalEnrolledCount = 0;

        // 🔥 FIX 1: Fetch ALL Courses to create a global dictionary (prevents missing names)
        const allCourses = await prisma.course.findMany({ select: { id: true, name: true } });
        const globalCourseMap = {};
        allCourses.forEach(c => globalCourseMap[c.id] = c.name.trim().toUpperCase());

        // Fetch Filtered Courses just for creating the baseline aggregates
        const realCourses = await prisma.course.findMany({
            where: courseWhere, select: { id: true, name: true }
        });

        const subjectAggregates = {};
        realCourses.forEach(c => {
            const upName = c.name.trim().toUpperCase();
            if(!subjectAggregates[upName]) {
                subjectAggregates[upName] = { id: c.id, subject: c.name, full: 0, monthly: 0, installment: 0, totalEnrolled: 0 };
            }
        });

        let mixerData = [];

        // 4. Calculate Leads, Staff & Subject Intersection
        for (const l of leads) {
            if (l.assignedTo) {
                stats.assignedLeads++;
                if (l.inquiryType === 'OPEN_SEMINAR' || l.inquiryType === 'NORMAL') stats.openSemLeads++;
                if (l.inquiryType === 'NEW_INQ') stats.newInqLeads++;
                const staffName = l.assignedUser ? `${l.assignedUser.firstName} ${l.assignedUser.lastName}` : `Unknown`;
                if (!staffMap[staffName]) staffMap[staffName] = 0;
                staffMap[staffName]++;
            } else {
                stats.unassignedLeads++;
            }

            // 🔥 FIX 2: Case-insensitive enrollment check
            const enrollStatus = (l.enrollmentStatus || '').toUpperCase();
            
            if (enrollStatus === 'ENROLLED') {
                totalEnrolledCount++;

                // 🔥 FIX 3: Safe fallback for Payment Intention (If null, default to MONTHLY)
                let intention = (l.paymentIntention || '').toUpperCase();
                if (!['FULL', 'MONTHLY', 'INSTALLMENT'].includes(intention)) {
                    intention = 'MONTHLY'; // Fallback
                }

                if (intention === 'FULL') fullPayCount++;
                else if (intention === 'MONTHLY') monthlyCount++;
                else if (intention === 'INSTALLMENT') installCount++;

                // Get Real Subjects from User's Payment Record
                let corePhone = l.phone.split('_')[0].replace(/[^0-9]/g, '').trim();
                if (corePhone.startsWith('94')) corePhone = corePhone.substring(2);
                else if (corePhone.startsWith('0')) corePhone = corePhone.substring(1);

                const student = await prisma.user.findFirst({
                    where: {
                        OR: [ { phone: { contains: corePhone } }, { whatsapp: { contains: corePhone } } ],
                        role: { in: ['Student', 'USER', 'user', 'student'] }
                    },
                    include: { payments: true }
                });

                let enrolledSubjectNames = [];
                
                if (student && student.payments.length > 0) {
                    let subjectIds = [];
                    
                    student.payments.forEach(p => {
                        if (p.subjects) {
                            try { 
                                const subs = typeof p.subjects === 'string' ? JSON.parse(p.subjects) : p.subjects; 
                                
                                // 🔥 FIX 4: Robust JSON parsing (handles strings, objects, and numbers)
                                if (Array.isArray(subs)) {
                                    subs.forEach(item => {
                                        if (typeof item === 'object' && item !== null && item.id) {
                                            subjectIds.push(parseInt(item.id));
                                        } else if (typeof item === 'string' && isNaN(parseInt(item))) {
                                            // If it's saved directly as string names like ["MEDIA", "ENGLISH"]
                                            if (!enrolledSubjectNames.includes(item.trim().toUpperCase())) {
                                                enrolledSubjectNames.push(item.trim().toUpperCase());
                                            }
                                        } else if (!isNaN(parseInt(item))) {
                                            subjectIds.push(parseInt(item));
                                        }
                                    });
                                }
                            } catch(e) { console.error("Subject Parse Error:", e) }
                        }
                    });
                    
                    subjectIds = [...new Set(subjectIds)]; // Remove duplicates
                    
                    subjectIds.forEach(id => {
                        const sName = globalCourseMap[id];
                        if (sName && !enrolledSubjectNames.includes(sName)) {
                            enrolledSubjectNames.push(sName);
                        }
                    });

                    // Aggregate stats for the found subjects
                    enrolledSubjectNames.forEach(sName => {
                        if (subjectAggregates[sName]) {
                            if (intention === 'FULL') subjectAggregates[sName].full++;
                            else if (intention === 'MONTHLY') subjectAggregates[sName].monthly++;
                            else if (intention === 'INSTALLMENT') subjectAggregates[sName].installment++;
                            subjectAggregates[sName].totalEnrolled++;
                        }
                    });
                }

                // Push individual student data for exact AND filtering
                mixerData.push({
                    leadId: l.id,
                    paymentIntention: intention, // Using safely normalized intention
                    subjects: enrolledSubjectNames 
                });
            }
        }

        const staffAllocation = Object.keys(staffMap).map(name => ({ name, assigned: staffMap[name] }));
        const uniqueSubjects = Object.values(subjectAggregates).map(s => ({
            id: s.id, subject: s.subject, full: s.full, monthly: s.monthly, installment: s.installment, total: s.totalEnrolled
        }));

        res.status(200).json({
            ...stats,
            staffAllocation,
            subjectEnrollments: uniqueSubjects,
            mixerData: mixerData, 
            realEnrollmentTotals: { full: fullPayCount, monthly: monthlyCount, installment: installCount, total: totalEnrolledCount }
        });

    } catch (error) {
        console.error("Manager Stats Error:", error);
        res.status(500).json({ error: "Failed to fetch manager stats" });
    }
};
// 2. NEW INQUIRIES STATS
exports.getNewInquiryStats = async (req, res) => {
    try {
        const { businessId, batchId } = req.query;

        let whereClause = { campaignType: 'AFTER_SEMINAR', inquiryType: 'NEW_INQ' };
        
        if (batchId && batchId !== '') {
            whereClause.batchId = parseInt(batchId);
        } else if (businessId && businessId !== '') {
            whereClause.OR = [
    { phone: { endsWith: `BIZ_${businessId}` } },
    { phone: { endsWith: `BIZ_${businessId}_AS` } },
    { phone: { contains: `BIZ_${businessId}_BATCH_` } }
];
        }

        const leads = await prisma.lead.findMany({
            where: whereClause,
            include: { assignedUser: { select: { firstName: true, lastName: true } } }
        });

        let totalNewInq = leads.length;
        let totalContacted = 0;
        let totalPending = 0;
        let totalEnrolled = 0;
        let staffMap = {};

        leads.forEach(l => {
            const isPending = l.callStatus === 'pending' || !l.callStatus;
            const isEnrolled = l.enrollmentStatus === 'ENROLLED';
            const isContacted = !isPending;

            if (isContacted) totalContacted++;
            if (isPending) totalPending++;
            if (isEnrolled) totalEnrolled++;

            if (l.assignedTo) {
                const staffName = l.assignedUser ? `${l.assignedUser.firstName} ${l.assignedUser.lastName}` : `Unknown Staff`;
                if (!staffMap[staffName]) {
                    staffMap[staffName] = { name: staffName, assigned: 0, contacted: 0, pending: 0, enrolled: 0 };
                }
                staffMap[staffName].assigned++;
                if (isContacted) staffMap[staffName].contacted++;
                if (isPending) staffMap[staffName].pending++;
                if (isEnrolled) staffMap[staffName].enrolled++;
            }
        });

        const staffBreakdown = Object.values(staffMap);

        res.status(200).json({ totalNewInq, totalContacted, totalPending, totalEnrolled, staffBreakdown });
    } catch (error) {
        console.error("New Inq Stats Error:", error);
        res.status(500).json({ error: "Failed to fetch stats" });
    }
};

// 3. OPEN SEMINAR STATS
exports.getOpenSeminarStats = async (req, res) => {
    try {
        const { businessId, batchId } = req.query;

        let whereClause = { 
            campaignType: 'AFTER_SEMINAR', 
            inquiryType: { in: ['OPEN_SEMINAR', 'NORMAL'] } 
        };
        
        if (batchId && batchId !== '') {
            whereClause.batchId = parseInt(batchId);
        } else if (businessId && businessId !== '') {
            whereClause.OR = [
    { phone: { endsWith: `BIZ_${businessId}` } },
    { phone: { endsWith: `BIZ_${businessId}_AS` } },
    { phone: { contains: `BIZ_${businessId}_BATCH_` } }
];
        }

        const leads = await prisma.lead.findMany({
            where: whereClause,
            include: { assignedUser: { select: { firstName: true, lastName: true } } }
        });

        let totalOpenSem = leads.length;
        let totalContacted = 0;
        let totalPending = 0;
        let totalEnrolled = 0;
        let staffMap = {};

        leads.forEach(l => {
            const isPending = l.callStatus === 'pending' || !l.callStatus;
            const isEnrolled = l.enrollmentStatus === 'ENROLLED';
            const isContacted = !isPending;

            if (isContacted) totalContacted++;
            if (isPending) totalPending++;
            if (isEnrolled) totalEnrolled++;

            if (l.assignedTo) {
                const staffName = l.assignedUser ? `${l.assignedUser.firstName} ${l.assignedUser.lastName}` : `Unknown Staff`;
                if (!staffMap[staffName]) {
                    staffMap[staffName] = { name: staffName, assigned: 0, contacted: 0, pending: 0, enrolled: 0 };
                }
                staffMap[staffName].assigned++;
                if (isContacted) staffMap[staffName].contacted++;
                if (isPending) staffMap[staffName].pending++;
                if (isEnrolled) staffMap[staffName].enrolled++;
            }
        });

        const staffBreakdown = Object.values(staffMap);

        res.status(200).json({ totalOpenSem, totalContacted, totalPending, totalEnrolled, staffBreakdown });
    } catch (error) {
        console.error("Open Sem Stats Error:", error);
        res.status(500).json({ error: "Failed to fetch stats" });
    }
};

// 4. BRIDGE PERFORMANCE STATS
exports.getBridgePerformanceStats = async (req, res) => {
    try {
        const { businessId, batchId } = req.query;

        let whereClause = { 
            campaignType: 'AFTER_SEMINAR', 
            source: 'bridge_transfer' 
        };
        
        if (batchId && batchId !== '') {
            whereClause.batchId = parseInt(batchId);
        } else if (businessId && businessId !== '') {
            whereClause.OR = [
    { phone: { endsWith: `BIZ_${businessId}` } },
    { phone: { endsWith: `BIZ_${businessId}_AS` } },
    { phone: { contains: `BIZ_${businessId}_BATCH_` } }
];
        }

        const leads = await prisma.lead.findMany({
            where: whereClause,
            include: { assignedUser: { select: { firstName: true, lastName: true } } }
        });

        let totalTransferred = leads.length;
        let totalContacted = 0;
        let totalPending = 0;
        let totalEnrolled = 0;
        let staffMap = {};

        leads.forEach(l => {
            const isPending = l.callStatus === 'pending' || !l.callStatus;
            const isEnrolled = l.enrollmentStatus === 'ENROLLED';
            const isContacted = !isPending;

            if (isContacted) totalContacted++;
            if (isPending) totalPending++;
            if (isEnrolled) totalEnrolled++;

            if (l.assignedTo) {
                const staffName = l.assignedUser ? `${l.assignedUser.firstName} ${l.assignedUser.lastName}` : `Unknown`;
                if (!staffMap[staffName]) {
                    staffMap[staffName] = { name: staffName, assigned: 0, contacted: 0, pending: 0, enrolled: 0 };
                }
                staffMap[staffName].assigned++;
                if (isContacted) staffMap[staffName].contacted++;
                if (isPending) staffMap[staffName].pending++;
                if (isEnrolled) staffMap[staffName].enrolled++;
            }
        });

        res.status(200).json({ totalTransferred, totalContacted, totalPending, totalEnrolled, staffBreakdown: Object.values(staffMap) });
    } catch (error) {
        console.error("Bridge Stats Error:", error);
        res.status(500).json({ error: "Failed to fetch bridge stats" });
    }
};

// 5. PAID CAMPAIGN STATS
exports.getPaidCampaignStats = async (req, res) => {
    try {
        const { businessId, batchId } = req.query;

        let whereClause = { 
            campaignType: 'AFTER_SEMINAR',
            enrollmentStatus: 'ENROLLED' 
        };
        
        if (batchId && batchId !== '') {
            whereClause.batchId = parseInt(batchId);
        } else if (businessId && businessId !== '') {
            whereClause.OR = [
    { phone: { endsWith: `BIZ_${businessId}` } },
    { phone: { endsWith: `BIZ_${businessId}_AS` } },
    { phone: { contains: `BIZ_${businessId}_BATCH_` } }
];
        }

        const leads = await prisma.lead.findMany({
            where: whereClause,
            include: { assignedUser: { select: { firstName: true, lastName: true } } }
        });

        let totalPaidLeads = leads.length;
        let totalContacted = 0;
        let totalPending = 0;
        let staffMap = {};

        leads.forEach(l => {
            const isPending = l.callStatus === 'pending' || !l.callStatus;
            const isContacted = !isPending;

            if (isContacted) totalContacted++;
            if (isPending) totalPending++;

            if (l.assignedTo) {
                const staffName = l.assignedUser ? `${l.assignedUser.firstName} ${l.assignedUser.lastName}` : `Unknown Staff`;
                if (!staffMap[staffName]) {
                    staffMap[staffName] = { name: staffName, assigned: 0, contacted: 0, pending: 0 };
                }
                staffMap[staffName].assigned++;
                if (isContacted) staffMap[staffName].contacted++;
                if (isPending) staffMap[staffName].pending++;
            }
        });

        const staffBreakdown = Object.values(staffMap);

        res.status(200).json({ totalPaidLeads, totalContacted, totalPending, staffBreakdown });
    } catch (error) {
        console.error("Paid Campaign Stats Error:", error);
        res.status(500).json({ error: "Failed to fetch stats" });
    }
};

// 🔥 MASTER DIRECTORY API 🔥
exports.getMasterDirectory = async (req, res) => {
    try {
        const { businessId } = req.query;

        let whereClause = { campaignType: 'AFTER_SEMINAR' };

        // Business Filter eka apply karanawa
        if (businessId && businessId !== 'ALL' && businessId !== '') {
            whereClause.OR = [
    { phone: { endsWith: `BIZ_${businessId}` } },
    { phone: { endsWith: `BIZ_${businessId}_AS` } },
    { phone: { contains: `BIZ_${businessId}_BATCH_` } }
];
        }

        // DB eken real leads data gannawa
        const leads = await prisma.lead.findMany({
            where: whereClause,
            select: {
                id: true,
                name: true,
                phone: true,
                inquiryType: true,
                paymentIntention: true,
                enrollmentStatus: true,
                batchId: true
            },
            orderBy: {
                createdAt: 'desc' // Aluthma ewa udin enna
            }
        });

        res.status(200).json({ leads });
    } catch (error) {
        console.error("Master Directory Error:", error);
        res.status(500).json({ error: "Failed to fetch master directory" });
    }
};