# RSPort Sports Store

I originally made this project two years ago as a sports shop frontend, and recently decided to modify it and improve it into a fuller online store.

RSPort is now a runnable full-stack sports e-commerce project. The original static HTML, CSS, and image assets are still present in `frontend/`, and a secure Node.js backend has been added for products, carts, customer accounts, orders, and Stripe-ready checkout.

## Features

- Static storefront served by the backend from `frontend/`
- Product catalog API with server-owned prices and inventory
- Shopping cart API with signed guest cart cookies
- Customer registration and login with scrypt password hashing
- HttpOnly, signed session cookies
- CSRF protection for authenticated state-changing requests
- Same-origin request checks and rate limiting
- Security headers including CSP, frame protection, and content sniffing protection
- Server-calculated totals, shipping, tax, and coupon support
- Order creation with trusted server-side item snapshots
- Stripe PaymentIntent checkout support without storing card data
- Stripe webhook verification and idempotent payment finalization
- Local demo checkout for development when Stripe keys are not configured
- Node test coverage for catalog, cart, auth, and checkout flows

## Requirements

- Node.js 20 or newer
- Stripe account and API keys for real payments

No npm dependencies are required right now; the backend uses Node.js built-in modules.

## Quick Start
 
```bash
cp .env.example .env
npm start
```

Open `http://localhost:3000`.

Run tests:

```bash
npm test
```

## Environment

Create `.env` from `.env.example` and set at least:

```bash
NODE_ENV=development
PORT=3000
APP_PUBLIC_URL=http://localhost:3000
SESSION_SECRET=replace-with-a-long-random-secret
```

For production payments, also set:

```bash
STRIPE_PUBLISHABLE_KEY=pk_live_or_test_key
STRIPE_SECRET_KEY=sk_live_or_test_key
STRIPE_WEBHOOK_SECRET=whsec_from_stripe
ALLOW_DEMO_CHECKOUT=false
```

## Payment Security

The store uses Stripe PaymentIntents. Card numbers are entered through Stripe Elements in the browser, so raw card data is never sent to or stored by this backend.

The backend:

- creates PaymentIntents using the Stripe secret key
- uses trusted server-side cart totals
- verifies payment status with Stripe before finalizing an order
- verifies Stripe webhook signatures
- makes payment finalization idempotent so stock is not decremented twice

For a real launch, run behind HTTPS, use live Stripe keys, configure the webhook endpoint at `/api/payments/webhook`, and keep `.env` out of git.

## Data Storage

Local data is stored in `backend/data/store.json`, created automatically from `backend/data/store.seed.json`. It is ignored by git because it contains runtime users, carts, sessions, and orders.

For production, replace the JSON store with a real database such as PostgreSQL, add managed backups, and use a production secret manager.

## Useful Scripts

```bash
npm start   # run the backend and storefront
npm test    # run backend API tests
npm run check
```

## Deploying To Vercel

The repository includes `vercel.json`, which publishes `frontend/` at the site root and routes `/api/*` requests to the Node backend function in `api/server.js`.

1. Import `RafaelBlackwood/SportsStore` in Vercel.
2. Keep the project Root Directory set to the repository root (`./`).
3. Leave Framework Preset as `Other`; `vercel.json` sets the output directory.
4. Add these Production, Preview, and Development environment variables:

```bash
NODE_ENV=production
APP_PUBLIC_URL=https://sports-store-kappa.vercel.app
SESSION_SECRET=replace-with-at-least-32-random-characters
ALLOW_DEMO_CHECKOUT=true
```

Use `ALLOW_DEMO_CHECKOUT=false` and add the Stripe variables from the Payment Security section before accepting real payments. After saving the variables, redeploy the latest `main` commit without using the previous build cache.

Vercel Functions only provide temporary writable storage in `/tmp`. The included adapter uses it so the deployed demo can run, but carts, accounts, and orders may reset between function instances or deployments. Connect a durable database such as PostgreSQL before treating the deployment as a production store.

## License

This project is licensed under the Apache License 2.0. See `LICENSE`.
