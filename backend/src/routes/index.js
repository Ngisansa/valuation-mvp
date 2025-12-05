const express = require('express');
const router = express.Router();

const authRoutes = require('./auth');
const compRoutes = require('./comps');
const valuationRoutes = require('./valuations');
const paymentRoutes = require('./payments');
const pdfRoutes = require('./pdf');
const adminRoutes = require('./admin');
const paystackRoutes = require('./payments/paystack');

router.use('/auth', authRoutes);
router.use('/comps', compRoutes);
router.use('/valuations', valuationRoutes);
router.use('/payments', paymentRoutes);
router.use('/pdf', pdfRoutes);
router.use('/admin', adminRoutes);
router.use('/payments/paystack', paystackRoutes);

module.exports = router;