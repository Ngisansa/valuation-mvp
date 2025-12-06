const ValuationEngine = require('../src/services/valuationEngine');

describe('valuation engine unit tests', () => {
  test('comparative median price per sqm', async () => {
    // Simulate knex with comps in-memory: we provide a dummy knex object with query builder methods
    const fakeKnex = {
      // when whereBetween etc are called, we'll return sample comps
      whereBetween: function() { return this; },
      andWhereBetween: function() { return this; },
      andWhere: function() { return this; },
      select: function() {
        return Promise.resolve([
          { area_sqm: 100, price: 100000 },
          { area_sqm: 200, price: 250000 },
          { area_sqm: 80, price: 90000 }
        ]);
      }
    };

    const inputs = { lat: 0, lon: 0, area_sqm: 100, property_type: 'apartment' };
    const { methods, results, confidence } = await ValuationEngine.estimate(fakeKnex, 'property', inputs);
    expect(methods.comparative.sampleSize).toBe(3);
    // price per sqm: [1000,1250,1125] median = 1125
    expect(Math.round(methods.comparative.median_price_per_sqm)).toBe(1125);
    expect(Math.round(results.comparative)).toBe(1125 * 100);
    expect(confidence).toBeGreaterThan(0);
  });

  test('income approach NOI / cap rate', async () => {
    const fakeKnex = { whereBetween: () => ({ andWhereBetween: () => ({ andWhere: () => ({ select: () => Promise.resolve([]) }) }) }) };
    const inputs = { lat:0, lon:0, area_sqm:200, property_type: 'land', noi: 10000, cap_rate: 0.05 };
    const { results } = await ValuationEngine.estimate(fakeKnex, 'property', inputs);
    expect(Math.round(results.income)).toBe(Math.round(10000 / 0.05));
  });

  test('multiples and basic DCF for business', async () => {
    const fakeKnex = {};
    const inputs = { earnings: 50000, multiple: 4, projections: [{year:1, cashflow:30000},{year:2, cashflow:35000}], discount_rate: 0.1 };
    const { methods, results } = await ValuationEngine.estimate(fakeKnex, 'business', inputs);
    expect(results.multiples).toBe(50000 * 4);
    expect(results.dcf).toBeGreaterThan(0);
  });
});