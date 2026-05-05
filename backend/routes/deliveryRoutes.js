const express = require('express');
const router = express.Router();
const deliveryController = require('../controllers/deliveryController');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Admin POS and Delivery Actions
router.get('/pending', deliveryController.getPendingDeliveries);
router.post('/pack', deliveryController.packDelivery);
router.post('/hold', deliveryController.holdDelivery);

// Tute Stock Actions
router.get('/stock', deliveryController.getTuteStocks);
router.post('/stock/add', deliveryController.addTuteStock);

router.get('/stats', async (req, res) => {
    try {
        const pending = await prisma.delivery.count({ where: { status: 'Pending' } });
        const onHold = await prisma.delivery.count({ where: { status: 'Hold' } });
        const deliveredToday = await prisma.delivery.count({ 
            where: { 
                status: 'Received',
                resolvedAt: { gte: new Date(new Date().setHours(0,0,0,0)) } 
            } 
        });
        const lowStock = await prisma.tuteStock.count({
            where: { availableQuantity: { lte: 10 } } // Stock එක 10ට අඩු ඒවා
        });

        res.status(200).json({ pending, onHold, deliveredToday, lowStock });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch stats" });
    }
});


// Delivery History (Delivered & Returned Tab එකට)
router.get('/history', async (req, res) => {
    try {
        const history = await prisma.delivery.findMany({
            where: { status: { notIn: ['Pending', 'Hold'] } },
            include: { 
                payment: { 
                    include: { student: true } 
                } 
            },
            orderBy: { updatedAt: 'desc' }
        });
        
        const formatted = history.map(h => ({
            id: `ORD-${h.id}`,
            studentName: h.payment?.student ? `${h.payment.student.firstName} ${h.payment.student.lastName}` : 'Unknown',
            trackingNumber: h.trackingNumber || 'N/A',
            status: h.status === 'Received' ? 'Delivered' : h.status,
            date: new Date(h.updatedAt).toISOString().split('T')[0]
        }));
        
        res.status(200).json(formatted);
    } catch (error) {
        console.error("History fetch error:", error);
        res.status(500).json([]);
    }
});
module.exports = router;