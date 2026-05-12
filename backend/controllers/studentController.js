const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const crypto = require('crypto');
const jwt = require('jsonwebtoken'); // 🔥 FIX: Ghost login error fix
const bcrypt = require('bcrypt');
const axios = require('axios');
const streamCache = {};

// 🔥 NEW: BigInt convert karana helper function eka meka hama thanatama pawichi karanawa
const safeJson = (data) => JSON.parse(JSON.stringify(data, (key, value) => typeof value === 'bigint' ? value.toString() : value));

// 1. Dashboard
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
        let upcomingLive = null; // 🔥 NEW: Live Class Variable

        if (enrolledSubjectIds.size > 0) {
            const courseIds = Array.from(enrolledSubjectIds).map(id => BigInt(id));
            const linkedContents = await prisma.contentCourse.findMany({ where: { course_id: { in: courseIds } } });
            
            if (linkedContents.length > 0) {
                const contentIds = linkedContents.map(lc => lc.content_id);
                const allContents = await prisma.content.findMany({ where: { id: { in: contentIds } } });
                
                unlockedVideos = allContents.filter(c => ['live', 'recording', '1', '2'].includes(c.contentType)).length;
                studyMaterials = allContents.filter(c => ['document', 'paper', 'sPaper', '3', '4', '5'].includes(c.contentType)).length;

                // 🔥 NEW LOGIC: හොයනවා අද දවසේ හෝ ඉස්සරහට තියෙන ළඟම Live Class එක
                const startOfToday = new Date();
                startOfToday.setHours(0, 0, 0, 0); // අද දවසේ පටන් ගැන්ම

                const liveClasses = allContents
                    .filter(c => ['live', '1'].includes(c.contentType) && c.date && new Date(c.date) >= startOfToday)
                    .sort((a, b) => new Date(a.date) - new Date(b.date)); // දවස අනුව පිළිවෙලකට හදනවා

                if (liveClasses.length > 0) {
                    const nearestClass = liveClasses[0]; // ළඟම class එක ගන්නවා
                    
                    // ඒකට අදාල Subject එකේ නම හොයනවා
                    const courseLink = linkedContents.find(lc => lc.content_id === nearestClass.id);
                    const courseDetails = courseLink ? await prisma.course.findUnique({ where: { id: Number(courseLink.course_id) } }) : null;

                    upcomingLive = {
                        id: nearestClass.id,
                        title: nearestClass.title,
                        link: nearestClass.link,
                        date: nearestClass.date,
                        startTime: nearestClass.startTime,
                        endTime: nearestClass.endTime,
                        courseName: courseDetails?.name || 'Live Class'
                    };
                }
            }
        }

        res.status(200).json(safeJson({
            enrolledCount: enrolledSubjectIds.size, 
            upcomingLive: upcomingLive, // 🔥 FIX: දැන් null නෙමෙයි, හරියටම live class data එක යවනවා
            posts: posts,
            alerts: alerts,
            duePayments: duePaymentsList,
            stats: { unlockedVideos, studyMaterials }
        }));
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

        const safeData = safeJson(businesses);
        
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
        
        // Status 0 (Pending), 1 (Approved), 4 (PostPay) ඔක්කොම ගන්නවා
        const validPayments = await prisma.payment.findMany({
            where: { studentId: parseInt(studentId), status: { in: [0, 1, 4] } } 
        });

        let enrolled = [];
        validPayments.forEach(p => {
            if (p.subjects) {
                try { 
                    const parsed = JSON.parse(p.subjects);
                    // 🔥 MAGIC FIX: App එකේ Data Type අවුලක් ආවත් match වෙන්න, Number සහ String දෙකම Array එකට දානවා
                    enrolled.push(...parsed.map(Number)); 
                    enrolled.push(...parsed.map(String)); 
                } catch(e) {
                    console.error("Subject Parse Error:", e);
                }
            }
        });

        // ලමයාගේ Wallet Balance එක ගන්නවා
        const user = await prisma.user.findUnique({
            where: { id: parseInt(studentId) },
            select: { walletBalance: true }
        });

        res.status(200).json({
            enrolledSubjects: enrolled,
            walletBalance: user?.walletBalance || 0
        });
    } catch (error) {
        res.status(500).json({ enrolledSubjects: [], walletBalance: 0 });
    }
};

// 3. PayHere Hash 
exports.generatePayHereHash = async (req, res) => {
    try {
        const { amount, orderId, currency } = req.body;
        
        const merchantId = process.env.PAYHERE_MERCHANT_ID || process.env.VITE_PAYHERE_MERCHANT_ID || "222646"; 
        const merchantSecret = process.env.PAYHERE_SECRET || process.env.VITE_PAYHERE_SECRET || "3113931171298094467140764830232859317793"; 

        if (!merchantId || !merchantSecret) {
            console.error("❌ Backend .env missing PayHere keys!");
            return res.status(500).json({ error: "PayHere credentials missing in server .env" });
        }

        const hashedSecret = crypto.createHash('md5').update(merchantSecret).digest('hex').toUpperCase();
        
        // 🔥 FIX: අනිවාර්යයෙන්ම දශමස්ථාන 2කට සීමා කරලා තියෙන්නේ (eg: 44998.00) 🔥
        const amountFormatted = parseFloat(amount).toFixed(2);
        
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
            
            // 1. Payment status eka Approve (1) karanna
            const updatedPayment = await prisma.payment.update({
                where: { id: parseInt(order_id) },
                data: { status: 1 } 
            });

            // 2. Auto Delivery eka hadanna
            const existingDelivery = await prisma.delivery.findUnique({
                where: { paymentId: updatedPayment.id }
            });

            if (!existingDelivery && updatedPayment.subjects) {
                const subIds = JSON.parse(updatedPayment.subjects).map(id => parseInt(id));
                const courses = await prisma.course.findMany({ where: { id: { in: subIds } } });

                if (courses.length > 0) {
                    const paymentTypeStr = parseInt(updatedPayment.payment_type) === 1 ? 'Monthly' : (parseInt(updatedPayment.payment_type) === 2 ? 'Installment' : 'Full');

                    await prisma.delivery.create({
                        data: {
                            paymentId: updatedPayment.id,
                            studentId: updatedPayment.studentId.toString(),
                            businessId: updatedPayment.businessId,
                            paymentType: paymentTypeStr,
                            status: 'Pending',
                            items: {
                                create: courses.map(c => ({
                                    courseId: c.id,
                                    tuteName: c.name || "Tute", 
                                    quantity: 1
                                }))
                            }
                        }
                    });
                    console.log(`🚚 Auto-Delivery created for PayHere Payment ID: ${order_id}`);
                }
            }
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
        
        const slipFileNames = req.files && req.files.length > 0 
            ? req.files.map(f => f.filename).join(',') 
            : null;

        let parsedPaymentType = 1; // Default Monthly (1)
        
        if (paymentMethodChosen) {
            const methodStr = String(paymentMethodChosen).toLowerCase().trim();
            if (methodStr === 'installment' || methodStr === '2') {
                parsedPaymentType = 2; // Installment
            } else if (methodStr === 'full' || methodStr === '3') {
                parsedPaymentType = 3; // Full
            } else if (methodStr === 'monthly' || methodStr === '1') {
                parsedPaymentType = 1; // Monthly
            }
        }

        // 🔥 SECURITY FIX: Frontend eken ena de wiswasa karanne nathuwa DB eke Group Type eka balala hari eka danna
        if (groupId) {
            const groupData = await prisma.group.findUnique({ where: { id: parseInt(groupId) } });
            if (groupData) {
                if (groupData.type === 1) {
                    // Group eka Monthly nam, payment_type eka aniwaryayen 1 (Monthly) wenna onamaයි
                    parsedPaymentType = 1; 
                } else if (groupData.type === 2) {
                    // Group eka Full/Installment nam, payment_type eka 2 hari 3 hari wenna ona
                    // Frontend eken waradila 1 awith thibboth eka 3 (Full) widihata hadanawa
                    if (parsedPaymentType === 1) {
                        parsedPaymentType = 3; 
                    }
                }
            }
        }

        // 🔥 FIX: Simple/Capital අවුල නැති වෙන්න method එක lowercase කරනවා
        const safeMethod = String(method || '').toLowerCase().trim();
        const initialStatus = safeMethod === 'payhere' ? 1 : 0; 

        const newPayment = await prisma.payment.create({
            data: {
                studentId: parseInt(studentId),
                businessId: parseInt(businessId),
                batchId: parseInt(batchId),
                groupId: groupId ? parseInt(groupId) : null,
                subjects: typeof subjects === 'string' ? subjects : JSON.stringify(subjects || []),
                payment_type: parsedPaymentType,
                method: safeMethod === 'slip' ? 'Slip' : 'PayHere',
                status: initialStatus, // 🔥 දැන් මෙතනින් 100% ක් Auto Approve වෙනවා
                slip_image: slipFileNames,
                amount: amount ? parseFloat(parseFloat(amount).toFixed(2)) : 0,
                remark: remark || null 
            }
        });

        // 🔥 NEW: PayHere වලින් ආවොත් කෙලින්ම Delivery එකත් Auto හැදෙන්න ඕනේ
        if (safeMethod === 'payhere' && newPayment.subjects) {
            try {
                const subIds = JSON.parse(newPayment.subjects).map(id => parseInt(id));
                const courses = await prisma.course.findMany({ where: { id: { in: subIds } } });

                if (courses.length > 0) {
                    const paymentTypeStr = parsedPaymentType === 1 ? 'Monthly' : (parsedPaymentType === 2 ? 'Installment' : 'Full');

                    await prisma.delivery.create({
                        data: {
                            paymentId: newPayment.id,
                            studentId: newPayment.studentId.toString(),
                            businessId: newPayment.businessId,
                            paymentType: paymentTypeStr,
                            status: 'Pending', // Delivery Hub එකට Pending කියලා වැටෙනවා
                            items: {
                                create: courses.map(c => ({
                                    courseId: c.id,
                                    tuteName: c.name || "Tute",
                                    quantity: 1
                                }))
                            }
                        }
                    });
                    console.log(`🚚 Auto-Delivery created for Instant PayHere Payment ID: ${newPayment.id}`);
                }
            } catch (err) {
                console.error("Auto Delivery Error:", err);
            }
        }

        // දැන් Postman එකේ 'Payment Approved & Enrolled' කියලා එයි!
        res.status(200).json({ message: safeMethod === 'payhere' ? "Payment Approved & Enrolled" : "Enrolled Successfully" });
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
        const validGroupIds = [...new Set(validPayments.map(p => p.groupId).filter(Boolean))];

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

        const safeData = safeJson(businesses);
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

        const safeData = safeJson({ 
            lessonGroups, 
            contents,
            liveClasses,
            recordings,
            documents,
            sPapers,
            papers,
            paidStatus: 1 
        });
        
        res.status(200).json(safeData);
    } catch (error) {
        console.error("Module Error:", error);
        res.status(500).json({ error: "Failed to load modules" });
    }
};

// 7. Payment History (Updated to send excess, arrears and wallet balance)
exports.getMyPayments = async (req, res) => {
    try {
        const studentId = req.user?.userId || req.user?.id;

        const payments = await prisma.payment.findMany({
            where: { studentId: parseInt(studentId) },
            include: { business: true, batch: true },
            orderBy: { created_at: 'desc' }
        });

        // ළමයාගේ දැනට තියෙන Wallet Balance එකත් ගන්නවා
        const studentData = await prisma.user.findUnique({ 
            where: { id: parseInt(studentId) }, 
            select: { walletBalance: true } 
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
                method: p.method,
                excessAmount: p.excessAmount || 0,  // 🔥 ළමයාට පෙන්වන්න යවනවා
                arrearsAmount: p.arrearsAmount || 0 // 🔥 ළමයාට පෙන්වන්න යවනවා
            };
        });

        // Object එකක් විදිහට යවන්න ඕනේ React එකෙන් catch කරගන්න ලේසි වෙන්න
        const safeData = safeJson({
            oldPayments: formattedPayments,
            walletBalance: studentData?.walletBalance || 0
        });
        
        res.status(200).json(safeData); 
    } catch (error) {
        console.error("History Error:", error);
        res.status(200).json({ oldPayments: [], walletBalance: 0 }); 
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

        // 🔥 FIX: Data center eken yawanakotath safeJson dala yawanawa
        res.status(200).json(safeJson(formattedStudents));
    } catch (error) {
        console.error("Error fetching students data center:", error);
        res.status(500).json({ error: "Failed to fetch students" });
    }
};

// 2. Edit Student Profile 
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

        // 🔥 FIX: Generate Session ID for Ghost Login as well
        const sessionId = crypto.randomBytes(16).toString('hex');
        await prisma.user.update({
            where: { id: user.id },
            data: { session_id: sessionId }
        });

        // 🔥 FIX: Add Session ID to Ghost Token
        const token = jwt.sign(
            { id: user.id, userId: user.id, role: user.role, sessionId: sessionId },
            process.env.JWT_SECRET || "ima_super_secret_token_12345", 
            { expiresIn: '1d' }
        );

        delete user.password;

        // 🔥 FIX: Ghost login datath safeJson haraha yawanawa
        res.status(200).json(safeJson({ token, user }));
    } catch (error) {
        console.error("Ghost login error:", error);
        res.status(500).json({ error: "Failed to ghost login" });
    }
};

// ==========================================
// 🚚 STUDENT DELIVERY MODULE 
// ==========================================

// 1. Get Student's Deliveries
exports.getMyDeliveries = async (req, res) => {
    try {
        const studentId = req.user?.userId || req.user?.id;

        if (!studentId) {
            return res.status(401).json({ error: "Unauthorized access" });
        }

        const deliveries = await prisma.delivery.findMany({
            where: { studentId: studentId.toString() },
            include: { items: true },
            orderBy: { createdAt: 'desc' }
        });

        res.status(200).json(safeJson(deliveries));
    } catch (error) {
        console.error("Fetch Deliveries Error:", error);
        res.status(500).json({ error: "Failed to fetch deliveries." });
    }
};

// 2. Student confirms delivery status (Received / Not Received)
exports.confirmDelivery = async (req, res) => {
    try {
        const { deliveryId, status } = req.body;
        const studentId = req.user?.userId || req.user?.id;

        if (!studentId) {
            return res.status(401).json({ error: "Unauthorized access" });
        }

        // Check if the delivery belongs to the student and is currently "On the way"
        const existingDelivery = await prisma.delivery.findFirst({
            where: { id: parseInt(deliveryId), studentId: studentId.toString() }
        });

        if (!existingDelivery || existingDelivery.status !== 'On the way') {
            return res.status(400).json({ error: "Invalid request or delivery is not 'On the way'." });
        }

        const updatedDelivery = await prisma.delivery.update({
            where: { id: parseInt(deliveryId) },
            data: { 
                status: status, // 'Received' or 'Not Received'
                resolvedAt: new Date()
            }
        });

        res.status(200).json({ message: `Delivery marked as ${status}`, data: safeJson(updatedDelivery) });
    } catch (error) {
        console.error("Confirm Delivery Error:", error);
        res.status(500).json({ error: "Failed to update delivery status." });
    }
};

// 🔥 PERMANENT YOUTUBE IFRAME FIX (NO EXTRACTION) 🔥
exports.getVideoStream = async (req, res) => {
    try {
        const videoId = req.params.videoId;
        
        console.log(`🎬 YouTube Iframe request for ID: ${videoId}`);

        if (!videoId) {
            return res.status(400).json({ error: 'Invalid YouTube ID' });
        }

        // Piped සහ Cobalt APIs ඔක්කොම අයින් කළා (YouTube එකෙන් බ්ලොක් කරලා නිසා).
        // දැන් සර්වර් එක හිර වෙන්නේ නෑ. කෙලින්ම YouTube Embed ලින්ක් එක Frontend එකට යවනවා.
        const embedUrl = `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`;

        res.status(200).json({ 
            stream_url: embedUrl,
            is_youtube_embed: true, // Frontend එකට අඳුරගන්න ලේසි වෙන්න මේක යවනවා
            yt_id: videoId
        });

    } catch (error) {
        console.error("❌ Stream Error:", error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};