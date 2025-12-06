const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const streamBuffers = require('stream-buffers');
const Storage = require('./storageService');

/**
 * Simple PDF generation using pdfkit (no Chromium). This is synchronous generation to buffer,
 * then saved to disk or uploaded to S3-compatible storage depending on STORAGE env.
 *
 * File name: valuation-<id>-<timestamp>.pdf
 */

function renderPdfBuffer(valuation, user) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const writableStreamBuffer = new streamBuffers.WritableStreamBuffer({
        initialSize: (100 * 1024),   // start at 100 kilobytes.
        incrementAmount: (10 * 1024) // grow by 10 kilobytes each time buffer overflows.
      });

      doc.pipe(writableStreamBuffer);

      // Header
      doc.fontSize(20).text('ValueCog Valuation Report', { align: 'center' });
      doc.moveDown();
      doc.fontSize(10).fillColor('#444').text(`Generated for: ${user?.email || 'unknown'}`, { align: 'left' });
      doc.text(`Report ID: VC-${valuation.id}-${Date.now()}`, { align: 'left' });
      doc.moveDown();

      // Inputs
      doc.fontSize(14).fillColor('#000').text('Inputs', { underline: true });
      doc.fontSize(10).fillColor('#333').text(JSON.stringify(valuation.inputs, null, 2));
      doc.moveDown();

      // Methods
      doc.fontSize(14).fillColor('#000').text('Methods', { underline: true });
      doc.fontSize(10).fillColor('#333').text(JSON.stringify(valuation.methods, null, 2));
      doc.moveDown();

      // Results
      doc.fontSize(14).fillColor('#000').text('Results', { underline: true });
      doc.fontSize(10).fillColor('#333').text(JSON.stringify(valuation.results, null, 2));
      doc.moveDown();

      // Assumptions
      doc.fontSize(12).fillColor('#000').text('Assumptions', { underline: true });
      doc.fontSize(10).fillColor('#333').text('All valuations are algorithmic estimates for informational purposes. Confidence score between 0-100 is provided.');

      doc.end();

      writableStreamBuffer.on('finish', () => {
        const buffer = writableStreamBuffer.getContents();
        if (!buffer) return reject(new Error('Failed to create PDF buffer'));
        resolve(buffer);
      });
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  generateAndStorePdf: async (knex, valuation, user) => {
    const buffer = await renderPdfBuffer(valuation, user);
    const filename = `valuation-${valuation.id}-${Date.now()}.pdf`;

    if ((process.env.STORAGE || 'disk') === 's3') {
      // uploadBuffer expects buffer and content-type
      await Storage.uploadBuffer(filename, buffer, 'application/pdf');
      return filename;
    } else {
      const outDir = path.join(__dirname, '../../storage');
      if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
      const fp = path.join(outDir, filename);
      fs.writeFileSync(fp, buffer);
      return filename;
    }
  }
};