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
                        student: true, // ළමයාගේ විස්තර Payment එක හරහා ගන්නවා
                        batch: true    // 🔥 ළමයාගේ Batch එක Payment එක හරහා ගන්නවා
                    } 
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Tute හා Lecturer විස්තර ගන්න අදාල Courses ටික අදිනවා
        const courseIds = [...new Set(deliveries.flatMap(d => d.items.map(i => i.courseId)).filter(Boolean))];
        const courses = await prisma.course.findMany({
            where: { id: { in: courseIds.map(id => parseInt(id)) } }
        });

        const formatted = deliveries.map(d => {
            // Student data එක හරි තැනින් ගන්නවා
            const std = d.payment?.student || {};
            
            const addressParts = [std.addressHouseNo, std.addressStreet, std.city, std.district].filter(Boolean);
            const finalAddress = addressParts.length > 0 ? addressParts.join(', ') : 'No Address Provided';
            const finalPhone = std.phone || std.whatsapp || std.optionalPhone || 'No Phone';
            const finalName = std.firstName ? `${std.firstName} ${std.lastName}` : 'Unknown Student';

            // Items (Subjects) වලට Lecturer සහ Tute image එකතු කිරීම
            const itemsWithDetails = d.items.map(item => {
                const course = courses.find(c => c.id === item.courseId);
                let lecturerName = course?.lecturerName || 'Lecturer';
                let lecturerImage = 'default.png';
                let tuteCover = 'default-tute.png';

                // Course එකේ Group Prices ඇතුලෙන් අදාල Tute Image සහ Lecturer Image ගන්නවා
                if (course && course.groupPrices) {
                    try {
                        const gpArr = JSON.parse(course.groupPrices);
                        const matchedGp = gpArr.find(g => g.tuteName === item.tuteName) || gpArr[0];
                        if (matchedGp) {
                            if (matchedGp.lecturerImage) lecturerImage = matchedGp.lecturerImage;
                            if (matchedGp.tuteCover) tuteCover = matchedGp.tuteCover;
                        }
                    } catch (e) {}
                }

                return {
                    ...item,
                    courseName: course?.name || 'Subject',
                    lecturerName,
                    lecturerImage,
                    tuteCover
                };
            });

            return {
                ...d,
                studentName: finalName,
                studentNo: std.id ? `STU-${std.id}` : 'STU-000',
                address: finalAddress,
                phone: finalPhone,
                batchName: d.payment?.batch?.name || 'Batch Not Assigned', // 🔥 Batch Name එක මෙතනින් යවනවා
                items: itemsWithDetails
            };
        });

        return res.status(200).json(formatted);

    } catch (error) {
        console.error("Fetch Pending Deliveries Error:", error);
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

// ================= TUTE STOCK MANAGEMENT (POS STYLE) =================

// 1. Batch එකට අදාල Stock ගන්න
exports.getBatchStock = async (req, res) => {
    try {
        const batchId = parseInt(req.params.batchId);
        
        const groups = await prisma.group.findMany({
            where: { batchId },
            include: { courses: true }
        });

        let allCourseIds = [];
        let requiredTutes = [];

        groups.forEach(g => {
            g.courses.forEach(c => {
                allCourseIds.push(c.id);

                let gpPrices = [];
                try { gpPrices = typeof c.groupPrices === 'string' ? JSON.parse(c.groupPrices) : (c.groupPrices || []); } catch(e){}

                const gpData = gpPrices.find(p => parseInt(p.groupId) === g.id);

                let tName = c.name + " - Tute";
                let tCover = 'default-tute.png';

                if (gpData) {
                    if (gpData.tuteName && gpData.tuteName.trim() !== '') tName = gpData.tuteName;
                    if (gpData.tuteCover) tCover = gpData.tuteCover;
                }

                requiredTutes.push({
                    courseId: c.id,
                    tuteName: tName,
                    tuteImage: tCover
                });
            });
        });

        if (requiredTutes.length > 0) {
            for (const rt of requiredTutes) {
                const exists = await prisma.tuteStock.findFirst({
                    where: { courseId: rt.courseId, tuteName: rt.tuteName }
                });

                if (!exists) {
                    await prisma.tuteStock.create({
                        data: {
                            courseId: rt.courseId,
                            tuteName: rt.tuteName,
                            tuteImage: rt.tuteImage,
                            availableQuantity: 0
                        }
                    });
                }
            }
        }

        if (allCourseIds.length === 0) {
            return res.status(200).json([]);
        }

        const allStocks = await prisma.tuteStock.findMany({
            where: { courseId: { in: allCourseIds.map(id => Number(id)) } },
            include: { 
                course: { 
                    include: { group: true } // 🔥 FIX: Monthly/Full filter කරන්න group එක ගන්නවා
                } 
            },
            orderBy: { updatedAt: 'desc' }
        });

        const safeJson = (data) => JSON.parse(JSON.stringify(data, (k, v) => typeof v === 'bigint' ? v.toString() : v));
        res.status(200).json(safeJson(allStocks));

    } catch (error) {
        console.error("Get Batch Stock Error:", error);
        res.status(500).json({ error: "Failed to fetch batch stock." });
    }
};

exports.addTuteStock = async (req, res) => {
    try {
        const { stockId, quantity, reason } = req.body;
        const oldStock = await prisma.tuteStock.findUnique({ where: { id: parseInt(stockId) } });
        
        const updated = await prisma.tuteStock.update({
            where: { id: parseInt(stockId) },
            data: { availableQuantity: { increment: parseInt(quantity) } }
        });

        await prisma.tuteStockHistory.create({
            data: {
                stockId: updated.id, courseId: updated.courseId, tuteName: updated.tuteName,
                action: "ADDED", oldQuantity: oldStock.availableQuantity, newQuantity: updated.availableQuantity,
                reason: reason || "New stock added"
            }
        });
        res.status(200).json(updated);
    } catch (error) {
        res.status(500).json({ error: "Failed to update stock" });
    }
};

exports.addCustomTute = async (req, res) => {
    try {
        const { courseId, tuteName } = req.body;
        const tuteCover = req.file ? req.file.filename : null;

        if (!courseId || courseId === "null" || courseId === "") {
            return res.status(400).json({ error: "Please select a Subject to link this Extra Tute." });
        }

        const newStock = await prisma.tuteStock.create({
            data: {
                courseId: parseInt(courseId),
                tuteName: tuteName,
                tuteImage: tuteCover,
                availableQuantity: 0
            }
        });
        res.status(201).json(newStock);
    } catch (error) {
        res.status(500).json({ error: "Failed to create custom tute" });
    }
};

exports.editTuteStock = async (req, res) => {
    try {
        const { stockId, newQuantity, reason } = req.body;
        const oldStock = await prisma.tuteStock.findUnique({ where: { id: parseInt(stockId) } });
        const updated = await prisma.tuteStock.update({
            where: { id: parseInt(stockId) },
            data: { availableQuantity: parseInt(newQuantity) }
        });
        await prisma.tuteStockHistory.create({
            data: {
                stockId: updated.id, courseId: updated.courseId, tuteName: updated.tuteName,
                action: oldStock.availableQuantity > newQuantity ? "REDUCED" : "EDITED",
                oldQuantity: oldStock.availableQuantity, newQuantity: updated.availableQuantity, reason: reason
            }
        });
        res.status(200).json({ message: "Stock adjusted successfully" });
    } catch (error) {
        res.status(500).json({ error: "Failed to edit stock" });
    }
};

exports.deleteTuteStock = async (req, res) => {
    try {
        const stockId = parseInt(req.params.id);
        const { reason } = req.query;
        const oldStock = await prisma.tuteStock.findUnique({ where: { id: stockId } });
        await prisma.tuteStockHistory.create({
            data: {
                stockId: oldStock.id, courseId: oldStock.courseId, tuteName: oldStock.tuteName,
                action: "DELETED", oldQuantity: oldStock.availableQuantity, newQuantity: 0, reason: reason || "Item removed"
            }
        });
        await prisma.tuteStock.delete({ where: { id: stockId } });
        res.status(200).json({ message: "Stock item deleted" });
    } catch (error) {
        res.status(500).json({ error: "Failed to delete stock" });
    }
};

// 🔥 FULLY UPGRADED HISTORY FUNCTION WITH DATE & PAGINATION 🔥
exports.getStockHistory = async (req, res) => {
    try {
        const { startDate, endDate, page = 1, limit = 10 } = req.query;
        const courseIds = req.params.courseIds ? req.params.courseIds.split(',').map(id => parseInt(id)) : [];

        let whereClause = { courseId: { in: courseIds } };

        if (startDate && endDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            whereClause.createdAt = { gte: start, lte: end };
        }

        const total = await prisma.tuteStockHistory.count({ where: whereClause });
        const history = await prisma.tuteStockHistory.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            skip: (parseInt(page) - 1) * parseInt(limit),
            take: parseInt(limit)
        });

        const safeJson = (data) => JSON.parse(JSON.stringify(data, (k, v) => typeof v === 'bigint' ? v.toString() : v));
        res.status(200).json({
            data: safeJson(history),
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error("History Error:", error);
        res.status(500).json({ error: "Failed to fetch history" });
    }
};

exports.getGlobalStock = async (req, res) => {
    try {
        const stocks = await prisma.tuteStock.findMany({
            include: { course: { include: { group: { include: { batch: { include: { business: true } } } } } } },
            orderBy: { availableQuantity: 'asc' }
        });
        const safeJson = (data) => JSON.parse(JSON.stringify(data, (k, v) => typeof v === 'bigint' ? v.toString() : v));
        res.status(200).json(safeJson(stocks));
    } catch (error) { res.status(500).json({ error: "Failed to fetch global stock" }); }
};

exports.getGlobalStockHistory = async (req, res) => {
    try {
        const { startDate, endDate, page = 1, limit = 10 } = req.query;
        let whereClause = {};

        if (startDate && endDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            whereClause.createdAt = { gte: start, lte: end };
        }

        const total = await prisma.tuteStockHistory.count({ where: whereClause });
        const history = await prisma.tuteStockHistory.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            skip: (parseInt(page) - 1) * parseInt(limit),
            take: parseInt(limit)
        });

        const safeJson = (data) => JSON.parse(JSON.stringify(data, (k, v) => typeof v === 'bigint' ? v.toString() : v));
        res.status(200).json({
            data: safeJson(history),
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) { res.status(500).json({ error: "Failed to fetch global history" }); }
};