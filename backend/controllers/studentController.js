const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const crypto = require('crypto'); // PayHere Hash එක හදන්න අවශ්‍යයි

// 1. Dashboard එකට Posts & Alerts යැවීම
exports.getStudentDashboard = async (req, res) => {
    try {
        const posts = await prisma.post.findMany({
            orderBy: { created_at: 'desc' },
            take: 5
        });

        res.status(200).json({
            enrolledCount: 3, 
            upcomingLive: { title: "Physics Revision", courseName: "2026 AL", link: "https://zoom.us" },
            posts: posts,
            alerts: []
        });
    } catch (error) {
        res.status(500).json({ error: "Dashboard load failed" });
    }
};

// 2. Enroll වෙන්න Businesses/Batches/Subjects යැවීම (🔥 500 Error එක Fix කරපු තැන 🔥)
exports.getAvailableEnrollments = async (req, res) => {
    try {
        const businesses = await prisma.business.findMany({
            where: { status: 1 },
            include: {
                batches: {
                    where: { status: 1 },
                    include: {
                        groups: {
                            include: { courses: true }
                        }
                    }
                }
            }
        });

        // JSON BigInt issue එක fix කිරීම
        const safeData = JSON.parse(JSON.stringify(businesses, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        ));
        
        // Prisma schema relation errors මගහරින්න Installments වෙනම අරන් Map කරනවා
        for (let i = 0; i < safeData.length; i++) {
            for (let j = 0; j < safeData[i].batches.length; j++) {
                const currentBatch = safeData[i].batches[j];
                
                // මේ Batch එකට අදාල Installments ගන්නවා
                const batchInstallments = await prisma.installment.findMany({
                    where: { batchId: parseInt(currentBatch.id) }
                });
                
                // Frontend එක බලාපොරොත්තු වෙන විදිහට අලුත් Property එකට දානවා
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
        const merchantId = "1225565"; // ඔයාගේ Live/Sandbox Merchant ID එක මෙතනට දාන්න
        const merchantSecret = "YOUR_PAYHERE_SECRET"; // PayHere එකෙන් දෙන Secret එක

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
        const { businessId, batchId, groupId, subjects, paymentMethodChosen, method, orderId } = req.body;
        const slipFileName = req.file ? req.file.filename : null;

        console.log("New Enrollment Received:");
        console.log({ businessId, batchId, groupId, subjects, paymentMethodChosen, method, orderId, slipFileName });

        // TODO: මෙතනදී Database එකේ Enrollment table එකටයි Payment table එකටයි දත්ත save කරන්න (Prisma Create Queries)
        // Payment status එක slip නම් Pending (0) විදිහටත්, payhere නම් Success (1) විදිහටත් දාන්න.

        res.status(200).json({ message: "Enrolled Successfully" });
    } catch (error) {
        console.error("Enrollment Save Error:", error);
        res.status(500).json({ error: "Enrollment failed" });
    }
};

// ==========================================
// අලුතින් එකතු කරපු Student Functions ටික 
// ==========================================

// 1. My Classroom එකට Data යැවීම
exports.getStudentClassroom = async (req, res) => {
    try {
        // TODO: Get enrolled courses for the logged-in student from DB
        res.status(200).json({ businesses: [] }); // දැනට හිස් Array එකක් යවමු 404 නැතිවෙන්න
    } catch (error) {
        res.status(500).json({ error: "Failed to load classroom" });
    }
};

// 2. Payment History එකට Data යැවීම
exports.getMyPayments = async (req, res) => {
    try {
        // TODO: Get payment history from DB
        // 🔥 මෙතන Object එක වෙනුවට හිස් Array එකක් යවන්න ([]) 🔥
        res.status(200).json([]); 
    } catch (error) {
        res.status(500).json({ error: "Failed to load payments" });
    }
};

// 3. Profile Update කිරීම
exports.updateProfile = async (req, res) => {
    try {
        const { fName, lName } = req.body;
        const image = req.file ? req.file.filename : null;
        // TODO: Update DB
        res.status(200).json({ message: "Profile updated successfully", image });
    } catch (error) {
        res.status(500).json({ error: "Failed to update profile" });
    }
};

// 4. Password වෙනස් කිරීම
exports.updatePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        // TODO: Check old password and hash new password -> save to DB
        res.status(200).json({ message: "Password updated successfully" });
    } catch (error) {
        res.status(500).json({ error: "Failed to update password" });
    }
};