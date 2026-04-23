const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const crypto = require('crypto');
const jwt = require('jsonwebtoken'); // 🔥 FIX: Ghost login error fix
const bcrypt = require('bcrypt');

// 1. Dashboard
exports.getStudentDashboard = async (req, res) => {
    try {
        const studentId = req.user?.userId || req.user?.id;

        const posts = await prisma.post.findMany({
            orderBy: { created_at: 'desc' },
            take: 5
        });

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

        let alerts = [];
        let duePaymentsList = [];
        
        const pendingPayments = await prisma.payment.findMany({
            where: { studentId: parseInt(studentId), status: 0 },
            include: { business: true, batch: true }
        });

        const today = new Date();

        pendingPayments.forEach(p => {
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

                if (diffTime < 0) {
                    alerts.push({ type: 'locked', msg: `Your payment for ${courseName} is OVERDUE by ${Math.abs(diffTime)} days. Please pay immediately.` });
                } else if (diffTime <= 1) {
                    alerts.push({ type: 'danger', msg: `Your payment for ${courseName} is due TOMORROW!` });
                } else if (diffTime <= 5) {
                    alerts.push({ type: 'warning', msg: `Your payment for ${courseName} is due in ${diffTime} days.` });
                }
            }
        });

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
            alerts: alerts,
            duePayments: JSON.parse(JSON.stringify(duePaymentsList, (key, value) => typeof value === 'bigint' ? value.toString() : value)),
            stats: { unlockedVideos, studyMaterials }
        });
    } catch (error) {
        console.error("Dashboard Load Error:", error);
        res.status(500).json({ error: "Dashboard load failed" });
    }
};

// 2. Enroll Businesses
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

// 🔥 NEW: ළමයා දැනටමත් ගෙවලා තියෙන subjects වල IDs ගන්නවා (Cart එකටයි Already Paid පෙන්නන්නයි)
exports.getMyEnrolledSubjects = async (req, res) => {
    try {
        const studentId = req.user?.userId || req.user?.id;
        const validPayments = await prisma.payment.findMany({
            where: { studentId: parseInt(studentId), status: { in: [0, 1, 4] } } // Pending + Approved
        });

        let enrolled = [];
        validPayments.forEach(p => {
            if (p.subjects) {
                try { enrolled.push(...JSON.parse(p.subjects).map(Number)); } catch(e){}
            }
        });

        res.status(200).json(enrolled);
    } catch (error) {
        res.status(500).json([]);
    }
};

// 3. PayHere Hash (Updated to strictly use your .env variables)
exports.generatePayHereHash = async (req, res) => {
    try {
        const { amount, orderId, currency } = req.body;
        
        // Fetching directly from your .env file
        const merchantId = process.env.PAYHERE_MERCHANT_ID; 
        const merchantSecret = process.env.PAYHERE_SECRET; 

        if (!merchantId || !merchantSecret) {
            return res.status(500).json({ error: "PayHere credentials missing in server .env" });
        }

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

// 🔥 NEW: PayHere Notify Webhook (Required for PayHere to confirm success)
exports.payhereNotify = async (req, res) => {
    try {
        const { merchant_id, order_id, payhere_amount, payhere_currency, status_code, md5sig } = req.body;
        const merchantSecret = process.env.PAYHERE_SECRET;

        const hashedSecret = crypto.createHash('md5').update(merchantSecret).digest('hex').toUpperCase();
        const hashString = merchant_id + order_id + payhere_amount + payhere_currency + status_code + hashedSecret;
        const localMd5sig = crypto.createHash('md5').update(hashString).digest('hex').toUpperCase();

        if (localMd5sig === md5sig && status_code === "2") {
            // PayHere successfully verified the payment!
            console.log(`[PayHere] Payment successfully verified for Order ID: ${order_id}`);
            // (Your frontend is already saving the enrollment to the DB, so we just acknowledge it here)
        }
        
        // You MUST return a 200 OK so PayHere knows the webhook was received
        res.status(200).send("OK");
    } catch (error) {
        console.error("PayHere Notify Error:", error);
        res.status(500).send("Webhook Error");
    }
};

// 4. Enrollment එක Save කිරීම (Direct Checkout with Multiple Slips & Remark)
exports.enrollStudent = async (req, res) => {
    try {
        const studentId = req.user?.userId || req.user?.id;
        const { businessId, batchId, groupId, subjects, paymentMethodChosen, method, orderId, amount, remark } = req.body;
        
        // Slips ගොඩක් එනවා නම් ඒවා කමා (,) දාලා string එකක් කරනවා DB එකට දාන්න
        const slipFileNames = req.files && req.files.length > 0 
            ? req.files.map(f => f.filename).join(',') 
            : null;

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
                slip_image: slipFileNames,
                amount: amount ? parseFloat(amount) : 0,
                remark: remark || null // 🔥 අලුත් Remark Field එක
            }
        });

        res.status(200).json({ message: "Enrolled Successfully" });
    } catch (error) {
        console.error("Enrollment Save Error:", error);
        res.status(500).json({ error: "Enrollment failed" });
    }
};

// 5. My Classroom
exports.getStudentClassroom = async (req, res) => {
    try {
        const studentId = req.user?.userId || req.user?.id;

        const validPayments = await prisma.payment.findMany({
            where: { studentId: parseInt(studentId), status: { in: [1, 4] } }
        });

        if (validPayments.length === 0) return res.status(200).json({ businesses: [] });

        const validBatchIds = [...new Set(validPayments.map(p => p.batchId).filter(Boolean))];
        const validGroupIds = [...new Set(validPayments.filter(p => p.payment_type === 1).map(p => p.groupId).filter(Boolean))];

        let allowedSubjectIds = [];
        validPayments.forEach(p => {
            if (p.subjects) {
                try {
                    const subs = JSON.parse(p.subjects);
                    allowedSubjectIds = [...allowedSubjectIds, ...subs.map(id => parseInt(id))];
                } catch (e) {}
            }
        });

        const businesses = await prisma.business.findMany({
            where: { batches: { some: { id: { in: validBatchIds } } } },
            include: {
                batches: {
                    where: { id: { in: validBatchIds } },
                    include: {
                        groups: {
                            where: validGroupIds.length > 0 ? { id: { in: validGroupIds } } : undefined,
                            include: { courses: true }
                        }
                    }
                }
            }
        });

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

// 6. Course Modules
exports.getCourseModules = async (req, res) => {
    try {
        const { id } = req.params; 
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

// 7. Payment History
exports.getMyPayments = async (req, res) => {
    try {
        const studentId = req.user?.userId || req.user?.id;

        const payments = await prisma.payment.findMany({
            where: { studentId: parseInt(studentId) },
            include: { business: true, batch: true },
            orderBy: { created_at: 'desc' }
        });

        const formattedPayments = payments.map(p => {
            let frontendStatus = p.status;
            if (p.status === 0 && p.method === 'Slip') frontendStatus = -1; 
            else if (p.status === 0 && p.method === 'Upcoming') frontendStatus = 0; 

            return {
                id: p.id,
                courseName: `${p.business?.name || 'Course'} - ${p.batch?.name || 'Batch'}`,
                amount: p.amount || 0, 
                status: frontendStatus,
                createdDate: p.created_at,
                dueDate: p.due_date,
                isInstallment: p.payment_type === 2,
                installmentNo: p.installment_no,
                method: p.method
            };
        });

        const safeData = JSON.parse(JSON.stringify(formattedPayments, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        ));

        res.status(200).json(safeData); 
    } catch (error) {
        console.error("History Error:", error);
        res.status(200).json([]); 
    }
};

// 8. Profile
exports.updateProfile = async (req, res) => {
    try {
        const rawId = req.user?.userId || req.user?.id || req.userId || req.user;
        const studentId = parseInt(rawId);

        if (!studentId || isNaN(studentId)) {
            return res.status(401).json({ error: "User authorization failed. Please relogin." });
        }

        const { addressHouseNo, addressStreet, city, district } = req.body;
        const image = req.file ? req.file.filename : undefined;

        let updateData = { addressHouseNo, addressStreet, city, district };
        if (image) { updateData.image = image; }

        await prisma.user.update({
            where: { id: studentId },
            data: updateData
        });

        // 🔥 FIX: Return the image name exactly as it was saved
        res.status(200).json({ message: "Profile updated successfully", image: image || null });
    } catch (error) {
        console.error("Profile Update Error:", error);
        res.status(500).json({ error: "Failed to update profile" });
    }
};

exports.updatePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        res.status(200).json({ message: "Password updated successfully" });
    } catch (error) {
        res.status(500).json({ error: "Failed to update password" });
    }
};

// 🔥 NEW: Handle Due Slip Uploads from Payment History
exports.uploadDueSlip = async (req, res) => {
    try {
        const { paymentId, remark } = req.body;
        
        // Mul slips tika join karala gannawa
        const slipFileNames = req.files && req.files.length > 0 
            ? req.files.map(f => f.filename).join(',') 
            : null;

        if (!slipFileNames) {
            return res.status(400).json({ error: "No slips provided" });
        }

        await prisma.payment.update({
            where: { id: parseInt(paymentId) },
            data: {
                slip_image: slipFileNames,
                method: 'Slip',
                status: 0, // Reset to pending so Admin sees it in Pending Tab
                remark: remark || null
            }
        });

        res.status(200).json({ message: "Slip uploaded successfully" });
    } catch (error) {
        console.error("Upload Due Slip Error:", error);
        res.status(500).json({ error: "Failed to upload slip" });
    }
};

// ==========================================
// 🔥 STUDENT DATA CENTER (ADMIN/STAFF USE) 🔥
// ==========================================

// 1. Get all students for Data Center
exports.getStudentsDataCenter = async (req, res) => {
    try {
        const students = await prisma.user.findMany({
            where: {
                role: {
                    in: ['Student', 'STUDENT', 'user', 'USER']
                }
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
                whatsapp: true,
                optionalPhone: true,
                nic: true,
                addressHouseNo: true,
                addressStreet: true,
                city: true,
                district: true,
                image: true,
                role: true,
                // 🔥 අලුතින්: ළමයාගේ ඇත්තටම Enroll වෙලා තියෙන Payments (Status 1 or 4) ගන්නවා
                payments: {
                    where: { status: { in: [1, 4] } },
                    include: {
                        business: true,
                        batch: true
                    }
                }
            },
            orderBy: { id: 'desc' }
        });

        // Data ටික ලස්සනට format කරලා යවනවා
        const formattedStudents = students.map(student => {
            const enrolledBusinesses = new Set();
            const enrolledBatches = new Set();

            student.payments.forEach(p => {
                if (p.business) enrolledBusinesses.add(p.business.name);
                if (p.batch) enrolledBatches.add(p.batch.name);
            });

            // We don't need to send all payments back to frontend, just the arrays
            delete student.payments;

            return {
                ...student,
                enrolledBusinesses: Array.from(enrolledBusinesses),
                enrolledBatches: Array.from(enrolledBatches)
            };
        });

        res.status(200).json(formattedStudents);
    } catch (error) {
        console.error("Error fetching students data center:", error);
        res.status(500).json({ error: "Failed to fetch students" });
    }
};

// 2. Edit Student Profile (🔥 Updated with ALL fields)
exports.updateStudentByAdmin = async (req, res) => {
    try {
        const { 
            id, firstName, lastName, phone, whatsapp, optionalPhone, 
            nic, addressHouseNo, addressStreet, city, district 
        } = req.body;

        await prisma.user.update({
            where: { id: parseInt(id) },
            data: { 
                firstName, lastName, phone, whatsapp, optionalPhone, 
                nic, addressHouseNo, addressStreet, city, district 
            }
        });
        res.status(200).json({ message: "Student updated successfully" });
    } catch (error) {
        console.error("Update student error:", error);
        res.status(500).json({ error: "Failed to update student" });
    }
};

// 3. Reset Student Password
exports.resetStudentPassword = async (req, res) => {
    try {
        const { studentId, newPassword } = req.body;
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        await prisma.user.update({
            where: { id: parseInt(studentId) },
            data: { password: hashedPassword }
        });
        
        res.status(200).json({ message: "Password reset successful" });
    } catch (error) {
        console.error("Reset password error:", error);
        res.status(500).json({ error: "Failed to reset password" });
    }
};

// 4. Ghost Login
exports.ghostLogin = async (req, res) => {
    try {
        const { studentId } = req.body;
        const user = await prisma.user.findUnique({ where: { id: parseInt(studentId) } });
        
        if (!user) return res.status(404).json({ error: "Student not found" });

        const token = jwt.sign(
            { id: user.id, userId: user.id, role: user.role },
            process.env.JWT_SECRET || "ima_super_secret_token_12345", 
            { expiresIn: '1d' }
        );

        delete user.password;

        res.status(200).json({ token, user });
    } catch (error) {
        console.error("Ghost login error:", error);
        res.status(500).json({ error: "Failed to ghost login" });
    }
};