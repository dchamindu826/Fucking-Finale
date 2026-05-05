const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

// 🔥 අපි ෆයිල් එකේ නම වෙනස් කරපු නිසා මෙතන නමත් 'freeSeminarController' කියලා හැදුවා 
const freeSeminarController = require('../controllers/freeSeminarController'); 

// Multer Storage Configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'storage/documents'),
    filename: (req, file, cb) => cb(null, 'CHAT_' + Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// (අර වැඩකට නැති getMetaAnalyticsDirect පේළිය මෙතනින් අයින් කළා)

// ==========================================================
// FREE SEMINAR ROUTES
// ==========================================================

router.get('/leads', freeSeminarController.getLeads);
router.post('/leads/import', freeSeminarController.importLead);
router.post('/leads/assign', freeSeminarController.assignLeads); 

router.post('/leads/update-call', freeSeminarController.updateCallCampaign); 

router.post('/leads/bulk-action', freeSeminarController.bulkActions);
router.get('/leads/auto-assign-quotas', freeSeminarController.getAutoAssignQuotas);

router.get('/lead-details/:phone', freeSeminarController.getLeadDetails);
router.post('/reset-password', freeSeminarController.resetStudentPassword);

router.get('/messages/:leadId', freeSeminarController.getMessages);
router.post('/messages', upload.single('media'), freeSeminarController.sendMessage);
router.post('/messages/react', freeSeminarController.sendReaction);

// Meta Templates Routes
router.get('/meta-templates', freeSeminarController.getMetaTemplates);
router.post('/meta-templates', upload.single('media'), freeSeminarController.createMetaTemplate);
router.delete('/meta-templates/:name', freeSeminarController.deleteMetaTemplate);

// Broadcast & Leads
router.post('/broadcast', upload.single('media'), freeSeminarController.sendBroadcast);
router.get('/all-leads', freeSeminarController.getAllCampaignLeads);

// Webhook
router.get('/webhook', freeSeminarController.verifyWebhook); 
router.post('/webhook', freeSeminarController.receiveMessage);

router.get('/campaign-stats', freeSeminarController.getCampaignStats);

router.get('/followup-status', freeSeminarController.getFollowUpStatusAPI);
router.post('/toggle-followup', freeSeminarController.toggleFollowUpAPI);
router.post('/test-followup', freeSeminarController.testFollowUpMessage);

router.get('/meta-analytics', freeSeminarController.getUniqueNumbersCount);

module.exports = router;