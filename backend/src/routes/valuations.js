const express = require('express');
const router = express.Router();
const ValuationsController = require('../controllers/valuations');
const { authenticate, requireAdmin } = require('../utils/authMiddleware');

router.post('/', authenticate, ValuationsController.createValuation);
router.get('/', authenticate, ValuationsController.listUserValuations);
router.get('/:id', authenticate, ValuationsController.getValuation);
router.post('/:id/unlock', authenticate, ValuationsController.unlockValuation); // internal endpoint to mark pdf_unlocked after payment

module.exports = router;