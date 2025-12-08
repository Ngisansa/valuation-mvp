const crypto = require("crypto");

/**
 * Sign a payload using Paystack webhook secret (HMAC SHA512 hex).
 * Use this helper in tests to generate a signature.
 *
 * @param {string|Buffer} bodyString - the raw stringified request body
 * @param {string} secret - the Paystack webhook secret
 * @returns {string} hex digest
 */
function signPayload(bodyString, secret) {
  return crypto.createHmac('sha512', String(secret)).update(String(bodyString)).digest('hex');
}

/**
 * Verify Paystack webhook signature in a timing-safe way.
 *
 * @param {string|Buffer} bodyString - the raw stringified request body
 * @param {string} signature - x-paystack-signature header value (hex)
 * @param {string} secret - the Paystack webhook secret
 * @returns {boolean}
 */
function verifySignature(bodyString, signature, secret) {
  if (!signature || !secret) return false;
  try {
    const expected = signPayload(bodyString, secret);
    const expectedBuf = Buffer.from(expected, 'hex');
    const sigBuf = Buffer.from(String(signature), 'hex');
    // If lengths mismatch, timingSafeEqual will throw, so guard
    if (expectedBuf.length !== sigBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, sigBuf);
  } catch (err) {
    return false;
  }
}

module.exports = {
  signPayload,
  verifySignature
};