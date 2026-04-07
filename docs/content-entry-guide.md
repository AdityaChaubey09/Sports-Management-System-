# Content Entry Guide (Admin + JSON)

You can manage content in two ways:

1. Admin dashboard (`admin.html`)
2. JSON file sync (`backend/src/data/*.json`)

## Recommended Workflow

1. Keep canonical source in JSON files.
2. Run `npm run sync:data` to import/update DB.
3. Use admin panel for urgent single edits.
4. If admin edits are final, mirror them back into JSON files.

## Content Types

### FAQs
- Use short, clear questions.
- Keep answers practical and easy to scan.
- Assign category tags (`shipping`, `returns`, etc.) for filtering.

### Banners
- Use `placement` to control page location:
- `home_hero`
- `offers_top`
- `about_top`
- Keep images optimized for web performance.
- For the local default home hero, use `assets/images/custom/home-hero.jpg` when no slider images are configured.

### Testimonials
- Keep quote under 180 characters for visual balance.
- Include role for trust context.

### Page Content
- Use `slug` values that match frontend pages:
- `about`
- `shipping-policy`
- `returns-policy`
- `privacy-policy`
- `terms`
- `richText` supports HTML markup.

### Site Settings
- Store reusable values with dot keys:
- `home.marquee_text`
- `home.hero_slider_images`
- `home.hero_slider_interval_ms`
- `site.contact_email`
- Use JSON value when structured data is needed.

## Custom Brand Assets

Use one drop-in folder for user-managed images:

- `assets/images/custom/logo.png`
- `assets/images/custom/home-hero.jpg`

## Safety Checklist
- Validate JSON format before sync.
- Avoid duplicate unique keys/slugs.
- Keep image paths reachable (`/assets/...` or valid external URLs).
- Review changes in UI after import.
