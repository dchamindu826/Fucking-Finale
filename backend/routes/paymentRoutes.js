const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

// Get all payments
router.get('/', paymentController.getPayments);

// Action for standard payments (Approve / Reject)
router.post('/action', paymentController.paymentAction);

// 🔥 මේක තමයි ඔයාගේ 404 ආපු අලුත් Installment Route එක
router.post('/action/installment', paymentController.approveInstallment);

// Grant Temporary Access (Post Pay)
router.post('/post-pay', paymentController.grantPostPay);

module.exports = router;