const express = require('express');
const router = express.Router();
const staffController = require('../controllers/staffController');

// All paths are prefixed with /api/admin/staff in server.js
router.get('/', staffController.getStaff);
router.post('/', staffController.createStaff);

module.exports = router;