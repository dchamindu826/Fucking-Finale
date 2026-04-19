const express = require('express');
const router = express.Router();
const businessController = require('../controllers/businessController');
const multer = require('multer');

const upload = multer({ dest: 'storage/icons/' });

// Note: URLs match exactly what was in server.js
router.get('/admin/businesses', businessController.getBusinesses);
router.post('/course-setup/business', upload.single('logo'), businessController.createBusiness);
router.put('/admin/business/update', upload.single('logo'), businessController.updateBusiness);
router.delete('/admin/business/delete', businessController.deleteBusiness);
router.put('/course-setup/business/toggle-status', businessController.toggleBusinessStatus);
router.put('/admin/businesses/:id/assign', businessController.assignManagers);

module.exports = router;