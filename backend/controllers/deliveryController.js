const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const admin = require("firebase-admin"); // Firebase load කරලා නැත්නම් උඩින් දාගන්න

// ================= DELIVERY POS ACTIONS =================

// 1. Pending & Hold Deliveries ගන්න (Business & Payment Type අනුව)
exports.getPendingDeliveries = async (req, res) => {
    try {
        const { businessId, paymentType } = req.query;
        
        // 🔥 UPDATE: Pending සහ Hold Status දෙකම එකපාර Database එකෙන් ගන්නවා
        let whereClause = { status: { in: ['Pending', 'Hold'] } };
        if (businessId) whereClause.businessId = parseInt(businessId);
        if (paymentType && paymentType !== 'All') whereClause.paymentType = paymentType;

        const deliveries = await prisma.delivery.findMany({
            where: whereClause,
            include: {
                items: true,
                payment: { 
                    include: { 
                        student: true, 
                        batch: true    
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
                batchName: d.payment?.batch?.name || 'Batch Not Assigned', 
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
const cron = require('node-cron');

cron.schedule('0 * * * *', async () => {
    try {
        const tenHoursAgo = new Date(Date.now() - 10 * 60 * 60 * 1000);

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

exports.getMyDeliveries = async (req, res) => {
    try {
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

exports.confirmDelivery = async (req, res) => {
    try {
        const { deliveryId, status } = req.body;
        const studentId = req.user.id;

        const existingDelivery = await prisma.delivery.findFirst({
            where: { id: parseInt(deliveryId), studentId: studentId }
        });

        if (!existingDelivery || existingDelivery.status !== 'On the way') {
            return res.status(400).json({ error: "Invalid request or delivery is not 'On the way'." });
        }

        const updatedDelivery = await prisma.delivery.update({
            where: { id: parseInt(deliveryId) },
            data: { 
                status: status, 
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
                    include: { group: true }
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

// 1. Dispatch & Delivered Orders ගන්න API එක
exports.getDispatchDeliveries = async (req, res) => {
    try {
        const { businessId } = req.query;
        
        // 🔥 FIX: 'Packed' කියන Status එකත් මෙතනට ඇඩ් කරන්න ඕනේ
        // කලින් තිබ්බේ: let whereClause = { status: { in: ['On the way', 'Received'] } };
        let whereClause = {
            // 🔥 FIX: 'Packed' අයින් කරන්නේ නෑ, මොකද ඒකත් Dispatched විදිහට පේන්න ඕන නිසා
            status: { notIn: ['Pending', 'Hold'] } 
        };
        
        if (businessId) whereClause.businessId = parseInt(businessId);

        const deliveries = await prisma.delivery.findMany({
            where: whereClause,
            include: {
                items: true,
                payment: { 
                    include: { student: true, batch: true } 
                }
            },
            orderBy: { updatedAt: 'desc' }
        })

        const courseIds = [...new Set(deliveries.flatMap(d => d.items.map(i => i.courseId)).filter(Boolean))];
        const courses = await prisma.course.findMany({
            where: { id: { in: courseIds.map(id => parseInt(id)) } }
        });

        const formatted = deliveries.map(d => {
            const std = d.payment?.student || {};
            const addressParts = [std.addressHouseNo, std.addressStreet, std.city, std.district].filter(Boolean);
            
            return {
                ...d,
                studentName: std.firstName ? `${std.firstName} ${std.lastName}` : 'Unknown Student',
                address: addressParts.length > 0 ? addressParts.join(', ') : 'No Address Provided',
                phone: std.phone || std.whatsapp || 'No Phone',
                batchName: d.payment?.batch?.name || 'Batch Not Assigned',
                items: d.items.map(item => {
                    const course = courses.find(c => c.id === item.courseId);
                    return {
                        ...item,
                        courseName: course?.name || 'Subject',
                        lecturerName: course?.lecturerName || 'Lecturer'
                    };
                })
            };
        });

        return res.status(200).json(formatted);
    } catch (error) {
        console.error("Fetch Dispatch Error:", error);
        res.status(500).json({ error: "Failed to fetch dispatch deliveries" });
    }
};

// 2. හැමදාම උදේ 8:00 ට ළමයින්ට Notification යවන Cron Job එක
// (මේක Server.js එකේ හරි cron jobs run වෙන තැන හරි දාන්න)
cron.schedule('0 8 * * *', async () => {
    try {
        // Dispatch වෙලා තියෙන (On the way), තාම ළමයා Received නොකරපු Orders ටික ගන්නවා
        const dispatchedOrders = await prisma.delivery.findMany({
            where: { status: 'On the way' },
            include: { payment: { include: { student: true } } }
        });

        for (const order of dispatchedOrders) {
            const student = order.payment?.student;
            
            if (student && student.fcmToken) {
                const message = {
                    notification: {
                        title: "📦 Delivery Update!",
                        body: "ඔබගේ Tute pack එක මේ වනවිට Dispatch කර ඇත. කරුණාකර App එකට ගොස් Received හෝ Not Received යන්න Update කරන්න."
                    },
                    token: student.fcmToken
                };
                
                try {
                    await admin.messaging().send(message);
                } catch (e) {
                    console.log(`Failed to send FCM to student ${student.id}`);
                }
            }
        }
        console.log("🚚 Daily Dispatch Notifications Sent to Students!");
    } catch (error) {
        console.error("Cron Job Error (Dispatch Notifications):", error);
    }
});

// ================= DASHBOARD STATS (OVERVIEW) =================

exports.getDeliveryStats = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(today.getDate() - 6);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        // 1. Basic Counts (Top Cards සඳහා)
        const pending = await prisma.delivery.count({ where: { status: 'Pending' } });
        const onHold = await prisma.delivery.count({ where: { status: 'Hold' } });
        const dispatched = await prisma.delivery.count({ where: { status: 'On the way' } });
        const returned = await prisma.delivery.count({ where: { status: 'Returned' } }); // Returned status එකක් තියෙනවා නම්
        const totalDelivered = await prisma.delivery.count({ where: { status: 'Received' } });
        const deliveredToday = await prisma.delivery.count({ 
            where: { 
                status: 'Received',
                resolvedAt: { gte: today } 
            } 
        });
        const lowStock = await prisma.tuteStock.count({
            where: { availableQuantity: { lte: 10 } }
        });

        // 2. Status Distribution Data (Doughnut Chart සඳහා)
        const statusDistribution = [
            { name: 'Pending', value: pending, color: '#3b82f6' }, // Blue
            { name: 'Dispatched', value: dispatched, color: '#8b5cf6' }, // Purple
            { name: 'Delivered', value: totalDelivered, color: '#10b981' }, // Emerald
            { name: 'Hold', value: onHold, color: '#f97316' }, // Orange
        ].filter(s => s.value > 0);

        // 3. Weekly Trend Data (Last 7 Days Area Chart සඳහා)
        const recentDeliveries = await prisma.delivery.findMany({
            where: { updatedAt: { gte: sevenDaysAgo } },
            select: { status: true, updatedAt: true }
        });

        const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const weeklyTrendMap = {};

        // දින 7ක හිස් Data හැදීම
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            weeklyTrendMap[daysOfWeek[d.getDay()]] = { name: daysOfWeek[d.getDay()], Packed: 0, Delivered: 0 };
        }

        recentDeliveries.forEach(del => {
            const dayName = daysOfWeek[new Date(del.updatedAt).getDay()];
            if (weeklyTrendMap[dayName]) {
                if (del.status === 'Packed' || del.status === 'On the way') weeklyTrendMap[dayName].Packed += 1;
                if (del.status === 'Received') weeklyTrendMap[dayName].Delivered += 1;
            }
        });
        const weeklyTrend = Object.values(weeklyTrendMap);

        // 4. Top Businesses Data (Progress Bars සඳහා)
        const businessCounts = await prisma.delivery.groupBy({
            by: ['businessId'],
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } },
            take: 3
        });

        const businesses = await prisma.business.findMany({
            where: { id: { in: businessCounts.map(b => b.businessId).filter(id => id !== null) } },
            select: { id: true, name: true }
        });

        const maxOrders = businessCounts[0]?._count.id || 1;
        const topBusinesses = businessCounts.map(bc => {
            const biz = businesses.find(b => b.id === bc.businessId);
            return {
                name: biz ? biz.name : 'Unknown Business',
                orders: bc._count.id,
                progress: Math.round((bc._count.id / maxOrders) * 100)
            };
        });

        // 5. Recent Activity Feed (පැත්තේ තියෙන Feed එකට)
        const latestUpdates = await prisma.delivery.findMany({
            take: 5,
            orderBy: { updatedAt: 'desc' },
            select: { id: true, status: true, updatedAt: true }
        });

        // Time එක ලස්සනට හදන Function එක (e.g. "10 mins ago")
        const timeSince = (date) => {
            const seconds = Math.floor((new Date() - new Date(date)) / 1000);
            if (seconds < 60) return `${seconds} secs ago`;
            if (seconds < 3600) return `${Math.floor(seconds / 60)} mins ago`;
            if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
            return `${Math.floor(seconds / 86400)} days ago`;
        };

        const recentActivity = latestUpdates.map((update, index) => {
            let type = 'info';
            let text = `Order ORD-${update.id} updated to ${update.status}`;
            
            if (update.status === 'Received') { type = 'success'; text = `Order ORD-${update.id} delivered successfully`; }
            else if (update.status === 'Hold') { type = 'error'; text = `Order ORD-${update.id} placed on hold`; }
            else if (update.status === 'Packed') { type = 'info'; text = `Order ORD-${update.id} packed and ready`; }
            else if (update.status === 'On the way') { type = 'info'; text = `Order ORD-${update.id} dispatched via courier`; }

            return { id: index + 1, text, time: timeSince(update.updatedAt), type };
        });

        // අන්තිමට සේරම එකට යවනවා
        res.status(200).json({ 
            pending, onHold, dispatched, deliveredToday, lowStock, returned,
            statusDistribution, weeklyTrend, topBusinesses, recentActivity
        });

    } catch (error) {
        console.error("Dashboard Stats Error:", error);
        res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
};

exports.getAdvancedHistory = async (req, res) => {
    try {
        const { page = 1, limit = 15, search, businessId, batchId, paymentType, status, startDate, endDate } = req.query;
        
        let whereClause = {
            // 🔥 FIX: 'Packed' අයින් කරන්නේ නෑ, එතකොට All Statuses වලදීත් ලස්සනට පේනවා
            status: { notIn: ['Pending', 'Hold'] } 
        };

        // Filters යොදන්න
        if (businessId) whereClause.businessId = parseInt(businessId);
        if (paymentType) whereClause.paymentType = paymentType;
        
        if (status === 'Dispatched') {
            whereClause.status = { in: ['Packed', 'On the way'] };
        } else if (status === 'Delivered') {
            whereClause.status = 'Received';
        }

        if (startDate && endDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            whereClause.updatedAt = { gte: start, lte: end };
        }

        // Search Query
        if (search) {
            const searchNum = parseInt(search.replace(/\D/g, '')); // ඉලක්කම් විතරක් ගන්නවා
            const orConditions = [
                { trackingNumber: { contains: search } },
                { payment: { student: { firstName: { contains: search } } } },
                { payment: { student: { phone: { contains: search } } } }
            ];
            if (!isNaN(searchNum)) {
                orConditions.push({ id: searchNum });
            }
            whereClause.OR = orConditions;
        }

        if (batchId) {
            whereClause.payment = { ...whereClause.payment, batchId: parseInt(batchId) };
        }

        // 🔥 FIX: Business Relation එකක් නැති නිසා, Business නම් ටික වෙනම අරන් Map කරනවා
        const businesses = await prisma.business.findMany({ select: { id: true, name: true } });

        const total = await prisma.delivery.count({ where: whereClause });
        const deliveries = await prisma.delivery.findMany({
            where: whereClause,
            // 🔥 මෙතන තිබ්බ business: true අයින් කරලා තියෙන්නේ
            include: {
                payment: { include: { student: true, batch: true } }
            },
            orderBy: { updatedAt: 'desc' },
            skip: (parseInt(page) - 1) * parseInt(limit),
            take: parseInt(limit)
        });

        const formatted = deliveries.map(d => {
            // Business ID එකෙන් නම හොයාගන්නවා
            const bizName = businesses.find(b => b.id === d.businessId)?.name || 'Unknown';
            return {
                id: d.id,
                studentName: d.payment?.student ? `${d.payment.student.firstName} ${d.payment.student.lastName}` : 'Unknown',
                phone: d.payment?.student?.phone || 'No Phone',
                businessName: bizName,
                batchName: d.payment?.batch?.name || 'No Batch',
                paymentType: d.paymentType,
                status: d.status,
                trackingNumber: d.trackingNumber
            };
        });

        // BigInt Data තිබ්බොත් error එන නිසා Safe JSON parse එකක් දානවා
        const safeJson = (data) => JSON.parse(JSON.stringify(data, (k, v) => typeof v === 'bigint' ? v.toString() : v));

        res.status(200).json(safeJson({
            data: formatted,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / limit)
        }));

    } catch (error) {
        console.error("Advanced History fetch error:", error);
        res.status(500).json({ error: "Failed to fetch history" });
    }
};

// Manual Confirmation API
exports.manualConfirmDelivery = async (req, res) => {
    try {
        const { deliveryId } = req.params;
        const updatedDelivery = await prisma.delivery.update({
            where: { id: parseInt(deliveryId) },
            data: { 
                status: 'Received', 
                resolvedAt: new Date()
            }
        });
        res.status(200).json({ message: `Delivery marked as Delivered`, data: updatedDelivery });
    } catch (error) {
        res.status(500).json({ error: "Failed to manually update delivery." });
    }
};