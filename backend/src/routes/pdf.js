const express = require('express');
const router = express.Router();
const PdfController = require('../controllers/pdf');
const { authenticate } = require('../utils/authMiddleware');

router.post('/generate/:valuationId', authenticate, PdfController.generatePdf);
router.get('/download/:fileId', authenticate, PdfController.downloadPdf);

// NEW: public-download accepts token as query param and verifies it server-side before returning file.
// Useful if you need to support clicks from emails with token in link.
router.get('/public-download/:fileId', PdfController.publicDownload);

module.exports = router;