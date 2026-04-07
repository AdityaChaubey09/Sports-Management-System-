🏏 Shivam Sports – Full Stack MERN E-Commerce Platform (v2)

A production-ready full-stack MERN application for a sports e-commerce and careers platform, built with scalable architecture, modern UI/UX practices, and modular backend APIs.

This project goes beyond a basic store — it includes authentication, admin CMS, order tracking, content management, and deployment-ready architecture.

- Frontend: HTML, CSS, JavaScript, jQuery, Bootstrap
- Backend: Node.js, Express, MongoDB, JWT auth
- Payments: Razorpay (scaffolded with env toggle)
- Data pipeline: JSON drop-in sync (`npm run sync:data`)

## 22-Page Sitemap

1. `index.html`  
2. `products.html`  
3. `product-detail.html`  
4. `offers.html`  
5. `services.html`  
6. `careers.html`  
7. `contact.html`  
8. `about.html`  
9. `wishlist.html`  
10. `cart.html`  
11. `checkout.html`  
12. `orders.html`  
13. `order-track.html`  
14. `profile.html`  
15. `login.html`  
16. `register.html`  
17. `faq.html`  
18. `shipping-policy.html`  
19. `returns-policy.html`  
20. `privacy-policy.html`  
21. `terms.html`  
22. `admin.html`

## Premium Additions in v2

- Advanced motion system (strict stack only, no external animation libs)
  - scroll reveal observer
  - hero parallax
  - card tilt-lite
  - promo ticker with pause
  - page transition layer
  - skeleton loaders
  - reduced-motion fallback
- New API modules
  - profile APIs
  - content APIs (banners/faqs/testimonials/pages/settings)
  - product featured + related endpoints
  - order tracking endpoint
- Admin CRUD extensions
  - faqs, testimonials, banners, pages, site-settings
- JSON data sync and validation
  - data files in `backend/src/data/*.json`
  - import command: `npm run sync:data`

## Setup

### Prerequisites

Install:

1. Node.js LTS (v20+ recommended)
2. MongoDB Community Server

### Backend

```bash
cd backend
npm install
cp .env.example .env
```

Edit `backend/.env`:

- set `MONGO_URI` to your local MongoDB or MongoDB Atlas connection string
- keep `MONGO_DISABLED=false` when database-backed features are required
- keep `MONGO_SERVER_SELECTION_TIMEOUT_MS=5000` unless you need a longer timeout
- set secure `JWT_SECRET`
- keep `ENABLE_RAZORPAY=false` initially unless keys are ready

If you only want public pages without running MongoDB, set:

```env
MONGO_DISABLED=true
```

This disables account, order, careers applications, payments, and admin APIs while keeping public catalog/content routes available from bundled JSON.

## Fix: `connect ECONNREFUSED 127.0.0.1:27017`

This means app tried to reach local MongoDB but service is not running or not reachable.

Choose one:

1. Start local MongoDB:
   - Linux (systemd): `sudo systemctl start mongod`
   - macOS (Homebrew): `brew services start mongodb-community`
   - Windows (Admin CMD): `net start MongoDB`
2. Use MongoDB Atlas and set full cluster URI in `MONGO_URI`.
3. Run public-only mode with `MONGO_DISABLED=true`.

Initialize sample base data:

```bash
npm run seed
```

Import JSON data (recommended for v2 content pages):

```bash
npm run sync:data
```

Run server:

```bash
npm run dev
```

Open:

- `http://localhost:4000/index.html`
- `http://localhost:4000/api/health`

Health response now reports live MongoDB connection status.

## Custom Images

User-managed images should be placed only in:

- `assets/images/custom/logo.png`
- `assets/images/custom/home-hero.jpg`

If either file is missing, the app falls back to its built-in stock image.

## Demo Credentials

After seed:

- Admin: `admin@shivam.com` / `Admin@123`
- Customer: `customer@shivam.com` / `Customer@123`

## Razorpay Activation

In `backend/.env`:

```env
ENABLE_RAZORPAY=true
RAZORPAY_KEY_ID=...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...
```

Restart backend.

## Data Files for Future Real Data

Update these files when your final data is ready:

- `backend/src/data/categories.json`
- `backend/src/data/products.json`
- `backend/src/data/services.json`
- `backend/src/data/brands.json`
- `backend/src/data/offers.json`
- `backend/src/data/jobs.json`
- `backend/src/data/faqs.json`
- `backend/src/data/banners.json`
- `backend/src/data/testimonials.json`
- `backend/src/data/pages.json`
- `backend/src/data/site-settings.json`

Then run `npm run sync:data`.

## Deployment

Use the backend app as the single deployable service:

```bash
cd backend
npm install
npm run start
```

Set these environment variables in deployment:

- `PORT`
- `MONGO_URI`
- `MONGO_DISABLED`
- `MONGO_SERVER_SELECTION_TIMEOUT_MS`
- `MONGO_RETRY_COOLDOWN_MS`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `CLIENT_BASE_URL`
- Razorpay keys only if payments are enabled

The frontend is already served by Express, so one backend deployment is enough.
