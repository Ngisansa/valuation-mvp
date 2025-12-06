const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/admin');
const { authenticate, requireAdmin } = require('../utils/authMiddleware');

router.get('/transactions', authenticate, requireAdmin, AdminController.listTransactions);
router.get('/valuations', authenticate, requireAdmin, AdminController.listAllValuations);

module.exports = router;