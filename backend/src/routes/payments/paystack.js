const express = require('express');
const axios = require('axios');
const crypto = require('crypto');

const router = express.Router();
const PAYSTACK_BASE = process.env.PAYSTACK_BASE || 'https://api.paystack.co';
const SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

// Adjust this import if your authenticate middleware path differs
const { authenticate } = require('../../utils/authMiddleware'); // path may vary
// This code assumes req.db is the knex instance via your db middleware

// POST /api/payments/paystack/initiate
router.post('/initiate', authenticate, async (req, res) => {
  try {
    const { valuationId, amount } = req.body;
    if (!valuationId || !amount) return res.status(400).json({ error: 'missing valuationId or amount' });

    const val = await req.db('valuations').where({ id: valuationId }).first();
    if (!val) return res.status(404).json({ error: 'valuation not found' });
    if (val.user_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'forbidden' });

    const payload = {
      email: req.user.email || 'buyer@example.com',
      amount: Math.round(Number(amount) * 100),
      metadata: { valuationId },
      callback_url: `${process.env.FRONTEND_URL || ''}/payments/return`
    };

    const r = await axios.post(`${PAYSTACK_BASE}/transaction/initialize`, payload, {
      headers: { Authorization: `Bearer ${SECRET_KEY}`, 'Content-Type': 'application/json' }
    });

    if (!r.data || !r.data.data) {
      return res.status(500).json({ error: 'paystack_init_no_data' });
    }

    const data = r.data.data;
    await req.db('valuations').where({ id: valuationId }).update({ payment_reference: data.reference });

    return res.json({ ok: true, data });
  } catch (err) {
    console.error('Paystack initiate error', err && err.response ? err.response.data || err.response.statusText : err.message);
    return res.status(500).json({ error: 'paystack_initiate_failed', message: err.message });
  }
});

// GET /api/payments/paystack/verify?reference=...
router.get('/verify', authenticate, async (req, res) => {
  try {
    const { reference, valuationId } = req.query;
    if (!reference) return res.status(400).json({ error: 'missing reference' });

    const r = await axios.get(`${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${SECRET_KEY}` }
    });

    if (!r.data || !r.data.data) return res.status(500).json({ error: 'invalid_paystack_response' });

    const tx = r.data.data;
    const metaValuationId = tx.metadata && tx.metadata.valuationId ? Number(tx.metadata.valuationId) : (valuationId ? Number(valuationId) : null);
    if (metaValuationId) {
      await req.db('valuations').where({ id: metaValuationId }).update({ pdf_unlocked: true, payment_reference: reference });
    } else {
      await req.db('valuations').where({ payment_reference: reference }).update({ pdf_unlocked: true });
    }

    return res.json({ ok: true, tx });
  } catch (err) {
    console.error('Paystack verify error', err && err.response ? err.response.data || err.response.statusText : err.message);
    return res.status(500).json({ error: 'paystack_verify_failed', message: err.message });
  }
});

// POST /api/payments/paystack/webhook
router.post('/webhook', express.json({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.get('x-paystack-signature') || '';
    const body = JSON.stringify(req.body || {});
    const expected = crypto.createHmac('sha512', SECRET_KEY).update(body).digest('hex');

    if (signature !== expected) {
      console.warn('Paystack webhook invalid signature');
      return res.status(400).send('invalid signature');
    }

    const event = req.body;
    if (event.event === 'charge.success' || event.event === 'transaction.success') {
      const reference = event.data && event.data.reference;
      if (reference) {
        await req.db('valuations').where({ payment_reference: reference }).update({ pdf_unlocked: true });
      }
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('Paystack webhook error', err && err.stack ? err.stack : err);
    res.status(500).end();
  }
});

module.exports = router;