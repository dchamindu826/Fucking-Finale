const express = require('express');
const router = express.Router();
const afterSeminarCrmController = require('../controllers/afterSeminarCrmController'); 
const multer = require('multer');
const path = require('path');

// Multer Storage Configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'storage/documents'),
    filename: (req, file, cb) => cb(null, 'CHAT_' + Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// Settings & Config
router.post('/settings', afterSeminarCrmController.saveCrmSettings);
router.get('/settings/:businessId/:campaignType', afterSeminarCrmController.getCrmSettings);
router.get('/followup-status', afterSeminarCrmController.getFollowUpStatus);
router.post('/toggle-followup', afterSeminarCrmController.toggleFollowUpStatus);

// Leads & Bulk Actions
router.get('/leads', afterSeminarCrmController.getLeads);
router.post('/leads/import', afterSeminarCrmController.importLead);
router.post('/leads/bulk-action', afterSeminarCrmController.bulkActions);
router.post('/leads/assign', afterSeminarCrmController.assignLeads); 
router.get('/leads/auto-assign-quotas', afterSeminarCrmController.getAutoAssignQuotas);
router.post('/leads/update-call', afterSeminarCrmController.updateCallCampaign);
router.post('/leads/update-batch', afterSeminarCrmController.updateLeadBatch);

// Webhook
router.post('/webhook', afterSeminarCrmController.receiveMessage);

// Chat Messages & Broadcast
router.get('/messages/:leadId', afterSeminarCrmController.getMessages);
router.post('/messages', upload.single('media'), afterSeminarCrmController.sendMessage);
router.post('/messages/react', afterSeminarCrmController.sendReaction);
router.post('/broadcast', upload.single('media'), afterSeminarCrmController.sendBroadcast);

// Stats & Next Round
router.get('/all-leads', afterSeminarCrmController.getAllCampaignLeads);
router.post('/start-coordination', afterSeminarCrmController.startNewCoordination);

//New Inquaries
router.post('/leads/revert-round', afterSeminarCrmController.revertDeletedRound);

module.exports = router;