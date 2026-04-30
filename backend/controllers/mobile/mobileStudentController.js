const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');



const safeJson = (data) => JSON.parse(JSON.stringify(data, (key, value) => typeof value === 'bigint' ? value.toString() : value));

exports.getMobileBusinesses = async (req, res) => {
    try {
        const businesses = await prisma.business.findMany({
            where: { status: 1 },
            include: {
                batches: {
                    where: { status: 1 },
                    include: {
                        groups: { include: { courses: true } }
                    }
                }
            }
        });

        const formattedBusinesses = businesses.map(biz => {
            return {
                id: biz.id,
                name: biz.name,
                category: biz.category,
                streams: biz.streams || "All",
                logo: biz.logo || "default.png",
                batches: biz.batches.map(batch => {
                    return {
                        id: batch.id,
                        name: batch.name,
                        logo: batch.logo || "default.png",
                        groups: batch.groups.map(g => ({
                            id: g.id,
                            name: g.name,
                            type: g.type,
                            discount_rules: g.discount_rules,
                            courses: g.courses.map(c => ({
                                id: c.id,
                                name: c.name,
                                code: c.code,
                                price: c.price,
                                stream: c.stream || "All",
                                isDiscountExcluded: c.isDiscountExcluded,
                                lecturerName: c.lecturerName, 
                                groupPrices: c.groupPrices
                            }))
                        }))
                    }
                })
            }
        });

        res.status(200).json({ businesses: safeJson(formattedBusinesses) });
    } catch (error) {
        console.error("Mobile Get Businesses Error:", error);
        res.status(500).json({ error: "Failed to load courses" });
    }
};

exports.getMobileInstallments = async (req, res) => {
    try {
        const { batchId } = req.params;
        const plans = await prisma.installment.findMany({ where: { batchId: parseInt(batchId) } });
        res.status(200).json(safeJson(plans));
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch installments" });
    }
};

exports.getMobilePayments = async (req, res) => {
    try {
        const studentId = req.user?.userId || req.user?.id;

        const payments = await prisma.payment.findMany({
            where: { studentId: parseInt(studentId) },
            include: { business: true, batch: true },
            orderBy: { created_at: 'desc' }
        });

        let history = [];
        let upcoming = [];

        payments.forEach(p => {
            const isVerifying = p.status === -1 || (p.status === 0 && p.method === 'Slip');
            
            const basePayment = {
                id: p.id,
                courseName: `${p.business?.name || ''} - ${p.batch?.name || ''}`,
                amount: p.amount,
                status: p.status,
                method: p.method,
                createdDate: p.created_at,
                dueDate: p.due_date,
                isInstallment: p.payment_type === 2,
                installmentNo: p.installment_no,
                batchLogo: p.batch?.logo
            };

            if (p.status === 1 || p.status === 2 || p.status === 4 || isVerifying) {
                basePayment.displayStatus = (p.status === 1 || p.status === 4) ? 'Approved' 
                                            : p.status === 2 ? 'Rejected' 
                                            : 'Pending Review';
                history.push(basePayment);
            } else {
                upcoming.push(basePayment);
            }
        });

        res.status(200).json(safeJson({ history, upcoming }));
    } catch (error) {
        console.error("Mobile Payments Error:", error);
        res.status(500).json({ error: "Failed to load payments" });
    }
};

exports.getMobileClassroom = async (req, res) => {
    try {
        const studentId = req.user?.userId || req.user?.id || req.userId;

        const validPayments = await prisma.payment.findMany({
            where: { studentId: parseInt(studentId), status: { in: [1, 4] } }
        });

        if (validPayments.length === 0) return res.status(200).json([]);

        let allowedSubjectIds = [];
        validPayments.forEach(p => {
            if (p.subjects) {
                try { 
                    const parsedIds = JSON.parse(p.subjects).map(id => parseInt(id, 10));
                    allowedSubjectIds.push(...parsedIds);
                } catch(e){}
            }
        });

        const uniqueIds = [...new Set(allowedSubjectIds)];

        if (uniqueIds.length === 0) return res.status(200).json([]);

        const mySubjects = await prisma.course.findMany({
            where: { id: { in: uniqueIds } },
            include: {
                group: { include: { batch: { include: { business: true } } } }
            }
        });

        const formattedClassroom = mySubjects.map(sub => ({
            id: sub.id.toString(), 
            name: sub.name,
            code: sub.code,
            businessName: sub.group?.batch?.business?.name || "IMA",
            businessLogo: sub.group?.batch?.business?.logo || "default.png",
            batchName: sub.group?.batch?.name || "",
            batchLogo: sub.group?.batch?.logo || "default.png", 
            description: sub.lecturerName || sub.description
        }));

        res.status(200).json(safeJson(formattedClassroom));
    } catch (error) {
        console.error("Mobile Classroom Error:", error);
        res.status(500).json({ error: "Failed to load classroom" });
    }
};

exports.getCourseModules = async (req, res) => {
    try {
        const { id } = req.params; 
        const studentId = req.user?.userId || req.user?.id || req.userId;

        if (!studentId) return res.status(401).json({ error: "Authorization failed" });

        const allPayments = await prisma.payment.findMany({
            where: { studentId: parseInt(studentId) }
        });

        let isEnrolled = false;
        let isPending = false;

        allPayments.forEach(p => {
            if (p.subjects) {
                try {
                    const parsedIds = JSON.parse(p.subjects).map(subId => parseInt(subId, 10));
                    if (parsedIds.includes(parseInt(id, 10))) {
                        if (p.status === 1 || p.status === 4) {
                            isEnrolled = true;
                        } else if (p.status === 0 || p.status === -1) {
                            isPending = true;
                        }
                    }
                } catch(e){}
            }
        });

        let paidStatus = 0; 
        if (isEnrolled) paidStatus = 1; 
        else if (isPending) paidStatus = -1; 

        const linkedContents = await prisma.contentCourse.findMany({
            where: { course_id: BigInt(id) }
        });
        
        const contentIds = linkedContents.map(lc => lc.content_id);
        
        const contents = await prisma.content.findMany({
            where: { id: { in: contentIds } },
            include: { group: true },
            orderBy: { createdAt: 'desc' }
        });

        const groupIds = [...new Set(contents.map(c => c.contentGroupId).filter(Boolean))];
        const lessonGroups = await prisma.contentGroup.findMany({
             where: { id: { in: groupIds } },
             orderBy: { itemOrder: 'asc' }
        });

        const liveClasses = contents.filter(c => c.contentType === 'live' || c.contentType === '1');
        const recordings = contents.filter(c => c.contentType === 'recording' || c.contentType === '2');
        const documents = contents.filter(c => c.contentType === 'document' || c.contentType === '3');
        const sPapers = contents.filter(c => c.contentType === 'sPaper' || c.contentType === '4');
        const papers = contents.filter(c => c.contentType === 'paper' || c.contentType === '5');

        const safeData = JSON.parse(JSON.stringify({ 
            lessonGroups, contents, liveClasses, recordings, documents, sPapers, papers,
            paidStatus: paidStatus 
        }, (k, v) => typeof v === 'bigint' ? v.toString() : v));
        
        res.status(200).json(safeData);
    } catch (error) {
        console.error("Module Error:", error);
        res.status(500).json({ error: "Failed to load modules" });
    }
};

// 🔥 FIX: Prisma relation error එක මඟහරින්න Courses ටික වෙනම අරන් map කරනවා
// 🔥 FIX: Prisma relation error එක මඟහරින්න Courses ටික වෙනම අරන් map කරනවා
exports.getMobileUpcomingLives = async (req, res) => {
    try {
        const studentId = req.user?.userId || req.user?.id || req.userId;
        if (!studentId) return res.status(401).json({ error: "Authorization failed" });

        const validPayments = await prisma.payment.findMany({
            where: { studentId: parseInt(studentId), status: { in: [1, 4] } }
        });

        let allowedSubjectIds = [];
        validPayments.forEach(p => {
            if (p.subjects) {
                try { 
                    const parsedIds = JSON.parse(p.subjects).map(id => parseInt(id, 10));
                    allowedSubjectIds.push(...parsedIds);
                } catch(e){}
            }
        });

        const uniqueSubjectIds = [...new Set(allowedSubjectIds)];
        if (uniqueSubjectIds.length === 0) return res.status(200).json({ liveClasses: [] });

        // 1. Get Linked Contents (Without including course)
        let linkedContents = [];
        try {
            linkedContents = await prisma.contentCourse.findMany({
                where: { course_id: { in: uniqueSubjectIds.map(id => BigInt(id)) } }
            });
        } catch (e1) {
            try {
                linkedContents = await prisma.contentCourse.findMany({
                    where: { course_id: { in: uniqueSubjectIds } }
                });
            } catch (e2) {
                console.log("ContentCourse Fetch Error:", e2);
            }
        }

        if (!linkedContents || linkedContents.length === 0) return res.status(200).json({ liveClasses: [] });

        // 2. Fetch Course Names separately
        let coursesList = [];
        try {
            coursesList = await prisma.course.findMany({
                where: { id: { in: uniqueSubjectIds.map(id => BigInt(id)) } },
                select: { id: true, name: true }
            });
        } catch(e) {
            try {
                coursesList = await prisma.course.findMany({
                    where: { id: { in: uniqueSubjectIds } },
                    select: { id: true, name: true }
                });
            } catch(e2){}
        }

        const contentIds = [...new Set(linkedContents.map(lc => lc.content_id))];

        // 3. Fetch Live Contents
        let liveContents = [];
        try {
            liveContents = await prisma.content.findMany({
                where: {
                    id: { in: contentIds.map(id => BigInt(id.toString())) },
                    contentType: { in: ['live', '1'] }
                },
                orderBy: { date: 'asc' }
            });
        } catch (e1) {
            try {
                liveContents = await prisma.content.findMany({
                    where: {
                        id: { in: contentIds.map(id => parseInt(id.toString(), 10)) },
                        contentType: { in: ['live', '1'] }
                    },
                    orderBy: { date: 'asc' }
                });
            } catch (e2) {
                console.log("Content Fetch Error:", e2);
            }
        }

        // 4. Map everything together
        const formattedLives = liveContents.map(c => {
            const linkObj = linkedContents.find(lc => lc.content_id.toString() === c.id.toString());
            const courseObj = coursesList.find(cr => cr.id.toString() === linkObj?.course_id?.toString());
            
            let dateStr = "";
            if (c.date) {
                const d = new Date(c.date);
                dateStr = d.toISOString().split('T')[0]; 
            }

            return {
                id: c.id.toString(),
                courseName: courseObj?.name || "Live Class",
                title: c.title,
                date: dateStr,
                startTime: c.startTime,
                endTime: c.endTime,
                link: c.link,
                zoomMeetingId: c.meetingId,
                paidStatus: 1 
            };
        });

        res.status(200).json(safeJson({ liveClasses: formattedLives }));
    } catch (error) {
        console.error("Live Classes Fetch Error:", error);
        res.status(500).json({ error: "Failed to load live classes" });
    }
};

// 🔥 Mobile Password Change Logic
exports.updateMobilePassword = async (req, res) => {
    try {
        const studentId = req.user?.userId || req.user?.id;
        const { currentPassword, newPassword } = req.body;

        if (!studentId) return res.status(401).json({ error: "Unauthorized" });

        // 1. Student wa DB eken hoyaganna
        const student = await prisma.user.findUnique({ where: { id: parseInt(studentId) } });
        if (!student) return res.status(404).json({ error: "Student not found" });

        // 2. Dan thiyena password eka match wenawada kiyala balanna
        const isMatch = await bcrypt.compare(currentPassword, student.password);
        if (!isMatch) return res.status(400).json({ error: "Current password is incorrect" });

        // 3. Aluth password eka hash karanna (Encrypt karanna)
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);

        // 4. Aluth password eka DB eke update karanna
        await prisma.user.update({
            where: { id: parseInt(studentId) },
            data: { password: hashedNewPassword }
        });

        res.status(200).json({ message: "Password updated successfully" });
    } catch (error) {
        console.error("Password Update Error:", error);
        res.status(500).json({ error: "Failed to change password" });
    }
};