/**
 * Seed comps from CSV into DB using knex
 */
const fs = require('fs');
const path = require('path');
const parse = require('csv-parse/lib/sync');
require('dotenv').config();
const knexConfig = require('../knexfile');
const knex = require('knex')(knexConfig.development);

async function run() {
  const csv = fs.readFileSync(path.join(__dirname, '../seeds/comps_sample.csv'), 'utf8');
  const records = parse(csv, {
    columns: true,
    skip_empty_lines: true
  });

  for (const r of records) {
    await knex('comps').insert({
      id: r.id,
      lat: r.lat,
      lon: r.lon,
      area_sqm: r.area_sqm,
      price: r.price,
      sale_date: r.sale_date,
      property_type: r.property_type
    }).onConflict('id').ignore();
  }
  console.log('Seeded comps');
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });