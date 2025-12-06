/**
 * Valuation engine implementing:
 * - property comparative method (median price/sqm from comps)
 * - income approach (NOI / cap rate)
 * - cost approach (replacement cost)
 * - multiples (multiple × earnings)
 * - DCF (simple projection + discount)
 *
 * Returns methods used, results object, and confidence score (0-100)
 *
 * The exported `estimate` function is flexible and supports multiple call signatures for
 * backward compatibility:
 *  - estimate(params)                       // treats as property estimate with params containing lat, lon, property_type, etc.
 *  - estimate(type, inputs)                 // type = 'property' | 'business' | 'shares'
 *  - estimate(knexInstance, type, inputs)   // accepts an explicit knex instance (keeps compatibility)
 *
 * All DB queries use the provided or the singleton knex instance.
 */

const knexDefault = require('../db/knex');
const { median, mean } = require('../utils/stats');

async function estimateProperty(localKnex, inputs) {
  const methods = {};
  const results = {};

  const { lat = 0, lon = 0, area_sqm, property_type, noi, cap_rate, replacement_cost } = inputs;

  const latMin = lat - 0.02;
  const latMax = lat + 0.02;
  const lonMin = lon - 0.02;
  const lonMax = lon + 0.02;

  const comps = await localKnex('comps')
    .whereBetween('lat', [latMin, latMax])
    .andWhereBetween('lon', [lonMin, lonMax])
    .andWhere('property_type', property_type)
    .select('*');

  const ppsList = comps
    .filter(c => c && Number(c.area_sqm) > 0 && Number(c.price) > 0)
    .map(c => Number(c.price) / Number(c.area_sqm));

  const med_pps = ppsList.length ? median(ppsList) : null;
  methods.comparative = { sampleSize: ppsList.length, median_price_per_sqm: med_pps };
  if (med_pps && area_sqm) {
    results.comparative = med_pps * Number(area_sqm);
  }

  // Income approach: NOI / cap_rate
  if (noi !== undefined && cap_rate !== undefined && cap_rate !== 0) {
    const cap = (Number(cap_rate) > 1) ? Number(cap_rate) / 100 : Number(cap_rate);
    if (cap > 0) {
      results.income = Number(noi) / cap;
      methods.income = { noi: Number(noi), cap_rate: cap };
    }
  }

  // Cost approach: replacement cost provided
  if (replacement_cost !== undefined) {
    results.cost = Number(replacement_cost);
    methods.cost = { replacement_cost: Number(replacement_cost) };
  }

  // Aggregate simple weighted average: weights based on data availability
  const available = [];
  if (results.comparative) available.push({ method: 'comparative', value: results.comparative, weight: 0.5 });
  if (results.income) available.push({ method: 'income', value: results.income, weight: 0.3 });
  if (results.cost) available.push({ method: 'cost', value: results.cost, weight: 0.2 });

  let aggregated = null;
  if (available.length) {
    const totalWeight = available.reduce((s, a) => s + a.weight, 0);
    aggregated = available.reduce((s, a) => s + (a.value * a.weight), 0) / totalWeight;
  }
  results.aggregate = aggregated;

  // Confidence: based on sample size and methods available
  let confidence = 20;
  if (methods.comparative && methods.comparative.sampleSize > 5) confidence += 30;
  if (results.income) confidence += 20;
  if (results.cost) confidence += 10;
  confidence = Math.min(100, confidence);

  return { methods, results, confidence };
}

async function estimateBusiness(localKnex, inputs) {
  const methods = {};
  const results = {};

  const { earnings, multiple, projections = [], discount_rate } = inputs || {};

  if (earnings !== undefined && multiple !== undefined) {
    results.multiples = Number(earnings) * Number(multiple);
    methods.multiples = { earnings: Number(earnings), multiple: Number(multiple) };
  }

  // Simple DCF
  if (Array.isArray(projections) && projections.length && discount_rate !== undefined) {
    const dr = (Number(discount_rate) > 1) ? Number(discount_rate) / 100 : Number(discount_rate);
    let npv = 0;
    for (let i = 0; i < projections.length; i++) {
      const cf = Number(projections[i].cashflow ?? projections[i].cashFlow ?? projections[i].value ?? 0);
      const year = Number(projections[i].year ?? (i + 1));
      npv += cf / Math.pow(1 + dr, year);
    }
    results.dcf = npv;
    methods.dcf = { discount_rate: dr, projections_length: projections.length };
  }

  const candidates = Object.values(results);
  const aggregate = candidates.length ? median(candidates) : null;
  const confidence = candidates.length ? 60 + Math.min(40, candidates.length * 5) : 20;

  return { methods, results, confidence };
}

async function estimateShares(localKnex, inputs) {
  const methods = {};
  const results = {};

  const { market_price, outstanding_shares, earnings, multiple } = inputs || {};

  if (market_price !== undefined && outstanding_shares !== undefined) {
    results.market_value = Number(market_price) * Number(outstanding_shares);
    methods.market = { market_price: Number(market_price), outstanding_shares: Number(outstanding_shares) };
  }
  if (earnings !== undefined && multiple !== undefined) {
    results.multiples = Number(earnings) * Number(multiple);
    methods.multiples = { earnings: Number(earnings), multiple: Number(multiple) };
  }

  const candidates = Object.values(results);
  const aggregate = candidates.length ? median(candidates) : null;
  const confidence = candidates.length ? 50 + Math.min(40, candidates.length * 10) : 20;
  results.aggregate = aggregate;
  return { methods, results, confidence };
}

/**
 * Flexible exported estimate function. Accepts:
 *  - (params) -> treats as property estimate (params contains lat/lon, etc)
 *  - (type, inputs)
 *  - (knexInstance, type, inputs)
 */
module.exports = {
  estimate: async (...args) => {
    // Determine call signature
    let localKnex = knexDefault;
    let type;
    let inputs;

    // Accept either:
    //  - a function fakeKnex (tests may provide a fakeKnex function)
    //  - or an initialized knex object (has .client)
    //  - or the single-arg legacy params object
    if (args.length >= 1 && args[0]) {
      if (typeof args[0] === 'function' || (typeof args[0] === 'object' && args[0].client)) {
        localKnex = args[0];
        type = args[1];
        inputs = args[2] || {};
      } else if (args.length === 1 && typeof args[0] === 'object' && !args[0].type) {
        type = 'property';
        inputs = args[0];
      } else {
        type = args[0];
        inputs = args[1] || {};
      }
    } else {
      // default fallback
      type = 'property';
      inputs = {};
    }

    // Normalize type
    if (!type) type = 'property';

    // Dispatch
    if (type === 'property') {
      return estimateProperty(localKnex, inputs);
    }
    if (type === 'business') {
      return estimateBusiness(localKnex, inputs);
    }
    if (type === 'shares') {
      return estimateShares(localKnex, inputs);
    }

    // unknown type -> return minimal structure
    return { methods: {}, results: {}, confidence: 10 };
  }
};
