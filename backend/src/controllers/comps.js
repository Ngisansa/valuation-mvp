const fs = require('fs');
const path = require('path');
const parse = require('csv-parse/lib/sync');

module.exports = {
  list: async (req, res) => {
    const knex = req.db;
    const comps = await knex('comps').select('*').limit(500);
    res.json({ data: comps });
  },

  bulkUpload: async (req, res) => {
    // Expect a CSV body in req.body.csv or upload file - for brevity, accept raw CSV
    const knex = req.db;
    const { csv } = req.body;
    if (!csv) return res.status(400).json({ error: 'csv required in body' });
    const records = parse(csv, { columns: true, skip_empty_lines: true });
    for (const r of records) {
      await knex('comps').insert({
        lat: r.lat,
        lon: r.lon,
        area_sqm: r.area_sqm,
        price: r.price,
        sale_date: r.sale_date,
        property_type: r.property_type
      }).onConflict('id').ignore();
    }
    res.json({ status: 'ok', inserted: records.length });
  }
};