const express = require('express');
const router = express.Router();
const coordinatorCrmController = require('../controllers/coordinatorCrmController'); 
const multer = require('multer');
const path = require('path');

// Multer Storage Configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'storage/documents'),
    filename: (req, file, cb) => cb(null, 'CHAT_' + Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

router.get('/leads', coordinatorCrmController.getLeads);
router.post('/leads/import', coordinatorCrmController.importLead);
router.post('/leads/assign', coordinatorCrmController.assignLeads); 

router.post('/leads/update-call', coordinatorCrmController.updateCallCampaign); 

router.post('/leads/bulk-action', coordinatorCrmController.bulkActions);
router.get('/leads/auto-assign-quotas', coordinatorCrmController.getAutoAssignQuotas);

router.get('/lead-details/:phone', coordinatorCrmController.getLeadDetails);
router.post('/reset-password', coordinatorCrmController.resetStudentPassword);

router.get('/messages/:leadId', coordinatorCrmController.getMessages);
router.post('/messages', upload.single('media'), coordinatorCrmController.sendMessage);
router.post('/messages/react', coordinatorCrmController.sendReaction);

// Meta Templates Routes
router.get('/meta-templates', coordinatorCrmController.getMetaTemplates);
router.post('/meta-templates', upload.single('media'), coordinatorCrmController.createMetaTemplate);
router.delete('/meta-templates/:name', coordinatorCrmController.deleteMetaTemplate);

// Broadcast & Leads
router.post('/broadcast', upload.single('media'), coordinatorCrmController.sendBroadcast);
router.get('/all-leads', coordinatorCrmController.getAllCampaignLeads);

// Webhook
router.get('/webhook', coordinatorCrmController.verifyWebhook); 
router.post('/webhook', coordinatorCrmController.receiveMessage);

router.get('/campaign-stats', coordinatorCrmController.getCampaignStats);

router.get('/followup-status', coordinatorCrmController.getFollowUpStatusAPI);
router.post('/toggle-followup', coordinatorCrmController.toggleFollowUpAPI);
router.post('/test-followup', coordinatorCrmController.testFollowUpMessage);

module.exports = router;