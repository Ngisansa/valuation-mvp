const axios = require("axios");
const { signPayload, verifySignature } = require("../src/utils/paystackWebhook");

describe("Paystack integration tests (skeleton)", () => {
  const defaultSecret = process.env.PAYSTACK_SECRET_TEST || "test_secret";

  test("webhook signature round-trip: sign then verify", () => {
    const payload = { event: "charge.success", data: { id: "ch_123", amount: 1000 } };
    const body = JSON.stringify(payload);
    const sig = signPayload(body, defaultSecret);
    expect(typeof sig).toBe("string");
    const ok = verifySignature(body, sig, defaultSecret);
    expect(ok).toBe(true);
  });

  test("optional E2E: POST webhook to staging URL if STAGING_URL is set", async () => {
    const staging = process.env.STAGING_URL;
    if (!staging) {
      console.log("STAGING_URL not set; skipping E2E webhook POST test.");
      return;
    }

    const payload = { event: "charge.success", data: { id: "ch_e2e", amount: 5000 } };
    const body = JSON.stringify(payload);
    const sig = signPayload(body, process.env.PAYSTACK_SECRET_TEST);

    const url = `${staging.replace(/\\/$/, "")}/payments/webhook`; // adjust path if your webhook path differs

    const res = await axios.post(url, payload, {
      headers: {
        "Content-Type": "application/json",
        "x-paystack-signature": sig
      },
      timeout: 10000
    });

    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(300);
  }, 20000);
});