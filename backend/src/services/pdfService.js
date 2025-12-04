const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');
const Storage = require('./storageService');
const uuid = require('crypto').randomBytes;

function renderHtml(valuation, user) {
  // Basic HTML template - in production use a templating engine
  const id = valuation.id;
  const reportId = `VC-${id}-${Date.now()}`;
  const inputs = JSON.stringify(valuation.inputs, null, 2);
  const results = JSON.stringify(valuation.results, null, 2);
  const methods = JSON.stringify(valuation.methods, null, 2);
  return `
  <html>
  <head>
    <meta charset="utf-8"/>
    <title>ValueCog Report ${reportId}</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 20px; color: #222; }
      h1, h2 { color: #1f2937; }
      pre { background: #f4f4f4; padding: 10px; border-radius: 6px; overflow: auto; }
      .meta { font-size: 12px; color: #555; }
    </style>
  </head>
  <body>
    <h1>ValueCog Valuation Report</h1>
    <p class="meta">Report ID: ${reportId}</p>
    <p class="meta">Generated for: ${user.email}</p>
    <h2>Inputs</h2>
    <pre>${inputs}</pre>
    <h2>Methods</h2>
    <pre>${methods}</pre>
    <h2>Results</h2>
    <pre>${results}</pre>
    <h2>Assumptions</h2>
    <p>All valuations are algorithmic estimates for informational purposes. Confidence score between 0-100 is provided.</p>
    <footer><p>ValueCog &copy; ${new Date().getFullYear()}</p></footer>
  </body>
  </html>
  `;
}

module.exports = {
  generateAndStorePdf: async (knex, valuation, user) => {
    // render html
    const html = renderHtml(valuation, user || { email: 'unknown' });
    // Launch puppeteer - in Docker, may need --no-sandbox
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const buffer = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();

    const filename = `valuation-${valuation.id}-${Date.now()}.pdf`;
    if ((process.env.STORAGE || 'disk') === 's3') {
      // store to S3-compatible
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