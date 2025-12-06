const express = require('express');
const router = express.Router();
const PaymentController = require('../controllers/payments');
const { authenticate } = require('../utils/authMiddleware');

router.post('/paypal/create-order', authenticate, PaymentController.createPayPalOrder);
router.post('/paypal/capture', authenticate, PaymentController.capturePayPalOrder); // new: capture after approval
router.post('/paypal/webhook', PaymentController.paypalWebhook); // PayPal sends webhooks here

router.post('/paystack/create-order', authenticate, PaymentController.createPaystackOrder);
router.post('/paystack/webhook', express.raw({ type: '*/*' }), PaymentController.paystackWebhook); // raw for signature

module.exports = router;