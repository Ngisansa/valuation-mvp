# ValueCog — Full README

This README contains step-by-step instructions for local development, payments sandbox setup (ngrok), storage, CI, deployment, and testing.

Prerequisites
- Node.js >= 18
- Docker & Docker Compose (optional; recommended)
- PostgreSQL (if not using Docker)
- ngrok (for exposing local webhooks to PayPal/Paystack)

Environment variables
Copy backend/.env.example to backend/.env and fill values. Important variables:
- DATABASE_URL (postgres)
- JWT_SECRET
- PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_WEBHOOK_ID
- PAYSTACK_SECRET
- STORAGE (disk or s3) and S3_* vars if using spaces

Local development with Docker (recommended)
1. Copy env examples:
   - cp backend/.env.example backend/.env
   - cp frontend/.env.example frontend/.env
2. Adjust values if needed (especially PAYPAL_ and PAYSTACK_).
3. Start:
   docker-compose up --build
4. The backend will be available at http://localhost:4000
   The frontend at http://localhost:5173

Local development without Docker
1. Setup Postgres and create database.
2. Copy backend/.env.example to backend/.env and set DATABASE_URL accordingly.
3. Backend:
   cd backend
   npm install
   npx knex --knexfile knexfile.js migrate:latest
   node scripts/seed_comps.js
   npm run dev
4. Frontend:
   cd frontend
   npm install
   npm run dev

PayPal sandbox setup and webhook testing (ngrok)
1. Create a PayPal Developer sandbox account: https://developer.paypal.com/
2. Create a sandbox app and copy Client ID and Secret into backend/.env (PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET).
3. Create a webhook in PayPal developer dashboard; add event types like PAYMENT.CAPTURE.COMPLETED, CHECKOUT.ORDER.APPROVED. You will need to supply a webhook URL: use ngrok to expose local backend:
   ngrok http 4000
   It gives an https URL like https://abc123.ngrok.io — configure PayPal webhook URL as:
   https://abc123.ngrok.io/api/payments/paypal/webhook
4. In PayPal webhook configuration, note down the Webhook ID and put it into PAYPAL_WEBHOOK_ID in backend/.env
5. When testing, initiate a create-order from the frontend or curl, open the approvalUrl, complete sandbox payment, PayPal will call the webhook which the backend verifies by calling PayPal /v1/notifications/verify-webhook-signature.

Paystack sandbox setup and webhook testing
1. Create Paystack sandbox/test account: https://dashboard.paystack.co/
2. Copy SECRET KEY to PAYSTACK_SECRET in backend/.env
3. Using ngrok, expose webhook URL:
   https://abc123.ngrok.io/api/payments/paystack/webhook
4. In Paystack dashboard, set your webhook URL to that address.
5. Initialize a transaction via our create-order endpoint which returns an authorization_url for checkout. After payment completes, Paystack posts to your webhook; our webhook verifies signature header X-Paystack-Signature with your secret.

Storage: local disk or DigitalOcean Spaces (S3-compatible)
- Default STORAGE=disk will write PDF files to backend/storage/*.pdf
- To use DigitalOcean Spaces:
  - Create a space (bucket)
  - Set STORAGE=s3 and set S3_ENDPOINT (e.g., https://nyc3.digitaloceanspaces.com), S3_KEY, S3_SECRET, S3_BUCKET, S3_REGION
  - The backend uses @aws-sdk/client-s3 with custom endpoint and forcePathStyle true.

Deploying frontend to Vercel
- Set up a Vercel project pointing to this frontend directory.
- Build command: npm run build
- Output directory: dist
- Environment variables: VITE_API_BASE (production backend URL)

Deploying backend to Render (example)
- Create a Web Service on Render with repo root/backend as the service.
- Build command: npm install
- Start command: npm start
- Environment variables: DATABASE_URL, JWT_SECRET, PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_WEBHOOK_ID, PAYSTACK_SECRET, STORAGE / S3_*
- For Postgres, provision a managed DB (Render Postgres or ElephantSQL) and set DATABASE_URL to match.

Webhook configuration on production
- For PayPal, set webhook URL to https://<your-backend>/api/payments/paypal/webhook and copy the webhook id into PAYPAL_WEBHOOK_ID
- For Paystack, set webhook URL to https://<your-backend>/api/payments/paystack/webhook

Testing & QA
- Unit tests (backend):
  cd backend
  npm test
- The tests cover valuation engine functions (comparative, income, multiples, DCF).
- Integration tests: use the curl examples in happy_path_curl.md to test flows. Use ngrok to allow PayPal/Paystack to reach local webhooks.

CI (GitHub Actions)
- Workflow is at .github/workflows/ci.yml. It installs backend deps, runs migrations and seeds, executes tests, then builds frontend.

Security checklist (short)
- Use HTTPS in production for all endpoints.
- Keep JWT_SECRET, PAYPAL/Paystack secrets out of source control.
- Use a structured logger and centralize logs.
- Rate limit and use IP-based throttling; ideally back with Redis.
- Use managed DB with SSL and restrict inbound connections.
- Rotate webhook secrets and verify signatures (we verify Paystack and call PayPal verify endpoint).

OpenAPI / Postman
- Provide curl examples in happy_path_curl.md. For a full Postman collection, import the curl steps.

Support & notes
- This MVP is intended for evaluation and local testing. For production hardening, follow the security checklist and replace in-memory/stubbed behaviors with production-grade implementations (logging, monitoring, resilient queuing for PDF generation, background workers).
