const path = require('path');
const fs = require('fs');
const PdfService = require('../services/pdfService');
const jwt = require('jsonwebtoken');

module.exports = {
  generatePdf: async (req, res) => {
    const knex = req.db;
    const valuationId = req.params.valuationId;
    const val = await knex('valuations').where({ id: valuationId }).first();
    if (!val) return res.status(404).json({ error: 'valuation not found' });
    if (val.user_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'forbidden' });

    // Generate PDF asynchronously
    const filePath = await PdfService.generateAndStorePdf(knex, val, req.user);

    // Update valuation pdf path
    await knex('valuations').where({ id: valuationId }).update({ pdf_path: filePath });

    res.json({ status: 'created', path: filePath });
  },

  downloadPdf: async (req, res) => {
    const knex = req.db;
    const fileId = req.params.fileId;
    // fileId is the filename; fetch valuation referencing that pdf_path
    const val = await knex('valuations').where({ pdf_path: fileId }).first();
    if (!val) return res.status(404).json({ error: 'not found' });
    if (val.user_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'forbidden' });
    if (!val.pdf_unlocked && req.user.role !== 'admin') return res.status(403).json({ error: 'not paid' });

    const storage = process.env.STORAGE || 'disk';
    if (storage === 'disk') {
      const fp = path.join(__dirname, '../../storage', fileId);
      if (!fs.existsSync(fp)) return res.status(404).json({ error: 'file missing' });
      res.download(fp);
    } else {
      // S3-compatible GET presigned url (not implemented fully here)
      const url = await require('../services/storageService').getDownloadUrl(fileId);
      res.json({ url });
    }
  },

  // NEW: Public download that accepts token as query param
  publicDownload: async (req, res) => {
    const token = req.query.token;
    if (!token) return res.status(400).json({ error: 'token required' });
    try {
      const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
      const payload = jwt.verify(token, JWT_SECRET);
      // payload has user id
      const knex = require('../knexfile') && require('knex')(require('../knexfile').development);
      const fileId = req.params.fileId;
      const val = await knex('valuations').where({ pdf_path: fileId }).first();
      if (!val) return res.status(404).json({ error: 'not found' });
      if (val.user_id !== payload.id) return res.status(403).json({ error: 'forbidden' });
      if (!val.pdf_unlocked) return res.status(403).json({ error: 'not paid' });
      const fp = path.join(__dirname, '../../storage', fileId);
      if (!fs.existsSync(fp)) return res.status(404).json({ error: 'file missing' });
      res.download(fp);
    } catch (e) {
      return res.status(401).json({ error: 'invalid token' });
    }
  }
};