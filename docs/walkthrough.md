# Shivam Sports — Complete Project Walkthrough

> A step-by-step guide through the entire Shivam Sports e-commerce platform, covering architecture, user flows, admin operations, and the underlying technology.

---

## Table of Contents

1. [Project Introduction](#1-project-introduction)
2. [Technology Stack](#2-technology-stack)
3. [Project Structure](#3-project-structure)
4. [Setup & Installation](#4-setup--installation)
5. [Backend Walkthrough](#5-backend-walkthrough)
6. [Frontend Walkthrough](#6-frontend-walkthrough)
7. [Page-by-Page Walkthrough (All 22 Pages)](#7-page-by-page-walkthrough-all-22-pages)
8. [Authentication & Authorization Flow](#8-authentication--authorization-flow)
9. [Shopping & Order Flow](#9-shopping--order-flow)
10. [Admin Panel Walkthrough](#10-admin-panel-walkthrough)
11. [Data Pipeline & Seeding](#11-data-pipeline--seeding)
12. [Motion & Animation System](#12-motion--animation-system)
13. [API Reference](#13-api-reference)
14. [Environment Configuration](#14-environment-configuration)

---

## 1. Project Introduction

**Shivam Sports** is a premium full-stack sports e-commerce and careers platform. It was built for Shivam Enterprises Pvt. Ltd., a sports manufacturing company with 66+ years of legacy. The platform supports:

- Online product catalog with categories, brands, and offers
- User registration, login, and profile management
- Shopping cart, wishlist, and checkout with Razorpay payments
- Order tracking and management
- Careers portal with job listings and applications
- CMS-driven content (banners, FAQs, testimonials, legal pages)
- Full admin dashboard for CRUD operations on all entities

---

## 2. Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Frontend Markup** | HTML5 | — |
| **Frontend Styling** | CSS3 + Bootstrap | 5.3.3 |
| **Frontend Logic** | JavaScript ES6+ + jQuery | 3.7.1 |
| **Frontend Typography** | Google Fonts (Bebas Neue, Manrope, Noto Sans Devanagari) | — |
| **Backend Runtime** | Node.js | v20+ (LTS) |
| **Backend Framework** | Express.js | 4.21 |
| **Database** | MongoDB (via Mongoose ODM) | 6.0+ / Mongoose 8.10 |
| **Authentication** | jsonwebtoken + bcryptjs | JWT-based |
| **Payments** | Razorpay | SDK v2.9 |
| **Dev Server** | nodemon | 3.1 |
| **Logging** | morgan | — |
| **Extras** | pdfkit (invoices), xlsx (data export), ajv (JSON schema validation) | — |

---

## 3. Project Structure

```
adu/
├── assets/                           # Static images
│   └── images/
│       ├── custom/                   # User-replaceable: logo.png, home-hero.jpg
│       ├── hero-sports.jpg           # Default fallback image
│       ├── pdf-pages/               # Stock catalog page images
│       └── pdf-extracted/           # Stock extracted product images
│
├── backend/
│   ├── .env                         # Local environment variables
│   ├── .env.example                 # Template for .env
│   ├── package.json                 # Dependencies + scripts (dev, start, seed, sync:data)
│   └── src/
│       ├── server.js                # ★ Process entry point
│       ├── app.js                   # ★ Express app configuration
│       ├── config/
│       │   └── db.js                # MongoDB connection manager
│       ├── middleware/
│       │   ├── auth.js              # JWT auth + role guard
│       │   ├── errorHandler.js      # 404 + global error handler
│       │   └── requireDatabase.js   # 503 guard for DB-dependent routes
│       ├── models/                  # 16 Mongoose schemas
│       │   ├── User.js
│       │   ├── Product.js
│       │   ├── Category.js
│       │   ├── Order.js
│       │   ├── Cart.js
│       │   ├── Brand.js
│       │   ├── Service.js
│       │   ├── Offer.js
│       │   ├── Banner.js
│       │   ├── Faq.js
│       │   ├── Testimonial.js
│       │   ├── PageContent.js
│       │   ├── SiteSetting.js
│       │   ├── PaymentCode.js
│       │   ├── JobPost.js
│       │   └── JobApplication.js
│       ├── routes/                  # 11 route modules
│       │   ├── index.js             # Route registry
│       │   ├── auth.js
│       │   ├── catalog.js
│       │   ├── content.js
│       │   ├── cart.js
│       │   ├── wishlist.js
│       │   ├── orders.js
│       │   ├── payments.js
│       │   ├── profile.js
│       │   ├── careers.js
│       │   └── admin.js
│       ├── utils/
│       │   ├── asyncHandler.js      # Async route error wrapper
│       │   ├── slugify.js           # URL-safe slug generator
│       │   └── localData.js         # JSON fallback data engine (438 lines)
│       ├── seeds/
│       │   ├── seed.js              # Initial database seed script
│       │   └── syncFromJson.js      # JSON → MongoDB sync script
│       └── data/                    # 11 JSON data files
│           ├── categories.json
│           ├── products.json
│           ├── services.json
│           ├── brands.json
│           ├── offers.json
│           ├── jobs.json
│           ├── faqs.json
│           ├── banners.json
│           ├── testimonials.json
│           ├── pages.json
│           └── site-settings.json
│
├── frontend/
│   ├── index.html                   # Home page
│   ├── products.html                # Product listing
│   ├── product-detail.html          # Single product view
│   ├── offers.html                  # Offers listing
│   ├── services.html                # Services page
│   ├── careers.html                 # Job listings + apply
│   ├── contact.html                 # Contact info + form
│   ├── about.html                   # About the company
│   ├── login.html                   # Login form
│   ├── register.html                # Registration form
│   ├── cart.html                    # Shopping cart
│   ├── checkout.html                # Checkout + payment
│   ├── wishlist.html                # Saved products
│   ├── profile.html                 # User profile editor
│   ├── orders.html                  # Order history
│   ├── order-track.html             # Public order tracking
│   ├── faq.html                     # FAQ accordion
│   ├── shipping-policy.html         # Legal page
│   ├── returns-policy.html          # Legal page
│   ├── privacy-policy.html          # Legal page
│   ├── terms.html                   # Legal page
│   ├── admin.html                   # Admin dashboard
│   ├── css/
│   │   └── styles.css               # Master stylesheet (~37 KB)
│   ├── js/
│   │   ├── api.js                   # ★ ShivamApi – API client singleton
│   │   ├── common.js                # ★ ShivamUI – shared layout + motion engine
│   │   ├── home.js                  # Home page controller
│   │   ├── products.js              # Product listing logic
│   │   ├── product-detail.js        # Product detail logic
│   │   ├── offers.js                # Offers page logic
│   │   ├── services.js              # Services page logic
│   │   ├── careers.js               # Careers + application logic
│   │   ├── contact.js               # Contact form logic
│   │   ├── about.js                 # About page logic
│   │   ├── auth.js                  # Login + Register logic
│   │   ├── cart.js                  # Cart operations
│   │   ├── checkout.js              # Checkout + payment logic
│   │   ├── wishlist.js              # Wishlist operations
│   │   ├── profile.js               # Profile editor logic
│   │   ├── orders.js                # Order history logic
│   │   ├── order-track.js           # Order tracking logic
│   │   ├── faq.js                   # FAQ page logic
│   │   ├── legal.js                 # Shared legal page renderer
│   │   └── admin.js                 # Admin dashboard logic (44 KB)
│   └── partials/
│       ├── header.html              # Shared navigation header
│       └── footer.html              # Shared footer
│
├── logo/                            # Brand logo assets
├── img/                             # Additional images
└── docs/                            # Documentation
```

---

## 4. Setup & Installation

### Prerequisites
- **Node.js** v20+ (LTS recommended)
- **MongoDB** Community Server 6.0+ (running locally or Atlas)

### Step-by-Step

```bash
# 1. Navigate to the backend
cd backend

# 2. Install dependencies
npm install

# 3. Create environment file
cp .env.example .env
# Edit .env → set MONGO_URI and JWT_SECRET

# 4. Seed initial data (creates admin + customer users, categories, products, jobs)
npm run seed

# 5. Import full JSON content data
npm run sync:data

# 6. Start development server
npm run dev
# → Server running at http://localhost:4000
```

### Verify

- Open **http://localhost:4000/index.html** → Homepage loads
- Open **http://localhost:4000/api/health** → Returns `{ ok: true, mode: "mongo" }`

### Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@shivam.com | Admin@123 |
| Customer | customer@shivam.com | Customer@123 |

---

## 5. Backend Walkthrough

### 5.1 How the Server Starts

1. **`server.js`** loads environment variables from `.env` via `dotenv`
2. Calls `connectDb({ allowFailure: true })` — connects to MongoDB; if it fails, the server still starts in degraded mode
3. Starts Express HTTP listener on `PORT` (default 4000)
4. Registers `SIGINT`/`SIGTERM` handlers for graceful shutdown

### 5.2 Express App Pipeline (`app.js`)

```
Request → JSON body parser (2MB limit)
        → URL-encoded parser
        → CORS (allow all origins)
        → Morgan logger (dev format)
        → /api/health endpoint
        → /api/* routes (all 11 modules)
        → Static file serving (frontend/ + assets/)
        → Root redirect (/ → index.html)
        → 404 handler
        → Global error handler
```

### 5.3 Database Resilience (`config/db.js`)

The database module implements a **graceful degradation** pattern:

- **Normal mode (`mongo`)**: Full features — accounts, orders, admin, payments
- **Fallback mode (`json-fallback`)**: Happens when MongoDB is unavailable or `MONGO_DISABLED=true`. Public catalog and content routes serve data from bundled JSON files via `localData.js`. Account, order, and admin routes return `503 Service Unavailable`.
- **Retry cooldown**: Prevents connection flood with configurable `MONGO_RETRY_COOLDOWN_MS`
- **Event-driven logging**: Only logs unique errors to avoid console spam

### 5.4 Middleware Chain

| Middleware | Applied To | What It Does |
|-----------|-----------|--------------|
| `requireAuth` | Protected routes (cart, wishlist, orders, profile, admin) | Extracts Bearer token from `Authorization` header, verifies JWT, loads user from DB, attaches `req.user` |
| `requireRole('admin')` | Admin routes | Checks `req.user.role === 'admin'`, returns 403 if not |
| `requireDatabase` | DB-dependent routes | Returns 503 if MongoDB is disconnected or disabled |
| `notFound` | Catch-all | Returns `{ message: "Route not found" }` with 404 |
| `errorHandler` | Global | Serializes errors to JSON; includes stack trace in dev mode |

### 5.5 Data Models — Entity Relationship Overview

```
┌────────────┐       ┌──────────────┐       ┌────────────┐
│   User     │──────→│    Cart      │       │  Category  │
│            │   1:1 │  items[]     │       │            │
│ wishlist[] │       └──────────────┘       └──────┬─────┘
│            │                                      │
│            │──────→┌──────────────┐       ┌──────┴─────┐
│            │  1:N  │   Order      │       │  Product   │
│            │       │  items[]     │←──────│            │
│            │       │  payment     │       │  specs[]   │
│            │       │  shipping    │       │  gallery[] │
│            │       └──────┬───────┘       └────────────┘
│            │              │
│            │       ┌──────┴───────┐
│            │       │ PaymentCode  │
│            │       │ redemptions[]│
│            │       └──────────────┘
└────────────┘
                    ┌──────────────┐    ┌──────────────┐
                    │   JobPost    │    │    Banner     │
                    │              │    │  placement   │
                    └──────┬───────┘    └──────────────┘
                           │
                    ┌──────┴───────┐    ┌──────────────┐
                    │JobApplication│    │ Testimonial  │
                    │  status      │    │  rating      │
                    └──────────────┘    └──────────────┘

┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  PageContent │    │   SiteSetting│    │     Faq      │
│  richText    │    │   key-value  │    │  category    │
│  faqRefs[]   │    │   group      │    │  accordion   │
└──────────────┘    └──────────────┘    └──────────────┘

            ┌──────────────┐    ┌──────────────┐
            │    Brand     │    │    Offer     │
            │   logoUrl    │    │ discountPct  │
            └──────────────┘    │  promoCode   │
                                └──────────────┘
            ┌──────────────┐
            │   Service    │
            │ description  │
            └──────────────┘
```

### 5.6 JSON Fallback Engine (`utils/localData.js`)

When MongoDB is unavailable, a 438-line pure JavaScript module reads from `data/*.json` files and provides:

- In-memory category, product, brand, service, offer, job, FAQ, banner, testimonial, page, and settings collections
- Filtering (by category, brand, price range, search text, featured flag)
- Sorting (price asc/desc, name asc/desc, newest)
- Pagination (page + limit with totalItems/totalPages)
- Slug-based lookups and related product matching

This ensures public-facing pages always work regardless of database status.

---

## 6. Frontend Walkthrough

### 6.1 Page Loading Lifecycle

Every page follows this sequence:

```
1. Browser loads HTML page
2. External scripts load: jQuery → Bootstrap → api.js → common.js → page-specific.js
3. Page-specific JS calls ShivamUI.initLayout()
4. initLayout() does:
   a. jQuery.load() header.html + footer.html into #site-header / #site-footer
   b. Set active nav link based on current page
   c. Sync role-based nav (show/hide Admin link)
   d. Hydrate auth area (Login/Register or Hi Name + Logout)
   e. Update cart badge count
   f. Attach global card actions (Add to Cart, Add to Wishlist)
   g. Initialize motion system (scroll reveal, parallax, tilt, ticker, transitions)
5. Page-specific JS loads its data via ShivamApi.* calls
6. DOM is rendered with fetched data
```

### 6.2 API Client (`js/api.js` → `window.ShivamApi`)

A self-executing IIFE that exposes a global `ShivamApi` object. It wraps `fetch()` with:

- **Auto base URL**: Detects `window.location.origin` for API path
- **Token management**: Stores JWT in `localStorage` as `shivam_token`
- **Session management**: `setSession()`, `clearSession()`, `getUser()`
- **Error normalization**: Catches network errors and non-2xx responses
- **Organized API methods**:
  - `ShivamApi.auth.*` — register, login, me, logout
  - `ShivamApi.profile.*` — get, update, updatePassword
  - `ShivamApi.catalog.*` — categories, products, featuredProducts, productBySlug, relatedProducts, services, brands, offers, jobs
  - `ShivamApi.content.*` — banners, faqs, testimonials, pageBySlug, settings
  - `ShivamApi.cart.*` — get, addItem, updateItem, deleteItem
  - `ShivamApi.wishlist.*` — list, add, remove
  - `ShivamApi.orders.*` — create, mine, getById, track
  - `ShivamApi.payments.*` — createRazorpayOrder, verifyRazorpay, previewGiftCode
  - `ShivamApi.careers.*` — apply
  - `ShivamApi.admin.*` — list, get, create, update, remove, orders, createOfflineOrder, updateOrderStatus

### 6.3 Common UI Runtime (`js/common.js` → `window.ShivamUI`)

The shared UI engine provides:

| Function | Purpose |
|----------|---------|
| `initLayout()` | Master initializer (loads partials, sets nav, auth area, motion) |
| `showToast(message, type)` | Bootstrap-based toast notifications (success/error/info) |
| `renderProductCard(product)` | Reusable product card HTML generator |
| `updateCartBadge()` | Refreshes cart item count in navbar |
| `mountSkeleton(selector, count)` | Shows pulse-animated loading placeholders |
| `formatPrice(value)` | Formats numbers as ₹ with Indian locale |
| `observeRevealAnimations()` | Scroll-reveal via IntersectionObserver |
| `animateCounters()` | Counting animation on scroll |
| `initSupportAccordion()` | FAQ toggle behavior |

### 6.4 Shared Partials

**`header.html`** — Full responsive navbar with:
- Top stripe (brand tagline + support email)
- Logo + brand text linking to about page
- Mobile hamburger toggle
- Dropdown submenus for: Products (by sport), Shopping (cart/checkout/wishlist), Offers (by discount %), Services, About (about/careers/contact), Support (FAQ/legal pages), My Account (profile/orders/wishlist/track)
- Admin link (hidden unless user role is admin)
- Auth area (Login/Register buttons, or greeting + Logout)

**`footer.html`** — Five-column layout with:
- Brand description column
- Shop links (Products, Offers, Wishlist, Cart)
- Company links (About, Services, Careers, Contact)
- Support links (FAQ, Shipping, Returns, Track Order)
- Legal links (Privacy, Terms, Profile, Orders)
- Copyright bar with tech stack attribution

---

## 7. Page-by-Page Walkthrough (All 22 Pages)

### Page 1: Home (`index.html` + `home.js`)

The landing page is the most content-rich page, loading **8 sections** via parallel API calls:

1. **Promo Ticker** — Scrolling marquee with configurable text from SiteSettings
2. **Hero Banner** — Full-width image with overlay text, CTA buttons ("Shop Products" + "Join Our Team"). Supports image slider with configurable interval
3. **Stats Counters** — Animated counters for Customers (12,000+), Products (1,800+), Years (66+)
4. **About Section** — Company description with expandable "Read More" toggle
5. **Categories Grid** — Up to 6 sport category cards linking to filtered products
6. **Featured Products** — 8 product cards with skeleton loaders during fetch
7. **Services** — 3 service cards (Custom Manufacturing, Printing, Bulk Supply)
8. **Brands** — Logo grid of partner brands (NIVIA, VECTOR X, CEAT, SHIVAM SPORTS)
9. **Offers** — 4 promotional cards with discount badges and promo code copy
10. **Testimonials** — 3 customer quotes in glassmorphism panels
11. **Sale Banners** — 2-column image banners linking to offers

### Page 2: Products (`products.html` + `products.js`)

A full product catalog page with:

- **Search bar** — Real-time text search across product names and brands
- **Category filter** — Dropdown populated from API
- **Brand filter** — Dropdown populated from API
- **Price range** — Min/Max price inputs
- **Sort selector** — Newest / Price Low-High / Price High-Low / Name A-Z / Name Z-A
- **Product grid** — Responsive card layout (4 cols desktop, 3 tablet, 2 mobile)
- **Pagination** — Page navigation with total count
- **Skeleton loaders** — Animated placeholders during data fetch
- Each card shows: image, name, category, price, MRP, discount %, Add to Cart, Wishlist, View buttons

### Page 3: Product Detail (`product-detail.html` + `product-detail.js`)

Single product page with:

- **Image gallery** — Primary image with thumbnails
- **Product info** — Name, brand, category, price, MRP, discount percentage, stock status
- **Highlights** — Bullet-point feature list
- **Specifications** — Key-value table (specs sub-document)
- **Actions** — Quantity selector, Add to Cart, Add to Wishlist
- **Related Products** — Up to 4 products from same category or brand

### Page 4: Offers (`offers.html` + `offers.js`)

- Lists all active promotional offers
- Each offer card shows: banner image, title, subtitle, discount percentage chip, promo code
- Copy-to-clipboard button for promo codes
- Supports URL filter `?discount=80` to highlight specific discount tiers

### Page 5: Services (`services.html` + `services.js`)

- Displays service cards from the Services API
- Each card: image, title, description, CTA button

### Page 6: Careers (`careers.html` + `careers.js`)

- **Job listing** — Fetches active jobs from API, displays title, department, experience, skills
- **Application form** — Inline form with: full name, email, phone, address, resume link, cover letter
- Form submits to `POST /api/jobs/:jobId/applications` (no auth required)
- Confirmation toast on success

### Page 7: Contact (`contact.html` + `contact.js`)

- Company contact details
- Contact message form

### Page 8: About (`about.html` + `about.js`)

- Company story and mission loaded from the PageContent CMS (slug: `about`)
- Rich text body with hero section

### Page 9: Login (`login.html` + `auth.js`)

- Email + password form
- Calls `POST /api/auth/login`
- On success: stores JWT + user in localStorage, redirects to home
- Shows error toast on failure
- Link to register page

### Page 10: Register (`register.html` + `auth.js`)

- Name, email, password, phone form
- Calls `POST /api/auth/register`
- Auto-login on success (stores token, redirects to home)
- Link to login page

### Page 11: Cart (`cart.html` + `cart.js`)

- Lists cart items with: product image, name, unit price, quantity controls (+/-), line total, remove button
- Auto-updates subtotal on quantity change
- Empty cart state with "Browse Products" link
- Checkout button linking to checkout page

### Page 12: Checkout (`checkout.html` + `checkout.js`)

Most complex frontend page (~15 KB JS):

- **Shipping address form** — Full name, email, phone, address lines, city, state, pincode, country
- **Pre-fill** — Loads default address from user profile
- **Order summary** — Cart items, subtotal, discount, total
- **Payment methods** — Radio selection:
  - **Razorpay** — Integrates Razorpay SDK (when `ENABLE_RAZORPAY=true`)
  - **Gift Code** — Enter code → preview balance → apply discount
  - **Cash on Delivery** — Simple order placement
- **Place Order** → Creates order via API, handles payment flow, redirects to order confirmation

### Page 13: Wishlist (`wishlist.html` + `wishlist.js`)

- Displays saved products with: image, name, price, Move to Cart, Remove buttons
- Empty state with "Browse Products" link

### Page 14: Profile (`profile.html` + `profile.js`)

- **View/Edit mode** for: name, email, phone, date of birth, bio
- **Default address** section (full Indian address form)
- **Password change** section (current password, new password, confirm)
- Calls `PATCH /api/profile` and `PATCH /api/profile/password`

### Page 15: Orders (`orders.html` + `orders.js`)

- Lists past orders with: order ID, date, item count, total, status badge (color-coded)
- Empty state for no orders

### Page 16: Order Track (`order-track.html` + `order-track.js`)

- Public order tracking (no login required)
- Input: Order ID + registered email
- Calls `POST /api/orders/track`
- Displays order status timeline

### Pages 17-21: Legal Pages (`faq.html`, `shipping-policy.html`, `returns-policy.html`, `privacy-policy.html`, `terms.html` + `faq.js`, `legal.js`)

- **FAQ** page loads questions from Content API, renders in accordion format
- **Legal pages** (Shipping, Returns, Privacy, Terms) share `legal.js` which fetches PageContent by slug and renders rich text HTML

### Page 22: Admin Dashboard (`admin.html` + `admin.js`)

The most complex page (37 KB HTML + 44 KB JS). Tabbed interface with full CRUD:

| Tab | Operations |
|-----|-----------|
| Products | List, Create, Edit, Delete products with all fields |
| Categories | Manage product categories |
| Orders | View all orders, update status (pending→paid→processing→shipped→delivered→cancelled) |
| Users | View registered users and roles |
| Jobs | Manage career postings |
| Applications | View/review candidate applications, update status |
| Banners | Manage hero/promo banners with placement targeting |
| FAQs | Manage FAQ entries with categories |
| Testimonials | Manage customer testimonials |
| Pages | CMS page editor (rich text + hero + CTA) |
| Site Settings | Key-value configuration editor |
| Offers | Manage promotional offers with date ranges |
| Payment Codes | Create/manage gift codes with balance tracking |

Additional admin features:
- **Offline order creation** — Create orders manually for in-store sales
- **Order status management** — Update order status with tracking
- **Data export** — Export data to Excel/XLSX format

---

## 8. Authentication & Authorization Flow

### Registration Flow

```
User fills register form
  → POST /api/auth/register { name, email, password, phone }
    → Backend hashes password with bcrypt (salt rounds: 12)
    → Creates User document in MongoDB
    → Generates JWT with payload { sub: userId, role: "customer" }
    → Returns { token, user }
  → Frontend stores token + user in localStorage
  → Redirects to home page
```

### Login Flow

```
User fills login form
  → POST /api/auth/login { email, password }
    → Backend finds user by email
    → bcrypt.compare(password, user.passwordHash)
    → Generates JWT { sub: userId, role }
    → Returns { token, user }
  → Frontend stores token + user in localStorage
  → Navbar updates to show "Hi, [Name]" + Logout button
  → Cart badge updates
```

### Token Usage

- Frontend attaches `Authorization: Bearer <token>` header on authenticated requests
- Backend validates via `requireAuth` middleware
- Token expiry configurable via `JWT_EXPIRES_IN` (default: 7 days)

### Role-Based Access

| Role | Access |
|------|--------|
| **Guest** (no token) | Public catalog, content, FAQ, legal pages, careers apply, order track |
| **Customer** | + Cart, Wishlist, Checkout, Orders, Profile |
| **Admin** | + Full admin dashboard, all CRUD operations |

---

## 9. Shopping & Order Flow

### Complete Purchase Journey

```
1. Browse Products      → products.html (filter, search, sort)
2. View Product         → product-detail.html (images, specs, related)
3. Add to Cart          → POST /api/cart/items { productId, qty }
4. Review Cart          → cart.html (adjust qty, remove items)
5. Checkout             → checkout.html
   a. Enter/confirm shipping address
   b. Choose payment method
      - Razorpay: Creates Razorpay order → opens payment modal → verifies payment
      - Gift Code: Preview → apply → reduces balance
      - COD: Direct placement
   c. Place Order       → POST /api/orders { items, shipping, payment }
6. Order Confirmation   → Redirects to orders.html
7. Track Order          → order-track.html (by ID + email)
```

### Order Status Lifecycle

```
pending → paid → processing → shipped → delivered
                                     ↘ cancelled
```

---

## 10. Admin Panel Walkthrough

### Accessing Admin

1. Login as `admin@shivam.com` / `Admin@123`
2. "Admin" nav link becomes visible
3. Navigate to `admin.html`

### Admin Operations

**Product Management:**
- Create products with: name, slug (auto-generated), description, category, brand, price, MRP, stock, image URLs, gallery, highlights, specs, tags, featured flag
- Edit any field, toggle active/inactive, delete

**Order Management:**
- View all orders across all customers
- Update order status with dropdown
- Create offline orders for walk-in customers

**Content Management:**
- Edit banners by placement (home_hero, offers_top, etc.)
- Manage FAQ entries with categories (general, shipping, returns, etc.)
- Edit testimonials (name, role, quote, rating, avatar)
- CMS page editor for legal/about pages (rich text + hero section + CTA)
- Site settings (key-value pairs grouped by section)

**Careers Management:**
- Create/edit job postings with department, experience, skills
- Review applications, update status (received → in_review → shortlisted → rejected)

---

## 11. Data Pipeline & Seeding

### Initial Seed (`npm run seed`)

Creates foundational data:
- **Users**: Admin (admin@shivam.com) + Customer (customer@shivam.com) with bcrypt-hashed passwords
- **Categories**: Cricket, Football, Basketball, Tennis, Badminton
- **Products**: Sample products with images, pricing, specs
- **Jobs**: 9 career positions across departments
- **Content**: Initial banners, FAQs, testimonials, pages, and site settings

### JSON Data Sync (`npm run sync:data`)

Reads 11 JSON files from `backend/src/data/` and performs **upsert operations**:
- New records → inserted
- Existing records (matched by slug/key) → updated
- Reports a table with insert/update/skip counts:

```
┌──────────────┬──────────┬─────────┬─────────┐
│ (index)      │ inserted │ updated │ skipped │
├──────────────┼──────────┼─────────┼─────────┤
│ categories   │ 0        │ 5       │ 0       │
│ products     │ 3        │ 0       │ 0       │
│ services     │ 3        │ 0       │ 0       │
│ brands       │ 4        │ 0       │ 0       │
│ offers       │ 3        │ 0       │ 0       │
│ ...          │ ...      │ ...     │ ...     │
└──────────────┴──────────┴─────────┴─────────┘
```

### Updating Real Data

To replace sample data with real content:
1. Edit JSON files in `backend/src/data/`
2. Run `npm run sync:data`
3. Changes are upserted into MongoDB

---

## 12. Motion & Animation System

All animations are implemented in `common.js` using **zero external animation libraries**:

| Animation | Element | Trigger | Mechanism |
|-----------|---------|---------|-----------|
| **Scroll Reveal** | `.reveal` elements | Scroll into viewport | `IntersectionObserver` adds `.show` class with staggered CSS `transition-delay` |
| **Hero Parallax** | `.hero-banner` | Mouse move over hero | CSS custom properties `--hero-x`, `--hero-y` shift background |
| **Card Tilt** | `.tilt-card` | Mouse move over card | `perspective() rotateX() rotateY()` CSS transform |
| **Promo Ticker** | `.promo-ticker` | Continuous | CSS `@keyframes` marquee; `mouseenter` adds `.paused` |
| **Page Transition** | Internal links | Click on `.html` links | Overlay fade layer, 180ms delay before navigation |
| **Skeleton Loader** | Loading states | API fetch in progress | Pulse-animated CSS gradient cards |
| **Counter Animation** | `[data-counter-target]` | Scroll into viewport | `requestAnimationFrame` counting loop |

### Accessibility: Reduced Motion

All animations check `window.matchMedia("(prefers-reduced-motion: reduce)")`:
- If enabled: animations are skipped, elements show immediately, counters display final values without animation

---

## 13. API Reference

### Public Endpoints (No Authentication)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | System health + MongoDB status |
| GET | `/api/categories` | All active categories |
| GET | `/api/products?search=&category=&brand=&minPrice=&maxPrice=&sort=&page=&limit=` | Filtered product list |
| GET | `/api/products/featured?limit=8` | Featured products |
| GET | `/api/products/:slug` | Single product by slug |
| GET | `/api/products/:slug/related?limit=4` | Related products |
| GET | `/api/services` | Active services |
| GET | `/api/brands` | Active brands |
| GET | `/api/offers` | Active offers |
| GET | `/api/jobs` | Active job postings |
| GET | `/api/content/banners?placement=` | Banners by placement |
| GET | `/api/content/faqs?category=` | FAQs by category |
| GET | `/api/content/testimonials` | Active testimonials |
| GET | `/api/content/page/:slug` | CMS page by slug |
| GET | `/api/content/settings?group=` | Public site settings |
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Authenticate |
| POST | `/api/jobs/:jobId/applications` | Submit job application |
| POST | `/api/orders/track` | Track order by ID + email |

### Authenticated Endpoints (Requires Bearer Token)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/auth/me` | Current user info |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/profile` | Get profile |
| PATCH | `/api/profile` | Update profile |
| PATCH | `/api/profile/password` | Change password |
| GET | `/api/cart` | Get cart |
| POST | `/api/cart/items` | Add item to cart |
| PATCH | `/api/cart/items/:id` | Update cart item qty |
| DELETE | `/api/cart/items/:id` | Remove cart item |
| GET | `/api/wishlist` | Get wishlist |
| POST | `/api/wishlist/:productId` | Add to wishlist |
| DELETE | `/api/wishlist/:productId` | Remove from wishlist |
| POST | `/api/orders` | Create order |
| GET | `/api/orders/my` | My orders |
| GET | `/api/orders/:id` | Order detail |
| POST | `/api/payments/razorpay/order` | Create Razorpay order |
| POST | `/api/payments/razorpay/verify` | Verify Razorpay payment |
| POST | `/api/payments/gift-code/preview` | Preview gift code balance |

### Admin Endpoints (Requires Admin Role)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/:resource` | List resource |
| GET | `/api/admin/:resource/:id` | Get single resource |
| POST | `/api/admin/:resource` | Create resource |
| PATCH | `/api/admin/:resource/:id` | Update resource |
| DELETE | `/api/admin/:resource/:id` | Delete resource |
| GET | `/api/admin/orders` | All orders |
| PATCH | `/api/admin/orders/:id/status` | Update order status |
| POST | `/api/admin/offline-orders` | Create offline order |

Resources: `products`, `categories`, `users`, `jobs`, `applications`, `banners`, `faqs`, `testimonials`, `pages`, `site-settings`, `offers`, `payment-codes`

---

## 14. Environment Configuration

| Variable | Default | Required | Description |
|----------|---------|----------|-------------|
| `PORT` | `4000` | No | HTTP server port |
| `MONGO_URI` | `mongodb://127.0.0.1:27017/shivam_sports` | No | MongoDB connection string |
| `MONGO_DISABLED` | `false` | No | Set `true` for JSON-only mode |
| `MONGO_SERVER_SELECTION_TIMEOUT_MS` | `5000` | No | Connection timeout (ms) |
| `MONGO_RETRY_COOLDOWN_MS` | `15000` | No | Min time between reconnection attempts |
| `JWT_SECRET` | — | **Yes** | Signing key for JWT tokens |
| `JWT_EXPIRES_IN` | `7d` | No | Token expiry duration |
| `CLIENT_BASE_URL` | — | No | Frontend URL for external links |
| `ENABLE_RAZORPAY` | `false` | No | Toggle Razorpay payment gateway |
| `RAZORPAY_KEY_ID` | — | If Razorpay enabled | Razorpay API key |
| `RAZORPAY_KEY_SECRET` | — | If Razorpay enabled | Razorpay API secret |
| `RAZORPAY_WEBHOOK_SECRET` | — | If Razorpay enabled | Webhook signature verification |

---

*Document generated on 2026-03-23. For the latest information, refer to the source code and README.md.*
