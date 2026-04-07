# Deployment Notes

## Runtime Shape

- Deploy the backend app as the single service.
- Express serves both the API and the frontend pages.
- MongoDB can be local for development or MongoDB Atlas in cloud deployment.

## Local Run

1. Start MongoDB.
2. Copy env file and update secrets:

```bash
cd backend
cp .env.example .env
```

3. Install and load data:

```bash
npm install
npm run seed
npm run sync:data
```

4. Start the app:

```bash
npm run start
```

5. Verify:

- App: `http://localhost:4000`
- Health: `http://localhost:4000/api/health`

The health endpoint returns MongoDB connection status and should report `ok: true` with `db.status: "connected"`.

## Cloud Deployment

Deploy `backend/` with:

```bash
npm install
npm run start
```

Recommended environment variables:

- `PORT`
- `MONGO_URI`
- `MONGO_DISABLED=false`
- `MONGO_SERVER_SELECTION_TIMEOUT_MS=5000`
- `MONGO_RETRY_COOLDOWN_MS=15000`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `CLIENT_BASE_URL`
- `ENABLE_RAZORPAY`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`

## MongoDB Checklist

- Local: use `mongodb://127.0.0.1:27017/shivam_sports`
- Atlas: use the full SRV connection string from the cluster dashboard
- Allow the deployment provider IP/network in Atlas
- Create a database user with read/write access to the app database
- Confirm `/api/health` reports connected after deployment
- For public-only mode, set `MONGO_DISABLED=true` (account/order/careers/admin APIs remain unavailable)

## If You See `connect ECONNREFUSED 127.0.0.1:27017`

- MongoDB service is not reachable at local port `27017`.
- Fix by either:
  - starting MongoDB service,
  - setting a valid Atlas URI in `MONGO_URI`,
  - or enabling fallback mode with `MONGO_DISABLED=true`.

## Static Assets

User-managed images must live in:

- `assets/images/custom/logo.png`
- `assets/images/custom/home-hero.jpg`

If custom files are missing, the UI falls back to the stock image assets so the app still renders cleanly.

## Production Notes

- Use a strong `JWT_SECRET`
- Enable HTTPS at the platform or proxy
- Restrict CORS before public launch
- Use Razorpay test keys first, then production keys after end-to-end verification
