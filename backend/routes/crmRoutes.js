// backend/routes/crmRoutes.js
const express = require('express');
const router = express.Router();
const crmController = require('../controllers/crmController');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'storage/documents'),
    filename: (req, file, cb) => cb(null, 'KB_' + Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// 1. Settings Routes (CampaignType එකත් URL එකට ගන්නවා)
router.post('/settings', crmController.saveCrmSettings);
router.get('/settings/:businessId/:campaignType', crmController.getCrmSettings);

// 2. AI Knowledge Base (PDF Ingestion)
router.post('/knowledge-base', upload.single('pdfFile'), crmController.uploadKnowledge);

// 3. Campaign Archive
router.post('/archive', crmController.archiveCampaign);

// 4. Auto Reply Routes (කලින් තිබ්බ ඒවාමයි)
router.post('/auto-reply', upload.single('attachment'), crmController.addAutoReply);
router.get('/auto-reply', crmController.getAutoReplies);
router.delete('/auto-reply/:id', crmController.deleteAutoReply);

// 🔥 මම අර Error එක දුන්න පේළි දෙක මෙතනින් සම්පූර්ණයෙන්ම අයින් කළා. මේක සේව් කරන්න!
module.exports = router;