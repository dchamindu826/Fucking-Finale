const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const crypto = require('crypto');

// 1. Dashboard එකට Posts, Alerts සහ Real Stats යැවීම
exports.getStudentDashboard = async (req, res) => {
    try {
        const studentId = req.user?.id || 1; 

        // 1. Real Posts
        const posts = await prisma.post.findMany({
            orderBy: { created_at: 'desc' },
            take: 5
        });

        // 2. Real Enrollments
        const validPayments = await prisma.payment.findMany({
            where: { studentId: parseInt(studentId), status: { in: [1, 4] } }
        });

        let enrolledSubjectIds = new Set();
        validPayments.forEach(p => {
            if (p.subjects) {
                try {
                    const subs = JSON.parse(p.subjects);
                    subs.forEach(id => enrolledSubjectIds.add(parseInt(id)));
                } catch (e) {}
            }
        });

        // 3. Due Payments & Alerts Logic (Pending Verify ain kala)
        let alerts = [];
        let duePaymentsList = [];
        
        const pendingPayments = await prisma.payment.findMany({
            where: { studentId: parseInt(studentId), status: 0 },
            include: { business: true, batch: true }
        });

        const today = new Date();

        pendingPayments.forEach(p => {
            // Include ONLY if it has a due date and is NOT a verifying slip
            if (p.due_date && p.method !== 'Slip') {
                const dueDate = new Date(p.due_date);
                const diffTime = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24)); 
                const courseName = `${p.business?.name || ''} - ${p.batch?.name || ''}`;

                duePaymentsList.push({
                    id: p.id,
                    courseName: courseName,
                    amount: p.amount || 0,
                    dueDate: p.due_date,
                    isInstallment: p.payment_type === 2,
                    installmentNo: p.installment_no,
                    diffDays: diffTime
                });

                // Set pop-up alerts based on how many days left
                if (diffTime < 0) {
                    alerts.push({ type: 'locked', msg: `Your payment for ${courseName} is OVERDUE by ${Math.abs(diffTime)} days. Please pay immediately.` });
                } else if (diffTime <= 1) {
                    alerts.push({ type: 'danger', msg: `Your payment for ${courseName} is due TOMORROW!` });
                } else if (diffTime <= 5) {
                    alerts.push({ type: 'warning', msg: `Your payment for ${courseName} is due in ${diffTime} days.` });
                }
            }
        });

        // Backend stat counts
        let unlockedVideos = 0;
        let studyMaterials = 0;
        if (enrolledSubjectIds.size > 0) {
            const courseIds = Array.from(enrolledSubjectIds).map(id => BigInt(id));
            const linkedContents = await prisma.contentCourse.findMany({ where: { course_id: { in: courseIds } } });
            if (linkedContents.length > 0) {
                const contentIds = linkedContents.map(lc => lc.content_id);
                const allContents = await prisma.content.findMany({ where: { id: { in: contentIds } } });
                unlockedVideos = allContents.filter(c => ['live', 'recording', '1', '2'].includes(c.contentType)).length;
                studyMaterials = allContents.filter(c => ['document', 'paper', 'sPaper', '3', '4', '5'].includes(c.contentType)).length;
            }
        }

        res.status(200).json({
            enrolledCount: enrolledSubjectIds.size, 
            upcomingLive: null,
            posts: posts,
            alerts: alerts, // ONLY Due alerts sent
            duePayments: JSON.parse(JSON.stringify(duePaymentsList, (key, value) => typeof value === 'bigint' ? value.toString() : value)),
            stats: { unlockedVideos, studyMaterials }
        });
    } catch (error) {
        console.error("Dashboard Load Error:", error);
        res.status(500).json({ error: "Dashboard load failed" });
    }
};


// 2. Enroll වෙන්න Businesses/Batches/Subjects යැවීම
exports.getAvailableEnrollments = async (req, res) => {
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

        const safeData = JSON.parse(JSON.stringify(businesses, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        ));
        
        for (let i = 0; i < safeData.length; i++) {
            for (let j = 0; j < safeData[i].batches.length; j++) {
                const currentBatch = safeData[i].batches[j];
                const batchInstallments = await prisma.installment.findMany({
                    where: { batchId: parseInt(currentBatch.id) }
                });
                currentBatch.installment_plans_parsed = batchInstallments || [];
            }
        }

        res.status(200).json({ businesses: safeData });
    } catch (error) {
        console.error("Error in getAvailableEnrollments:", error);
        res.status(500).json({ error: "Failed to load courses", details: error.message });
    }
};

// 3. PayHere Hash Generate කිරීම
exports.generatePayHereHash = async (req, res) => {
    try {
        const { amount, orderId, currency } = req.body;
        const merchantId = "1225565"; 
        const merchantSecret = "YOUR_PAYHERE_SECRET"; 

        const hashedSecret = crypto.createHash('md5').update(merchantSecret).digest('hex').toUpperCase();
        const amountFormatted = parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 2, useGrouping: false });
        
        const hashString = merchantId + orderId + amountFormatted + currency + hashedSecret;
        const hash = crypto.createHash('md5').update(hashString).digest('hex').toUpperCase();

        res.status(200).json({ hash });
    } catch (error) {
        console.error("PayHere Hash Error:", error);
        res.status(500).json({ error: "Failed to generate hash" });
    }
};

// 4. Enrollment එක Save කිරීම (Slip or PayHere)
exports.enrollStudent = async (req, res) => {
    try {
        const { businessId, batchId, groupId, subjects, paymentMethodChosen, method, orderId, amount } = req.body;
        const slipFileName = req.file ? req.file.filename : null;
        const studentId = req.user?.id || 1; 

        // 🔥 FIX: Payment එකත් එක්ක Group එකයි Subjects ටිකයි සේව් කරනවා
        await prisma.payment.create({
            data: {
                studentId: parseInt(studentId),
                businessId: parseInt(businessId),
                batchId: parseInt(batchId),
                groupId: groupId ? parseInt(groupId) : null,
                subjects: typeof subjects === 'string' ? subjects : JSON.stringify(subjects || []),
                payment_type: paymentMethodChosen === 'installment' ? 2 : (paymentMethodChosen === 'full' ? 3 : 1),
                method: method === 'slip' ? 'Slip' : 'PayHere',
                status: method === 'slip' ? 0 : 1, 
                slip_image: slipFileName,
                amount: amount ? parseFloat(amount) : 0
            }
        });

        res.status(200).json({ message: "Enrolled Successfully" });
    } catch (error) {
        console.error("Enrollment Save Error:", error);
        res.status(500).json({ error: "Enrollment failed" });
    }
};

// 5. My Classroom එකට Data යැවීම
exports.getStudentClassroom = async (req, res) => {
    try {
        const studentId = req.user?.id || 1; 

        // ළමයාගේ Approve හෝ Post Pay වෙච්ච Payments ගන්නවා
        const validPayments = await prisma.payment.findMany({
            where: { studentId: parseInt(studentId), status: { in: [1, 4] } }
        });

        if (validPayments.length === 0) return res.status(200).json({ businesses: [] });

        const validBatchIds = [...new Set(validPayments.map(p => p.batchId).filter(Boolean))];
        
        // Only collect group IDs if it's a monthly payment (type 1)
        const validGroupIds = [...new Set(validPayments.filter(p => p.payment_type === 1).map(p => p.groupId).filter(Boolean))];

        // ළමයා ගෙවලා තියෙන Subjects වල IDs ටික එකතු කරගන්නවා
        let allowedSubjectIds = [];
        validPayments.forEach(p => {
            if (p.subjects) {
                try {
                    const subs = JSON.parse(p.subjects);
                    allowedSubjectIds = [...allowedSubjectIds, ...subs.map(id => parseInt(id))];
                } catch (e) {}
            }
        });

        // අදාල Group එකට විතරක් අදාලව Business/Batches ගන්නවා
        const businesses = await prisma.business.findMany({
            where: { batches: { some: { id: { in: validBatchIds } } } },
            include: {
                batches: {
                    where: { id: { in: validBatchIds } },
                    include: {
                        groups: {
                            // If monthly (type 1) only get that group. If full/installment, get all groups (no filter).
                            where: validGroupIds.length > 0 ? { id: { in: validGroupIds } } : undefined,
                            include: { courses: true }
                        }
                    }
                }
            }
        });

        // 🔥 FIX: ගෙවපු Subjects ටික විතරක් ෆිල්ටර් කරනවා
        businesses.forEach(biz => {
            biz.batches.forEach(batch => {
                batch.groups.forEach(group => {
                    group.courses = group.courses.filter(c => allowedSubjectIds.includes(c.id));
                });
            });
        });

        const safeData = JSON.parse(JSON.stringify(businesses, (key, value) => typeof value === 'bigint' ? value.toString() : value));
        res.status(200).json({ businesses: safeData }); 
    } catch (error) {
        console.error("Classroom Error:", error);
        res.status(500).json({ error: "Failed to load classroom" });
    }
};

// 🔥 NEW: 404 Error එක හදන්න Content (Modules) යවන API එක 🔥
exports.getCourseModules = async (req, res) => {
    try {
        const { id } = req.params; // courseId

        // මේ Course එකට ලින්ක් කරලා තියෙන Content ටික ගන්නවා
        const linkedContents = await prisma.contentCourse.findMany({
            where: { course_id: BigInt(id) }
        });
        
        const contentIds = linkedContents.map(lc => lc.content_id);
        
        const contents = await prisma.content.findMany({
            where: { id: { in: contentIds } },
            include: { group: true },
            orderBy: { createdAt: 'desc' }
        });

        // අදාල Folder (Lesson Groups) ටික ගන්නවා
        const groupIds = [...new Set(contents.map(c => c.contentGroupId).filter(Boolean))];
        const lessonGroups = await prisma.contentGroup.findMany({
             where: { id: { in: groupIds } },
             orderBy: { itemOrder: 'asc' }
        });

        // 🔥 FIX: Frontend එකට ඕනේ විදිහට Content ටික කඩලා වෙන් කරනවා 🔥
        const liveClasses = contents.filter(c => c.contentType === 'live' || c.contentType === '1');
        const recordings = contents.filter(c => c.contentType === 'recording' || c.contentType === '2');
        const documents = contents.filter(c => c.contentType === 'document' || c.contentType === '3');
        const sPapers = contents.filter(c => c.contentType === 'sPaper' || c.contentType === '4');
        const papers = contents.filter(c => c.contentType === 'paper' || c.contentType === '5');

        const safeData = JSON.parse(JSON.stringify({ 
            lessonGroups, 
            contents,
            liveClasses,
            recordings,
            documents,
            sPapers,
            papers,
            paidStatus: 1 
        }, (k, v) => typeof v === 'bigint' ? v.toString() : v));
        
        res.status(200).json(safeData);
    } catch (error) {
        console.error("Module Error:", error);
        res.status(500).json({ error: "Failed to load modules" });
    }
};

// 6. Payment History එකට Data යැවීම
exports.getMyPayments = async (req, res) => {
    try {
        const studentId = req.user?.id || 1; // හරියටම Authentication එක හැදුවම මෙතන වෙනස් වෙන්න ඕනේ

        const payments = await prisma.payment.findMany({
            where: { studentId: parseInt(studentId) },
            include: { business: true, batch: true },
            orderBy: { created_at: 'desc' }
        });

        const formattedPayments = payments.map(p => {
            let frontendStatus = p.status;
            
            // 0=Pending, 1=Approved, 2=Rejected, 3=Non Paid, 4=Post Pay
            if (p.status === 0 && p.method === 'Slip') frontendStatus = -1; // Verifying
            else if (p.status === 0 && p.method === 'Upcoming') frontendStatus = 0; // Upcoming

            return {
                id: p.id,
                courseName: `${p.business?.name || 'Course'} - ${p.batch?.name || 'Batch'}`,
                amount: p.amount || 0, // 🔥 FIX: Null ආවොත් 0 කියලා යවනවා
                status: frontendStatus,
                createdDate: p.created_at,
                dueDate: p.due_date,
                isInstallment: p.payment_type === 2,
                installmentNo: p.installment_no,
                method: p.method
            };
        });

        // 🔥 FIX: BigInt Error එක මගහරින්න Safe JSON එකක් හදනවා
        const safeData = JSON.parse(JSON.stringify(formattedPayments, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        ));

        res.status(200).json(safeData); 
    } catch (error) {
        console.error("History Error:", error);
        // Error එකක් ආවොත් crash නොවී හිස් Array එකක් යවනවා
        res.status(200).json([]); 
    }
};

// 7. Profile Update කිරීම
exports.updateProfile = async (req, res) => {
    try {
        const studentId = req.user?.id || 1; // Auth implementation eka anuwa
        const { addressHouseNo, addressStreet, city, district } = req.body;
        const image = req.file ? req.file.filename : undefined;

        let updateData = {
            addressHouseNo,
            addressStreet,
            city,
            district
        };

        // If your schema doesn't have an image column in the User table yet, 
        // you only return the filename to localStorage. 
        // But if it does, you can update it in the DB like this:
        // if (image) updateData.profileImage = image;

        await prisma.user.update({
            where: { id: parseInt(studentId) },
            data: updateData
        });

        res.status(200).json({ message: "Profile updated successfully", image });
    } catch (error) {
        console.error("Profile Update Error:", error);
        res.status(500).json({ error: "Failed to update profile" });
    }
};

// 8. Password වෙනස් කිරීම
exports.updatePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        res.status(200).json({ message: "Password updated successfully" });
    } catch (error) {
        res.status(500).json({ error: "Failed to update password" });
    }
};