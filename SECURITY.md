Security checklist (MVP -> Production)
- Replace console logs with pino/winston and structured logs.
- Enforce HTTPS and HSTS in production.
- Use secure cookie flags, rotate JWT secret and consider refresh tokens.
- Use strong password policy and rate limit authentication endpoints.
- Use managed DB with restricted IPs and TLS.
- Store secrets in a secrets manager (Render, Vercel), never in repo.
- Verify webhooks (PayPal verification is implemented, Paystack HMAC implemented).
- Scan dependencies (dependabot, Snyk).