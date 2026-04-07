# Data Schema Guide (`backend/src/data/*.json`)

## Overview
Each file must contain a JSON array.  
Run validation + import using:

```bash
cd backend
npm run sync:data
```

## File Contracts

### `categories.json`
- required: `name`
- optional: `slug, imageUrl, sortOrder, isActive`

### `products.json`
- required: `name, categorySlug, price, mrp`
- optional:
- `slug, brand, description, stock`
- `imageUrls[]`
- `gallery[]`
- `highlights[]`
- `specs[]` where each item is `{ "label": "...", "value": "..." }`
- `tags[]`
- `isFeatured, isActive`

### `services.json`
- required: `title`
- optional: `description, imageUrl, ctaText, ctaUrl, isActive`

### `brands.json`
- required: `name`
- optional: `logoUrl, sortOrder, isActive`

### `offers.json`
- required: `title, discountPercent`
- optional: `subtitle, bannerImageUrl, promoCode, startAt, endAt, isActive`

### `jobs.json`
- required: `title, skillSummary`
- optional:
- `department, experienceText, details, contactEmail, sortOrder, isActive`

### `faqs.json`
- required: `question, answer`
- optional: `category, sortOrder, isActive`

### `banners.json`
- required: `title, imageUrl, placement`
- optional: `subtitle, ctaText, ctaUrl, sortOrder, isActive`

### `testimonials.json`
- required: `name, quote`
- optional: `role, rating, avatarUrl, sortOrder, isActive`

### `pages.json`
- required: `slug, title`
- optional:
- `hero` object (`eyebrow, heading, subheading, imageUrl`)
- `richText` (HTML string)
- `faqQuestions[]` (maps by faq question string)
- `cta` object (`text, url, style`)
- `seo` object (`title, description, keywords[]`)
- `isActive`

### `site-settings.json`
- required: `key`
- optional: `group, value, isPublic`

Useful home settings:

- `home.marquee_text`
- `home.hero_slider_images`
- `home.hero_slider_interval_ms`

## Validation Behavior
- Invalid rows are rejected and printed with row index and error path.
- Sync stops on validation errors to avoid partial inconsistent imports.

## Upsert Behavior
- Existing data is updated by stable key:
- categories by `slug`
- products by `slug`
- services by `title`
- brands by `name`
- offers by `title`
- jobs by `title`
- faqs by `question`
- banners by `title + placement`
- testimonials by `name + quote`
- pages by `slug`
- settings by `key`

## Custom Image Contract

User-managed image files are not stored in JSON. Use these fixed asset paths:

- `assets/images/custom/logo.png`
- `assets/images/custom/home-hero.jpg`
