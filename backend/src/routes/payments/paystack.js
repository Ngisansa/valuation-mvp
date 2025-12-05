const express = require('express');
const axios = require('axios');
const router = express.Router();
const { authenticate } = require('../../utils/authMiddleware');

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET || '';
const PAYSTACK_BASE = 'https://api.paystack.co';

router.post('/initiate', authenticate, async (req, res) => {
  const knex = req.db;
  const { valuationId, amount } = req.body;
  if (!valuationId || !amount) {
    return res.status(400).json({ error: 'valuationId and amount required' });
  }

  const [tx] = await knex('transactions').insert({
    user_id: req.user.id,
    valuation_id: valuationId,
    provider: 'paystack',
    status: 'created',
    amount
  }).returning('*');

  try {
    const resp = await axios.post(`${PAYSTACK_BASE}/transaction/initialize`, {
      amount: Math.round(amount * 100),
      email: req.user.email,
      metadata: { valuationId, txId: tx.id }
    }, {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` }
    });
    const data = resp.data.data;
    await knex('transactions').where({ id: tx.id }).update({
      provider_order_id: data.reference,
      payload: JSON.stringify(data)
    });
    res.json({ authorization_url: data.authorization_url, reference: data.reference });
  } catch (e) {
    console.error('paystack initiate error', e.response?.data || e.message);
    res.status(500).json({ error: 'failed_initiate' });
  }
});

module.exports = router;
