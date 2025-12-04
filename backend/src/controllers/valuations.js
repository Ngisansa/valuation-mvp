const ValuationEngine = require('../services/valuationEngine');

module.exports = {
  createValuation: async (req, res) => {
    const knex = req.db;
    const userId = req.user.id;
    const { type, inputs } = req.body;
    if (!type || !inputs) return res.status(400).json({ error: 'type and inputs required' });

    // Call valuation engine to compute methods & results
    const { methods, results, confidence } = await ValuationEngine.estimate(knex, type, inputs);

    const [val] = await knex('valuations').insert({
      user_id: userId,
      type,
      inputs: JSON.stringify(inputs),
      methods: JSON.stringify(methods),
      results: JSON.stringify(results),
      confidence
    }).returning('*');

    res.json({ valuation: val });
  },

  listUserValuations: async (req, res) => {
    const knex = req.db;
    const vals = await knex('valuations').where({ user_id: req.user.id }).orderBy('created_at', 'desc');
    res.json({ data: vals });
  },

  getValuation: async (req, res) => {
    const knex = req.db;
    const id = req.params.id;
    const val = await knex('valuations').where({ id }).first();
    if (!val) return res.status(404).json({ error: 'not found' });
    if (val.user_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'forbidden' });
    res.json({ valuation: val });
  },

  unlockValuation: async (req, res) => {
    // Mark pdf_unlocked true after payment verification
    const knex = req.db;
    const id = req.params.id;
    const val = await knex('valuations').where({ id }).first();
    if (!val) return res.status(404).json({ error: 'not found' });
    if (val.user_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'forbidden' });

    await knex('valuations').where({ id }).update({ pdf_unlocked: true });
    res.json({ status: 'unlocked' });
  }
};