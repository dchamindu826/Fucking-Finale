// Example: routes/publicRoutes.js
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 🔥 Frontend Landing Page Eke Businesses ganna Route Eka 🔥
router.get('/landing-data', async (req, res) => {
    try {
        const businesses = await prisma.business.findMany({
            where: { status: 1 },
            include: {
                batches: {
                    where: { status: 1 }
                }
            }
        });

        // Safe JSON Parse for BigInt (if any)
        const safeData = JSON.parse(JSON.stringify(businesses, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        ));

        res.status(200).json({ businesses: safeData });
    } catch (error) {
        console.error("Landing Data Error:", error);
        res.status(500).json({ error: "Failed to load landing data" });
    }
});

module.exports = router;