const express = require('express');
const router = express.Router();
const coordinatorCrmController = require('../controllers/coordinatorCrmController'); 

// Leads Routes
router.get('/leads', coordinatorCrmController.getLeads);
router.post('/leads/import', coordinatorCrmController.importLead);
router.post('/leads/assign', coordinatorCrmController.assignLeads); 

// Student Info & Tools
router.get('/lead-details/:phone', coordinatorCrmController.getLeadDetails);
router.post('/reset-password', coordinatorCrmController.resetStudentPassword);

// 🔥 Chat Messages Routes (අලුතින් දැම්මේ) 🔥
router.get('/messages/:leadId', coordinatorCrmController.getMessages);
router.post('/messages', coordinatorCrmController.sendMessage);

// Meta Webhook Routes
router.get('/webhook', coordinatorCrmController.verifyWebhook); 
router.post('/webhook', coordinatorCrmController.receiveMessage);

module.exports = router;