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
 * Note: all DB queries should use parameterized queries through knex - knex does this automatically.
 */

const { median, mean } = require('../utils/stats');

module.exports = {
  estimate: async (knex, type, inputs) => {
    const methods = {};
    const results = {};

    if (type === 'property') {
      // Inputs expected: { lat, lon, area_sqm, property_type, noi, cap_rate, replacement_cost }
      const { lat, lon, area_sqm, property_type, noi, cap_rate, replacement_cost } = inputs;

      // Comparative: find nearby comps same property_type and compute median price per sqm
      // For simplicity, we select comps within a bounding box +/-0.02 degrees (~2km) - a stub for spatial search
      const latMin = lat - 0.02;
      const latMax = lat + 0.02;
      const lonMin = lon - 0.02;
      const lonMax = lon + 0.02;
      const comps = await knex('comps')
        .whereBetween('lat', [latMin, latMax])
        .andWhereBetween('lon', [lonMin, lonMax])
        .andWhere('property_type', property_type)
        .select('*');

      const ppsList = comps.filter(c => c.area_sqm > 0).map(c => Number(c.price) / Number(c.area_sqm));
      const med_pps = ppsList.length ? median(ppsList) : null;
      methods.comparative = { sampleSize: ppsList.length, median_price_per_sqm: med_pps };
      if (med_pps && area_sqm) {
        results.comparative = med_pps * area_sqm;
      }

      // Income approach: NOI / cap_rate
      if (noi && cap_rate) {
        // cap_rate provided as decimal (e.g., 0.08) or percent; normalize
        const cap = (cap_rate > 1) ? cap_rate / 100 : cap_rate;
        if (cap > 0) {
          results.income = Number(noi) / cap;
          methods.income = { noi: Number(noi), cap_rate: cap };
        }
      }

      // Cost approach: replacement cost provided
      if (replacement_cost) {
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
      if (methods.comparative.sampleSize > 5) confidence += 30;
      if (results.income) confidence += 20;
      if (results.cost) confidence += 10;
      confidence = Math.min(100, confidence);
      return { methods, results, confidence };
    }

    if (type === 'business') {
      // Inputs: { earnings, multiple, projections: [{year, cashflow}], discount_rate }
      const { earnings, multiple, projections = [], discount_rate } = inputs;

      if (earnings && multiple) {
        results.multiples = Number(earnings) * Number(multiple);
        methods.multiples = { earnings: Number(earnings), multiple: Number(multiple) };
      }

      // Simple DCF
      if (projections.length && discount_rate !== undefined) {
        const dr = (discount_rate > 1) ? discount_rate / 100 : discount_rate;
        let npv = 0;
        for (let i = 0; i < projections.length; i++) {
          const cf = Number(projections[i].cashflow || projections[i].cashFlow || projections[i].value || 0);
          const year = Number(projections[i].year || (i + 1));
          npv += cf / Math.pow(1 + dr, year);
        }
        results.dcf = npv;
        methods.dcf = { discount_rate: dr, projections_length: projections.length };
      }

      // Combined
      const candidates = Object.values(results);
      const aggregate = candidates.length ? median(candidates) : null;
      const confidence = candidates.length ? 60 + Math.min(40, candidates.length * 5) : 20;
      return { methods, results, confidence };
    }

    if (type === 'shares') {
      // Inputs: { market_price, outstanding_shares, earnings, multiple }
      const { market_price, outstanding_shares, earnings, multiple } = inputs;
      if (market_price && outstanding_shares) {
        results.market_value = Number(market_price) * Number(outstanding_shares);
        methods.market = { market_price: Number(market_price), outstanding_shares: Number(outstanding_shares) };
      }
      if (earnings && multiple) {
        results.multiples = Number(earnings) * Number(multiple);
        methods.multiples = { earnings: Number(earnings), multiple: Number(multiple) };
      }
      const candidates = Object.values(results);
      const aggregate = candidates.length ? median(candidates) : null;
      const confidence = candidates.length ? 50 + Math.min(40, candidates.length * 10) : 20;
      results.aggregate = aggregate;
      return { methods, results, confidence };
    }

    // default
    return { methods, results, confidence: 10 };
  }
};