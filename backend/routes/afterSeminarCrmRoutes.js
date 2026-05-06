const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

// ============================================================================
// 📦 CONTROLLERS IMPORT
// ============================================================================
const afterSeminarInquiryController = require('../controllers/afterSeminarInquiryController'); 
const afterSeminarBridgeController = require('../controllers/afterSeminarBridgeController');
const afterSeminarRetentionController = require('../controllers/afterSeminarRetentionController');
const afterSeminarManagerStatsController = require('../controllers/afterSeminarManagerStatsController');

// Multer Storage Configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'storage/documents'),
    filename: (req, file, cb) => cb(null, 'CHAT_' + Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });


// ============================================================================
// 🟢 MODULE 1: INQUIRIES (Direct & Open Seminar)
// ============================================================================

// Settings & Config
router.post('/settings', afterSeminarInquiryController.saveCrmSettings);
router.get('/settings/:businessId/:campaignType', afterSeminarInquiryController.getCrmSettings);
router.get('/followup-status', afterSeminarInquiryController.getFollowUpStatus);
router.post('/toggle-followup', afterSeminarInquiryController.toggleFollowUpStatus);

// Leads & Bulk Actions
router.get('/leads', afterSeminarInquiryController.getLeads);
router.post('/leads/import', afterSeminarInquiryController.importLead);
router.post('/leads/bulk-action', afterSeminarInquiryController.bulkActions);
router.post('/leads/assign', afterSeminarInquiryController.assignLeads); 
router.get('/leads/auto-assign-quotas', afterSeminarInquiryController.getAutoAssignQuotas);
router.post('/leads/update-call', afterSeminarInquiryController.updateCallCampaign);
router.post('/leads/update-batch', afterSeminarInquiryController.updateLeadBatch);
router.post('/leads/revert-round', afterSeminarInquiryController.revertDeletedRound);

// Webhook
router.post('/webhook', afterSeminarInquiryController.receiveMessage);

// Chat Messages & Broadcast
router.get('/messages/:leadId', afterSeminarInquiryController.getMessages);
router.post('/messages', upload.single('media'), afterSeminarInquiryController.sendMessage);
router.post('/messages/react', afterSeminarInquiryController.sendReaction);
router.post('/broadcast', upload.single('media'), afterSeminarInquiryController.sendBroadcast);

// Stats, Test & Next Round
router.get('/all-leads', afterSeminarInquiryController.getAllCampaignLeads);
router.post('/start-coordination', afterSeminarInquiryController.startNewCoordination);
router.post('/leads/test-followup', afterSeminarInquiryController.testDirectFollowUp);


// ============================================================================
// 🌉 MODULE 2: THE BRIDGE (Free Seminar -> After Seminar Transfer)
// ============================================================================
router.get('/bridge/pending', afterSeminarBridgeController.getPendingBridgeLeads);
router.post('/bridge/push', afterSeminarBridgeController.pushToAfterSeminar);
router.post('/bridge/revert-pending', afterSeminarBridgeController.revertPendingBridgeLeads);

// ============================================================================
// 🏆 MODULE 3: THE FINALE (Enrolled Retention & Monthly Tracking)
// ============================================================================
router.get('/retention/stats', afterSeminarRetentionController.getRetentionDashboardStats);
router.get('/retention/leads', afterSeminarRetentionController.getRetentionLeads);
router.post('/retention/trigger-reset', afterSeminarRetentionController.manualTriggerMonthlyReset); 

// ============================================================================
// 📊 MODULE 4: MANAGER STATS (🔥 FIXED ERROR HERE 🔥)
// ============================================================================
router.get('/manager-dashboard-stats', afterSeminarManagerStatsController.getManagerDashboardStats);
router.get('/stats/new-inquiries', afterSeminarManagerStatsController.getNewInquiryStats);
router.get('/stats/open-seminar', afterSeminarManagerStatsController.getOpenSeminarStats);
router.get('/stats/bridge', afterSeminarManagerStatsController.getBridgePerformanceStats);
router.get('/stats/paid-campaign', afterSeminarManagerStatsController.getPaidCampaignStats);
router.get('/leads/master-directory', afterSeminarManagerStatsController.getMasterDirectory);

router.get('/retention/campaign-data', afterSeminarRetentionController.getRetentionCampaignData);

module.exports = router;