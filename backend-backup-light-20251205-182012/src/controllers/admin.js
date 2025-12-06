module.exports = {
  listTransactions: async (req, res) => {
    const knex = req.db;
    const txs = await knex('transactions').orderBy('created_at', 'desc').limit(500);
    res.json({ data: txs });
  },

  listAllValuations: async (req, res) => {
    const knex = req.db;
    const vals = await knex('valuations').orderBy('created_at', 'desc').limit(500);
    res.json({ data: vals });
  }
};