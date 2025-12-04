const axios = require('axios');
const crypto = require('crypto');

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const PAYPAL_BASE = process.env.PAYPAL_BASE || 'https://api-m.sandbox.paypal.com';
const PAYPAL_WEBHOOK_ID = process.env.PAYPAL_WEBHOOK_ID || '';

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET || '';
const PAYSTACK_BASE = 'https://api.paystack.co';

const createBasicAuth = (client, secret) => Buffer.from(`${client}:${secret}`).toString('base64');

async function getPaypalToken() {
  const auth = createBasicAuth(PAYPAL_CLIENT_ID, PAYPAL_SECRET);
  const resp = await axios.post(`${PAYPAL_BASE}/v1/oauth2/token`, 'grant_type=client_credentials', {
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });
  return resp.data.access_token;
}

module.exports = {
  createPayPalOrder: async (req, res) => {
    const knex = req.db;
    const { valuationId, amount } = req.body;
    if (!valuationId || !amount) return res.status(400).json({ error: 'valuationId and amount required' });

    // Create order in DB
    const [tx] = await knex('transactions').insert({
      user_id: req.user.id,
      valuation_id: valuationId,
      provider: 'paypal',
      status: 'created',
      amount
    }).returning('*');

    try {
      const token = await getPaypalToken();
      const resp = await axios.post(`${PAYPAL_BASE}/v2/checkout/orders`, {
        intent: 'CAPTURE',
        purchase_units: [{ amount: { currency_code: 'USD', value: String(amount) } }],
        application_context: { return_url: `${process.env.FRONTEND_URL}/payments/paypal/return`, cancel_url: `${process.env.FRONTEND_URL}/payments/paypal/cancel` }
      }, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      });

      const order = resp.data;
      // store provider_order_id
      await knex('transactions').where({ id: tx.id }).update({ provider_order_id: order.id, payload: JSON.stringify(order) });
      // return approval link
      const approve = order.links.find(l => l.rel === 'approve');
      res.json({ approvalUrl: approve.href, order });
    } catch (e) {
      console.error('PayPal create order error', e.response?.data || e.message);
      res.status(500).json({ error: 'failed_create_order' });
    }
  },

  // NEW: Capture PayPal order after buyer approves payment and returns to frontend
  capturePayPalOrder: async (req, res) => {
    // Body: { orderId, transactionId (optional) }
    const knex = req.db;
    const { orderId, valuationId } = req.body;
    if (!orderId) return res.status(400).json({ error: 'orderId required' });

    try {
      const token = await getPaypalToken();
      const resp = await axios.post(`${PAYPAL_BASE}/v2/checkout/orders/${orderId}/capture`, {}, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      });

      const captureData = resp.data;
      // find transaction by order id
      const tx = await knex('transactions').where({ provider_order_id: orderId }).first();
      if (tx) {
        await knex('transactions').where({ id: tx.id }).update({ status: 'completed', payload: JSON.stringify(captureData) });
        if (tx.valuation_id) {
          await knex('valuations').where({ id: tx.valuation_id }).update({ pdf_unlocked: true });
        }
      }

      res.json({ status: 'captured', data: captureData });
    } catch (e) {
      console.error('capture error', e.response?.data || e.message);
      res.status(500).json({ error: 'capture_failed' });
    }
  },

  paypalWebhook: async (req, res) => {
    // PayPal sends JSON with headers for verification
    try {
      const token = await getPaypalToken();
      const verifyBody = {
        auth_algo: req.headers['paypal-auth-algo'],
        cert_url: req.headers['paypal-cert-url'],
        transmission_id: req.headers['paypal-transmission-id'],
        transmission_sig: req.headers['paypal-transmission-sig'],
        transmission_time: req.headers['paypal-transmission-time'],
        webhook_id: PAYPAL_WEBHOOK_ID,
        webhook_event: req.body
      };
      const resp = await axios.post(`${PAYPAL_BASE}/v1/notifications/verify-webhook-signature`, verifyBody, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (resp.data.verification_status !== 'SUCCESS') {
        console.warn('paypal webhook verification failed', resp.data);
        return res.status(400).send('verification_failed');
      }

      // Handle event
      const event = req.body;
      if (event.event_type === 'CHECKOUT.ORDER.APPROVED' || event.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
        // find transaction by order id
        const orderId = event.resource?.id || event.resource?.supplementary_data?.related_ids?.order_id;
        const knexConfig = require('../knexfile.js') && require('knex')(require('../knexfile.js').development);
        const tx = await knexConfig('transactions').where({ provider_order_id: orderId }).first();
        if (tx) {
          await knexConfig('transactions').where({ id: tx.id }).update({ status: 'completed', payload: JSON.stringify(event) });
          // unlock pdf
          if (tx.valuation_id) {
            await knexConfig('valuations').where({ id: tx.valuation_id }).update({ pdf_unlocked: true });
          }
        }
      }

      res.json({ status: 'ok' });
    } catch (e) {
      console.error('paypal webhook error', e.response?.data || e.message);
      res.status(500).send('error');
    }
  },

  createPaystackOrder: async (req, res) => {
    const knex = req.db;
    const { valuationId, amount } = req.body;
    if (!valuationId || !amount) return res.status(400).json({ error: 'valuationId and amount required' });

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
      await knex('transactions').where({ id: tx.id }).update({ provider_order_id: data.reference, payload: JSON.stringify(data) });
      res.json({ authorization_url: data.authorization_url, reference: data.reference });
    } catch (e) {
      console.error('paystack create order error', e.response?.data || e.message);
      res.status(500).json({ error: 'failed_create_order' });
    }
  },

  paystackWebhook: async (req, res) => {
    // raw body required. Verify signature header against secret
    const signature = req.headers['x-paystack-signature'];
    const payload = req.body.toString(); // raw body
    const hash = crypto.createHmac('sha512', PAYSTACK_SECRET).update(payload).digest('hex');
    if (hash !== signature) {
      console.warn('paystack signature mismatch');
      return res.status(400).send('invalid signature');
    }
    const event = JSON.parse(payload);
    if (event.event === 'charge.success') {
      const reference = event.data.reference;
      const knexConfig = require('../knexfile');
      const knex = require('knex')(knexConfig.development);
      const tx = await knex('transactions').where({ provider_order_id: reference }).first();
      if (tx) {
        await knex('transactions').where({ id: tx.id }).update({ status: 'completed', payload: JSON.stringify(event) });
        if (tx.valuation_id) {
          await knex('valuations').where({ id: tx.valuation_id }).update({ pdf_unlocked: true });
        }
      }
    }
    res.send('ok');
  }
};