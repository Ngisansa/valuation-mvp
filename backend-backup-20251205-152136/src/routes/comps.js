const express = require('express');
const router = express.Router();
const CompsController = require('../controllers/comps');
const { authenticate, requireAdmin } = require('../utils/authMiddleware');

router.get('/', CompsController.list);
router.post('/bulk-upload', authenticate, requireAdmin, CompsController.bulkUpload); // admin can upload comps

module.exports = router;