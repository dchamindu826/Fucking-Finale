const express = require('express');
const router = express.Router();
const staffController = require('../controllers/staffController');

// 🔥 IMPORTANT: /businesses eka /:id ekata udin danna ona
router.get('/businesses', staffController.getBusinesses); 
router.get('/', staffController.getStaff);
router.post('/', staffController.createStaff);
router.put('/:id', staffController.updateStaff);
router.delete('/:id', staffController.deleteStaff);

module.exports = router;