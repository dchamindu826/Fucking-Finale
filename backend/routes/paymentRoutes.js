const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

router.get('/', paymentController.getPayments);
router.post('/action', paymentController.paymentAction);
router.post('/post-pay', paymentController.grantPostPay);

module.exports = router;