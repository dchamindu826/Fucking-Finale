const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const studentController = require('../controllers/studentController');
const adminController = require('../controllers/adminController'); 
const databaseController = require('../controllers/databaseController');

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

// ==========================================
// 🔥 STUDENT DATA CENTER ROUTES 🔥
// ==========================================
router.get('/students-data-center', studentController.getStudentsDataCenter);
router.put('/students/update', studentController.updateStudentByAdmin);
router.post('/students/reset-password', studentController.resetStudentPassword);
router.post('/ghost-login', studentController.ghostLogin);

// 🔥🔥🔥 මෙන්න මේ ලයින් එක අනිවාර්යයෙන්ම එකතු කරන්න 🔥🔥🔥
router.post('/admin-delete', studentController.deleteStudentAccount);

// Backup
router.get('/backup', adminController.downloadDatabaseBackup);

// 🔥 Database Manager Routes 🔥
router.get('/database/:model', databaseController.getAllData);
router.put('/database/:model/:id', databaseController.updateRecord);
router.delete('/database/:model/:id', databaseController.deleteRecord);

module.exports = router;