const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Admin Overview
router.get('/overview', async (req, res) => {
  res.json({
    grossRevenue: 0, pendingSync: 0, verifiedSales: 0, failed: 0,
    pieData: [{ name: 'Pending', value: 100 }], barData: []
  });
});

// Manager Overview
router.get('/manager/overview', async (req, res) => {
  try {
      const firstBusiness = await prisma.business.findFirst();
      const safeBusiness = firstBusiness ? JSON.parse(JSON.stringify(firstBusiness, (key, value) => typeof value === 'bigint' ? value.toString() : value)) : null;
      res.status(200).json({ business: safeBusiness, message: "Manager overview data loaded" });
  } catch (error) {
      res.status(500).json({ error: "Failed to load manager overview" });
  }
});

module.exports = router;