const express = require('express');
const router = express.Router();
const coordinatorCrmController = require('../controllers/coordinatorCrmController'); 
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'storage/documents'),
    filename: (req, file, cb) => cb(null, 'CHAT_' + Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

router.get('/leads', coordinatorCrmController.getLeads);
router.post('/leads/import', coordinatorCrmController.importLead);
router.post('/leads/assign', coordinatorCrmController.assignLeads); 
router.put('/leads/call-campaign', coordinatorCrmController.updateCallCampaign); 
router.post('/leads/bulk-action', coordinatorCrmController.bulkActions);
router.get('/leads/auto-assign-quotas', coordinatorCrmController.getAutoAssignQuotas);

router.get('/lead-details/:phone', coordinatorCrmController.getLeadDetails);
router.post('/reset-password', coordinatorCrmController.resetStudentPassword);

router.get('/messages/:leadId', coordinatorCrmController.getMessages);
router.post('/messages', upload.single('media'), coordinatorCrmController.sendMessage);

// 🔥 NEW: Meta Templates Fetch Route
router.get('/meta-templates', coordinatorCrmController.getMetaTemplates);

router.get('/webhook', coordinatorCrmController.verifyWebhook); 
router.post('/webhook', coordinatorCrmController.receiveMessage);
router.post('/messages/react', coordinatorCrmController.sendReaction); // 🔥 Reactions Route

module.exports = router;