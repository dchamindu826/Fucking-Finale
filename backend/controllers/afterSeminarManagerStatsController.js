const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 🔥 STRICT HELPER: Fixed BIZ_ string format to prevent Business ID bleeding 🔥
const buildStatsWhereClause = (businessId, batchId, startDate, endDate, baseConditions = {}) => {
    let whereClause = { ...baseConditions };

    if (batchId && batchId !== '' && batchId !== 'ALL') {
        whereClause.batchId = parseInt(batchId);
    } else if (businessId && businessId !== '' && businessId !== 'ALL') {
        whereClause.OR = [
            { phone: { endsWith: `_BIZ_${businessId}` } },         
            { phone: { endsWith: `_BIZ_${businessId}_AS` } },      
            { phone: { contains: `_BIZ_${businessId}_BATCH_` } },
            // 🔥 මේ කෑලි දෙක තමා Manager Stats වලට අඩු වෙලා තිබ්බේ! 🔥
            { phone: { contains: `_BIZ_${businessId}_ROUND_` } },
            { phone: { contains: `_BIZ_${businessId}_HISTORY_ROUND_` } }
        ];
    }

    if (startDate && endDate) {
        const isExactStart = startDate.includes('T');
        const isExactEnd = endDate.includes('T');

        whereClause.updatedAt = {
            gte: isExactStart ? new Date(startDate) : new Date(`${startDate}T00:00:00.000Z`),
            lte: isExactEnd ? new Date(endDate) : new Date(`${endDate}T23:59:59.999Z`)
        };
    }
    return whereClause;
};

// ==========================================
// 1. OVERALL PROGRESS STATS
// ==========================================
exports.getManagerDashboardStats = async (req, res) => {
    try {
        const { businessId, batchId, startDate, endDate } = req.query; 

        let courseWhere = {};
        if (batchId && batchId !== 'ALL') {
            const batchGroups = await prisma.group.findMany({ where: { batchId: parseInt(batchId) }, select: { id: true } });
            courseWhere.groupId = { in: batchGroups.map(g => g.id) };
        } else if (businessId && businessId !== 'ALL') {
            const bizBatches = await prisma.batch.findMany({ where: { businessId: parseInt(businessId) }, select: { id: true } });
            const bizGroups = await prisma.group.findMany({ where: { batchId: { in: bizBatches.map(b => b.id) } }, select: { id: true } });
            courseWhere.groupId = { in: bizGroups.map(g => g.id) };
        }

        const whereClause = buildStatsWhereClause(businessId, batchId, startDate, endDate, { campaignType: 'AFTER_SEMINAR' });

        const leads = await prisma.lead.findMany({
            where: whereClause,
            include: { assignedUser: { select: { firstName: true, lastName: true } } }
        });

        // 🔥 Bridge Leads වෙන් කරලා ගණන් හදමු
        let stats = { totalLeads: leads.length, assignedLeads: 0, unassignedLeads: 0, openSemLeads: 0, newInqLeads: 0, bridgeLeads: 0 };
        let staffMap = {};
        let fullPayCount = 0; let monthlyCount = 0; let installCount = 0; let totalEnrolledCount = 0;

        const allCourses = await prisma.course.findMany({ select: { id: true, name: true } });
        const globalCourseMap = {};
        allCourses.forEach(c => globalCourseMap[c.id] = c.name.trim().toUpperCase());

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

        for (const l of leads) {
            
            // 🔥 වෙනම කැටගරි 3ට බෙදීම 🔥
            if (l.source === 'bridge_transfer') {
                stats.bridgeLeads++;
            } else if (l.inquiryType === 'NEW_INQ') {
                stats.newInqLeads++;
            } else {
                stats.openSemLeads++; 
            }

            if (l.assignedTo) {
                stats.assignedLeads++;
                const staffName = l.assignedUser ? `${l.assignedUser.firstName} ${l.assignedUser.lastName}` : `Unknown`;
                if (!staffMap[staffName]) staffMap[staffName] = 0;
                staffMap[staffName]++;
            } else {
                stats.unassignedLeads++;
            }

            const enrollStatus = (l.enrollmentStatus || '').toUpperCase();
            
            if (enrollStatus === 'ENROLLED') {
                totalEnrolledCount++;

                let intention = (l.paymentIntention || '').toUpperCase();
                if (!['FULL', 'MONTHLY', 'INSTALLMENT'].includes(intention)) intention = 'MONTHLY'; 

                if (intention === 'FULL') fullPayCount++;
                else if (intention === 'MONTHLY') monthlyCount++;
                else if (intention === 'INSTALLMENT') installCount++;

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
                                if (Array.isArray(subs)) {
                                    subs.forEach(item => {
                                        if (typeof item === 'object' && item !== null && item.id) {
                                            subjectIds.push(parseInt(item.id));
                                        } else if (typeof item === 'string' && isNaN(parseInt(item))) {
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
                    
                    subjectIds = [...new Set(subjectIds)]; 
                    subjectIds.forEach(id => {
                        const sName = globalCourseMap[id];
                        if (sName && !enrolledSubjectNames.includes(sName)) enrolledSubjectNames.push(sName);
                    });

                    enrolledSubjectNames.forEach(sName => {
                        if (subjectAggregates[sName]) {
                            if (intention === 'FULL') subjectAggregates[sName].full++;
                            else if (intention === 'MONTHLY') subjectAggregates[sName].monthly++;
                            else if (intention === 'INSTALLMENT') subjectAggregates[sName].installment++;
                            subjectAggregates[sName].totalEnrolled++;
                        }
                    });
                }

                mixerData.push({ leadId: l.id, paymentIntention: intention, subjects: enrolledSubjectNames });
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

// ==========================================
// 2. NEW INQUIRIES STATS (ADVANCED WITH ROUND BREAKDOWN & RAW LEADS)
// ==========================================
exports.getNewInquiryStats = async (req, res) => {
    try {
        const { businessId, batchId, startDate, endDate } = req.query;

        const whereClause = buildStatsWhereClause(businessId, batchId, startDate, endDate, { 
            campaignType: 'AFTER_SEMINAR', inquiryType: 'NEW_INQ' 
        });

        let leads = await prisma.lead.findMany({
            where: whereClause,
            include: { assignedUser: { select: { firstName: true, lastName: true } } }
        });

        // 🔥 FIX: Bridge Transfers අනිවාර්යයෙන්ම අයින් කරන්න
        leads = leads.filter(l => l.source !== 'bridge_transfer');

        let totalNewInq = leads.length;
        let totalAssigned = 0; 
        let totalContacted = 0; 
        let totalPending = 0; 
        let totalEnrolled = 0; 
        let totalDelayed = 0;
        let staffMap = {};
        
        const now = new Date();

        leads.forEach(l => {
            const isPending = l.callStatus === 'pending' || !l.callStatus;
            const isEnrolled = l.enrollmentStatus === 'ENROLLED';
            const isContacted = !isPending;
            const round = l.coordinationRound || 1;

            // KPI calculation logic
            const referenceTime = new Date(l.newInqTimestamp || l.updatedAt || l.createdAt);
            const hoursPassed = (now - referenceTime) / (1000 * 60 * 60);
            const daysPassed = hoursPassed / 24;

            let isDelayed = false;
            if (hoursPassed >= 24 && l.phase === 1 && isPending) isDelayed = true;
            if (daysPassed >= 5 && !isEnrolled && round < 2) isDelayed = true;
            if (daysPassed >= 10 && !isEnrolled && round < 3) isDelayed = true;

            if (l.assignedTo) {
                totalAssigned++;
                if (isContacted) totalContacted++;
                if (isPending) totalPending++;
                if (isEnrolled) totalEnrolled++;
                if (isDelayed) totalDelayed++;

                const staffName = l.assignedUser ? `${l.assignedUser.firstName} ${l.assignedUser.lastName}` : `Unknown Staff`;
                
                // 🔥 Initialize Staff Object if not exists 🔥
                if (!staffMap[staffName]) {
                    staffMap[staffName] = { 
                        name: staffName, 
                        overall: { assigned: 0, contacted: 0, pending: 0, enrolled: 0, delayed: 0 },
                        rounds: {
                            1: { assigned: 0, contacted: 0, pending: 0, delayed: 0, leads: [] },
                            2: { assigned: 0, contacted: 0, pending: 0, delayed: 0, leads: [] },
                            3: { assigned: 0, contacted: 0, pending: 0, delayed: 0, leads: [] },
                            PAID: { assigned: 0, contacted: 0, pending: 0, leads: [] }
                        }
                    };
                }

                // 🔥 Overall Stats Update 🔥
                staffMap[staffName].overall.assigned++;
                if (isContacted) staffMap[staffName].overall.contacted++;
                if (isPending) staffMap[staffName].overall.pending++;
                if (isEnrolled) staffMap[staffName].overall.enrolled++;
                if (isDelayed) staffMap[staffName].overall.delayed++;

                // Prepare Lead Object for Export (Inside the rows)
                const exportLead = {
                    id: l.id,
                    phone: l.phone ? l.phone.split('_')[0] : '', 
                    name: l.name || 'Unknown',
                    phase: l.phase || 1,
                    status: l.callStatus || 'pending',
                    enrolled: l.enrollmentStatus || 'NON_ENROLLED',
                    remark: l.feedback || 'No Remark'
                };

                // 🔥 Round-wise Stats Update & Lead Pushing 🔥
                if (isEnrolled) {
                    staffMap[staffName].rounds.PAID.assigned++;
                    if (isContacted) staffMap[staffName].rounds.PAID.contacted++;
                    if (isPending) staffMap[staffName].rounds.PAID.pending++;
                    staffMap[staffName].rounds.PAID.leads.push(exportLead);
                } else {
                    // Make sure custom rounds (>3) don't crash
                    if (!staffMap[staffName].rounds[round]) {
                        staffMap[staffName].rounds[round] = { assigned: 0, contacted: 0, pending: 0, delayed: 0, leads: [] };
                    }
                    staffMap[staffName].rounds[round].assigned++;
                    if (isContacted) staffMap[staffName].rounds[round].contacted++;
                    if (isPending) staffMap[staffName].rounds[round].pending++;
                    if (isDelayed) staffMap[staffName].rounds[round].delayed++;
                    staffMap[staffName].rounds[round].leads.push(exportLead);
                }
            }
        });

        // 🔥 Raw Leads for Master Export Modal 🔥
        const rawLeadsForExport = leads.map(l => ({
            id: l.id,
            phone: l.phone ? l.phone.split('_')[0] : '', // Clean Phone
            name: l.name || 'Unknown',
            assignedToName: l.assignedUser ? `${l.assignedUser.firstName} ${l.assignedUser.lastName}` : 'Unassigned',
            round: l.coordinationRound || 1,
            phase: l.phase || 1,
            callStatus: l.callStatus || 'pending',
            enrollmentStatus: l.enrollmentStatus || 'NON_ENROLLED',
            paymentPlan: l.paymentIntention || 'NOT_DECIDED',
            remark: l.feedback || 'No Remark'
        }));

        res.status(200).json({ 
            totalNewInq, totalAssigned, totalContacted, totalPending, totalEnrolled, totalDelayed, 
            staffBreakdown: Object.values(staffMap),
            rawLeads: rawLeadsForExport
        });
    } catch (error) {
        console.error("New Inq Stats Error:", error);
        res.status(500).json({ error: "Failed to fetch stats" });
    }
};

// ==========================================
// 3. OPEN SEMINAR STATS (ADVANCED WITH ROUND BREAKDOWN & RAW LEADS FOR EXPORT)
// ==========================================
exports.getOpenSeminarStats = async (req, res) => {
    try {
        const { businessId, batchId, startDate, endDate } = req.query;

        // 🔥 FIX: Reverted to purely OPEN_SEMINAR and NORMAL. 
        const whereClause = buildStatsWhereClause(businessId, batchId, startDate, endDate, { 
            campaignType: 'AFTER_SEMINAR', inquiryType: { in: ['OPEN_SEMINAR', 'NORMAL'] } 
        });

        let leads = await prisma.lead.findMany({
            where: whereClause,
            include: { assignedUser: { select: { firstName: true, lastName: true } } }
        });

        // Bridge Transfers අනිවාර්යයෙන්ම අයින් කරන්න
        leads = leads.filter(l => l.source !== 'bridge_transfer');

        let totalOpenSem = leads.length;
        let totalAssigned = 0; 
        let totalContacted = 0; 
        let totalPending = 0; 
        let totalEnrolled = 0; 
        let totalDelayed = 0;
        let staffMap = {};
        
        const now = new Date();

        leads.forEach(l => {
            const isPending = l.callStatus === 'pending' || !l.callStatus;
            const isEnrolled = l.enrollmentStatus === 'ENROLLED';
            const isContacted = !isPending;
            const round = l.coordinationRound || 1;

            const referenceTime = new Date(l.newInqTimestamp || l.updatedAt || l.createdAt);
            const hoursPassed = (now - referenceTime) / (1000 * 60 * 60);
            const daysPassed = hoursPassed / 24;

            let isDelayed = false;
            if (hoursPassed >= 24 && l.phase === 1 && isPending) isDelayed = true;
            if (daysPassed >= 5 && !isEnrolled && round < 2) isDelayed = true;
            if (daysPassed >= 10 && !isEnrolled && round < 3) isDelayed = true;

            if (l.assignedTo) {
                totalAssigned++;
                if (isContacted) totalContacted++;
                if (isPending) totalPending++;
                if (isEnrolled) totalEnrolled++;
                if (isDelayed) totalDelayed++;

                const staffName = l.assignedUser ? `${l.assignedUser.firstName} ${l.assignedUser.lastName}` : `Unknown Staff`;
                
                // Initialize Staff Object if not exists
                if (!staffMap[staffName]) {
                    staffMap[staffName] = { 
                        name: staffName, 
                        overall: { assigned: 0, contacted: 0, pending: 0, enrolled: 0, delayed: 0 },
                        rounds: {
                            1: { assigned: 0, contacted: 0, pending: 0, delayed: 0, leads: [] },
                            2: { assigned: 0, contacted: 0, pending: 0, delayed: 0, leads: [] },
                            3: { assigned: 0, contacted: 0, pending: 0, delayed: 0, leads: [] },
                            PAID: { assigned: 0, contacted: 0, pending: 0, leads: [] }
                        }
                    };
                }

                // Overall Stats Update
                staffMap[staffName].overall.assigned++;
                if (isContacted) staffMap[staffName].overall.contacted++;
                if (isPending) staffMap[staffName].overall.pending++;
                if (isEnrolled) staffMap[staffName].overall.enrolled++;
                if (isDelayed) staffMap[staffName].overall.delayed++;

                // Prepare Lead Object for Export
                const exportLead = {
                    id: l.id,
                    phone: l.phone.split('_')[0], // Clean Phone
                    name: l.name || 'Unknown',
                    phase: l.phase || 1,
                    status: l.callStatus || 'pending',
                    enrolled: l.enrollmentStatus,
                    remark: l.feedback || 'No Remark'
                };

                // Round-wise Stats Update & Lead Pushing
                if (isEnrolled) {
                    staffMap[staffName].rounds.PAID.assigned++;
                    if (isContacted) staffMap[staffName].rounds.PAID.contacted++;
                    if (isPending) staffMap[staffName].rounds.PAID.pending++;
                    staffMap[staffName].rounds.PAID.leads.push(exportLead);
                } else if (round <= 3) {
                    staffMap[staffName].rounds[round].assigned++;
                    if (isContacted) staffMap[staffName].rounds[round].contacted++;
                    if (isPending) staffMap[staffName].rounds[round].pending++;
                    if (isDelayed) staffMap[staffName].rounds[round].delayed++;
                    staffMap[staffName].rounds[round].leads.push(exportLead);
                }
            }
        });

        // 🔥 අලුතෙන් එකතු කරපු කෑල්ල: Export එකට ඕන කරන මුළු Lead Data එකම හදනවා 🔥
        const rawLeadsForExport = leads.map(l => ({
            id: l.id,
            phone: l.phone ? l.phone.split('_')[0] : '', // Clean Phone
            name: l.name || 'Unknown',
            assignedToName: l.assignedUser ? `${l.assignedUser.firstName} ${l.assignedUser.lastName}` : 'Unassigned',
            round: l.coordinationRound || 1,
            phase: l.phase || 1,
            callStatus: l.callStatus || 'pending',
            enrollmentStatus: l.enrollmentStatus || 'NON_ENROLLED',
            paymentPlan: l.paymentIntention || 'NOT_DECIDED',
            remark: l.feedback || 'No Remark'
        }));

        res.status(200).json({ 
            totalOpenSem, totalAssigned, totalContacted, totalPending, totalEnrolled, totalDelayed, 
            staffBreakdown: Object.values(staffMap),
            rawLeads: rawLeadsForExport // 🔥 Export එකට මේක අත්‍යවශ්‍යයි
        });
    } catch (error) {
        console.error("Open Sem Stats Error:", error);
        res.status(500).json({ error: "Failed to fetch stats" });
    }
};

// ==========================================
// 4. BRIDGE PERFORMANCE STATS
// ==========================================
exports.getBridgePerformanceStats = async (req, res) => {
    try {
        const { businessId, batchId, startDate, endDate } = req.query;

        const whereClause = buildStatsWhereClause(businessId, batchId, startDate, endDate, { 
            campaignType: 'AFTER_SEMINAR', source: 'bridge_transfer' 
        });

        const leads = await prisma.lead.findMany({
            where: whereClause,
            include: { assignedUser: { select: { firstName: true, lastName: true } } }
        });

        let totalTransferred = leads.length;
        let totalContacted = 0; let totalPending = 0; let totalEnrolled = 0;
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

        res.status(200).json({ 
            totalTransferred, totalContacted, totalPending, totalEnrolled, 
            staffBreakdown: Object.values(staffMap) 
        });
    } catch (error) {
        console.error("Bridge Stats Error:", error);
        res.status(500).json({ error: "Failed to fetch bridge stats" });
    }
};

// ==========================================
// 5. PAID CAMPAIGN STATS
// ==========================================
exports.getPaidCampaignStats = async (req, res) => {
    try {
        const { businessId, batchId, startDate, endDate } = req.query;

        const whereClause = buildStatsWhereClause(businessId, batchId, startDate, endDate, { 
            campaignType: 'AFTER_SEMINAR', enrollmentStatus: 'ENROLLED' 
        });

        const leads = await prisma.lead.findMany({
            where: whereClause,
            include: { assignedUser: { select: { firstName: true, lastName: true } } }
        });

        let totalPaidLeads = leads.length;
        let totalContacted = 0; let totalPending = 0;
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

        res.status(200).json({ 
            totalPaidLeads, totalContacted, totalPending, 
            staffBreakdown: Object.values(staffMap) 
        });
    } catch (error) {
        console.error("Paid Campaign Stats Error:", error);
        res.status(500).json({ error: "Failed to fetch stats" });
    }
};

// ==========================================
// 6. MASTER DIRECTORY API
// ==========================================
exports.getMasterDirectory = async (req, res) => {
    try {
        const { businessId } = req.query;

        const whereClause = buildStatsWhereClause(businessId, null, null, null, { 
            campaignType: 'AFTER_SEMINAR' 
        });

        const leads = await prisma.lead.findMany({
            where: whereClause,
            select: { id: true, name: true, phone: true, inquiryType: true, paymentIntention: true, enrollmentStatus: true, batchId: true },
            orderBy: { createdAt: 'desc' }
        });

        res.status(200).json({ leads });
    } catch (error) {
        console.error("Master Directory Error:", error);
        res.status(500).json({ error: "Failed to fetch master directory" });
    }
};