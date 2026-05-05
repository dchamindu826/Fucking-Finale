const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ================= DELIVERY POS ACTIONS =================

// 1. Pending Deliveries ගන්න (Business & Payment Type අනුව)
exports.getPendingDeliveries = async (req, res) => {
    try {
        const { businessId, paymentType } = req.query;
        
        let whereClause = { status: 'Pending' };
        if (businessId) whereClause.businessId = parseInt(businessId);
        if (paymentType && paymentType !== 'All') whereClause.paymentType = paymentType;

        const deliveries = await prisma.delivery.findMany({
            where: whereClause,
            include: {
                items: true,
                payment: { 
                    include: { 
                        student: true 
                    } 
                }
            }
        });

        const formatted = deliveries.map(d => ({
            ...d,
            studentName: d.payment?.student ? `${d.payment.student.firstName} ${d.payment.student.lastName}` : 'Unknown',
            studentNo: d.payment?.student ? `STU-${d.payment.student.id}` : 'STU-000',
            address: d.payment?.address || 'N/A',
            phone: d.payment?.phone || 'N/A'
        }));

        // 🔥 මෙතන return එකක් දාන්න. එතකොට මෙතනින් function එක නතර වෙනවා.
        return res.status(200).json(formatted);

    } catch (error) {
        console.error("Fetch Pending Deliveries Error:", error);
        
        // 🔥 Error එකක් ආවොත් පමණක් මේක වැඩ කරනවා. 
        // හැබැයි උඩ එක වැඩ කරලා තිබුනොත් return එක නිසා මේක වැඩ කරන්නේ නැහැ.
        if (!res.headersSent) {
            return res.status(500).json({ error: "Failed to fetch pending deliveries" });
        }
    }
};

// 2. Barcode එක Scan කරාම Pack කරලා Stock එකෙන් අඩු කරන එක
exports.packDelivery = async (req, res) => {
    try {
        const { deliveryId, trackingNumber } = req.body;

        // Transaction එකක් පාවිච්චි කරන්නේ Delivery එක Update වෙන ගමන්ම Stock එකත් අඩු වෙන්න ඕන නිසා
        await prisma.$transaction(async (tx) => {
            // 1. Delivery එක Packed විදිහට Update කරනවා
            const updatedDelivery = await tx.delivery.update({
                where: { id: parseInt(deliveryId) },
                data: { 
                    status: 'Packed', 
                    trackingNumber: trackingNumber,
                    packedAt: new Date() // මේ වෙලාවෙන් පැය 10ක් ගණන් කරන්නේ
                },
                include: { items: true }
            });

            // 2. ඒකෙ තියෙන Tutes වල Stock එක Auto අඩු කරනවා
            for (const item of updatedDelivery.items) {
                await tx.tuteStock.updateMany({
                    where: { courseId: item.courseId, tuteName: item.tuteName },
                    data: { availableQuantity: { decrement: item.quantity } }
                });
            }
        });

        res.status(200).json({ message: "Packed and Stock Deducted Successfully!" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to pack delivery" });
    }
};

// 3. Order එක Hold කරන එක
exports.holdDelivery = async (req, res) => {
    try {
        const { deliveryId, reason, remark } = req.body;
        
        const heldOrder = await prisma.delivery.update({
            where: { id: parseInt(deliveryId) },
            data: { status: 'Hold', holdReason: reason, holdRemark: remark }
        });
        
        res.status(200).json({ message: "Delivery placed on Hold", data: heldOrder });
    } catch (error) {
        res.status(500).json({ error: "Failed to hold delivery" });
    }
};

// ================= TUTE STOCK MANAGEMENT =================

exports.getTuteStocks = async (req, res) => {
    try {
        const stocks = await prisma.tuteStock.findMany({ include: { course: true } });
        res.status(200).json(stocks);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch stock" });
    }
};

exports.addTuteStock = async (req, res) => {
    try {
        const { stockId, quantity } = req.body;
        const updated = await prisma.tuteStock.update({
            where: { id: parseInt(stockId) },
            data: { availableQuantity: { increment: parseInt(quantity) } }
        });
        res.status(200).json(updated);
    } catch (error) {
        res.status(500).json({ error: "Failed to update stock" });
    }
};

// ================= AUTO CRON JOB (10 HOURS RULE) =================
// මේක Backend එකේ server.js එකේ හරි වෙනම run වෙන්න දාන්න ඕනේ. (node-cron පාවිච්චි කරලා)
const cron = require('node-cron');

// හැම පැයකට සැරයක්ම මේක run වෙනවා
cron.schedule('0 * * * *', async () => {
    try {
        const tenHoursAgo = new Date(Date.now() - 10 * 60 * 60 * 1000);

        // Packed වෙලා පැය 10ක් පැනපු ඔක්කොම "On the way" කරනවා
        await prisma.delivery.updateMany({
            where: { 
                status: 'Packed',
                packedAt: { lte: tenHoursAgo } 
            },
            data: { 
                status: 'On the way',
                onTheWayAt: new Date()
            }
        });
        console.log("🚚 Auto Delivery Status Updated (Packed -> On the way)");
    } catch (error) {
        console.error("Cron Job Error:", error);
    }
});







//.....................STUDENT TRACKING..............

// 1. Get Student's Deliveries
exports.getMyDeliveries = async (req, res) => {
    try {
        // Auth middleware එකෙන් එන ළමයාගේ ID එක (e.g., req.user.id)
        const studentId = req.user.id; 

        const deliveries = await prisma.delivery.findMany({
            where: { studentId: studentId },
            include: { items: true },
            orderBy: { createdAt: 'desc' }
        });

        res.status(200).json(deliveries);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to fetch deliveries." });
    }
};

// 2. Student confirms delivery status (Received / Not Received)
exports.confirmDelivery = async (req, res) => {
    try {
        const { deliveryId, status } = req.body;
        const studentId = req.user.id;

        // Check if the delivery belongs to the student and is currently "On the way"
        const existingDelivery = await prisma.delivery.findFirst({
            where: { id: parseInt(deliveryId), studentId: studentId }
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

        res.status(200).json({ message: `Delivery marked as ${status}`, data: updatedDelivery });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to update delivery status." });
    }
};