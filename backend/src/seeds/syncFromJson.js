/**
 * JSON Data Sync Script
 * ---------------------
 * Purpose:
 * - Import and upsert structured JSON files from `src/data/` into MongoDB.
 * - Allow future "real business data" replacement without touching application code.
 *
 * How to run:
 * - npm run sync:data
 *
 * Validation strategy:
 * - Ajv validates minimal required fields for each file.
 * - Detailed per-record error messages are printed for failed rows.
 *
 * Upsert strategy:
 * - Uses stable unique keys (slug, email, key, title, etc.) to avoid duplicates.
 */
require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });
const fs = require("fs");
const path = require("path");
const Ajv = require("ajv");
const { connectDb } = require("../config/db");
const { slugify } = require("../utils/slugify");

const Category = require("../models/Category");
const Product = require("../models/Product");
const Service = require("../models/Service");
const Brand = require("../models/Brand");
const Offer = require("../models/Offer");
const JobPost = require("../models/JobPost");
const Faq = require("../models/Faq");
const Banner = require("../models/Banner");
const Testimonial = require("../models/Testimonial");
const PageContent = require("../models/PageContent");
const SiteSetting = require("../models/SiteSetting");

const ajv = new Ajv({ allErrors: true, allowUnionTypes: true });
const dataDir = path.join(__dirname, "../data");

function readArrayFile(fileName) {
  const filePath = path.join(dataDir, fileName);
  if (!fs.existsSync(filePath)) {
    return [];
  }
  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error(`${fileName} must contain a JSON array`);
  }
  return parsed;
}

function validator(schema) {
  const validate = ajv.compile(schema);
  return (items, fileName) => {
    const errors = [];
    const validItems = [];
    items.forEach((item, index) => {
      const ok = validate(item);
      if (!ok) {
        errors.push({
          fileName,
          index,
          detail: validate.errors?.map((e) => `${e.instancePath} ${e.message}`).join("; "),
        });
      } else {
        validItems.push(item);
      }
    });
    return { validItems, errors };
  };
}

const validateCategories = validator({
  type: "object",
  required: ["name"],
  properties: {
    name: { type: "string", minLength: 1 },
    slug: { type: "string" },
    imageUrl: { type: "string" },
    sortOrder: { type: "number" },
    isActive: { type: "boolean" },
  },
});

const validateProducts = validator({
  type: "object",
  required: ["name", "categorySlug", "price", "mrp"],
  properties: {
    name: { type: "string", minLength: 1 },
    slug: { type: "string" },
    categorySlug: { type: "string", minLength: 1 },
    brand: { type: "string" },
    description: { type: "string" },
    price: { type: "number" },
    mrp: { type: "number" },
    stock: { type: "number" },
    imageUrls: { type: "array", items: { type: "string" } },
    gallery: { type: "array", items: { type: "string" } },
    highlights: { type: "array", items: { type: "string" } },
    specs: {
      type: "array",
      items: {
        type: "object",
        required: ["label", "value"],
        properties: { label: { type: "string" }, value: { type: "string" } },
      },
    },
    tags: { type: "array", items: { type: "string" } },
    isFeatured: { type: "boolean" },
    isActive: { type: "boolean" },
  },
});

const validateSimpleNameList = validator({
  type: "object",
  required: ["name"],
  properties: {
    name: { type: "string", minLength: 1 },
    sortOrder: { type: "number" },
    isActive: { type: "boolean" },
    logoUrl: { type: "string" },
  },
});

const validateServices = validator({
  type: "object",
  required: ["title"],
  properties: {
    title: { type: "string", minLength: 1 },
    description: { type: "string" },
    imageUrl: { type: "string" },
    ctaText: { type: "string" },
    ctaUrl: { type: "string" },
    isActive: { type: "boolean" },
  },
});

const validateOffers = validator({
  type: "object",
  required: ["title", "discountPercent"],
  properties: {
    title: { type: "string", minLength: 1 },
    subtitle: { type: "string" },
    bannerImageUrl: { type: "string" },
    discountPercent: { type: "number" },
    promoCode: { type: "string" },
    startAt: { type: ["string", "null"] },
    endAt: { type: ["string", "null"] },
    isActive: { type: "boolean" },
  },
});

const validateJobs = validator({
  type: "object",
  required: ["title", "skillSummary"],
  properties: {
    title: { type: "string", minLength: 1 },
    department: { type: "string" },
    experienceText: { type: "string" },
    skillSummary: { type: "string", minLength: 1 },
    details: { type: "string" },
    contactEmail: { type: "string" },
    isActive: { type: "boolean" },
    sortOrder: { type: "number" },
  },
});

const validateFaqs = validator({
  type: "object",
  required: ["question", "answer"],
  properties: {
    question: { type: "string", minLength: 1 },
    answer: { type: "string", minLength: 1 },
    category: { type: "string" },
    sortOrder: { type: "number" },
    isActive: { type: "boolean" },
  },
});

const validateBanners = validator({
  type: "object",
  required: ["title", "imageUrl", "placement"],
  properties: {
    title: { type: "string", minLength: 1 },
    subtitle: { type: "string" },
    imageUrl: { type: "string", minLength: 1 },
    ctaText: { type: "string" },
    ctaUrl: { type: "string" },
    placement: { type: "string", minLength: 1 },
    sortOrder: { type: "number" },
    isActive: { type: "boolean" },
  },
});

const validateTestimonials = validator({
  type: "object",
  required: ["name", "quote"],
  properties: {
    name: { type: "string", minLength: 1 },
    role: { type: "string" },
    quote: { type: "string", minLength: 1 },
    rating: { type: "number" },
    avatarUrl: { type: "string" },
    sortOrder: { type: "number" },
    isActive: { type: "boolean" },
  },
});

const validatePages = validator({
  type: "object",
  required: ["slug", "title"],
  properties: {
    slug: { type: "string", minLength: 1 },
    title: { type: "string", minLength: 1 },
    hero: { type: "object" },
    richText: { type: "string" },
    faqQuestions: { type: "array", items: { type: "string" } },
    cta: { type: "object" },
    seo: { type: "object" },
    isActive: { type: "boolean" },
  },
});

const validateSettings = validator({
  type: "object",
  required: ["key"],
  properties: {
    key: { type: "string", minLength: 1 },
    group: { type: "string" },
    value: {},
    isPublic: { type: "boolean" },
  },
});

async function upsertList(Model, items, getFilter, mapDoc) {
  const stats = { inserted: 0, updated: 0, skipped: 0 };
  for (const item of items) {
    const filter = getFilter(item);
    const doc = mapDoc(item);
    const existing = await Model.findOne(filter);
    if (!existing) {
      await Model.create(doc);
      stats.inserted += 1;
    } else {
      await Model.updateOne({ _id: existing._id }, { $set: doc });
      stats.updated += 1;
    }
  }
  return stats;
}

async function run() {
  await connectDb();
  const validationErrors = [];

  const categoryRows = readArrayFile("categories.json");
  const productRows = readArrayFile("products.json");
  const serviceRows = readArrayFile("services.json");
  const brandRows = readArrayFile("brands.json");
  const offerRows = readArrayFile("offers.json");
  const jobRows = readArrayFile("jobs.json");
  const faqRows = readArrayFile("faqs.json");
  const bannerRows = readArrayFile("banners.json");
  const testimonialRows = readArrayFile("testimonials.json");
  const pageRows = readArrayFile("pages.json");
  const settingRows = readArrayFile("site-settings.json");

  const validated = {
    categories: validateCategories(categoryRows, "categories.json"),
    products: validateProducts(productRows, "products.json"),
    services: validateServices(serviceRows, "services.json"),
    brands: validateSimpleNameList(brandRows, "brands.json"),
    offers: validateOffers(offerRows, "offers.json"),
    jobs: validateJobs(jobRows, "jobs.json"),
    faqs: validateFaqs(faqRows, "faqs.json"),
    banners: validateBanners(bannerRows, "banners.json"),
    testimonials: validateTestimonials(testimonialRows, "testimonials.json"),
    pages: validatePages(pageRows, "pages.json"),
    settings: validateSettings(settingRows, "site-settings.json"),
  };

  Object.values(validated).forEach(({ errors }) => validationErrors.push(...errors));
  if (validationErrors.length) {
    console.error("Validation errors found:");
    validationErrors.forEach((e) =>
      console.error(`- ${e.fileName} row ${e.index + 1}: ${e.detail || "invalid data"}`)
    );
    process.exit(1);
  }

  const results = {};

  results.categories = await upsertList(
    Category,
    validated.categories.validItems,
    (item) => ({ slug: slugify(item.slug || item.name) }),
    (item) => ({
      name: item.name,
      slug: slugify(item.slug || item.name),
      imageUrl: item.imageUrl || "",
      sortOrder: Number(item.sortOrder || 0),
      isActive: item.isActive !== false,
    })
  );

  const categoryMap = {};
  const allCategories = await Category.find();
  allCategories.forEach((c) => {
    categoryMap[c.slug] = c._id;
  });

  const productInput = [];
  validated.products.validItems.forEach((item) => {
    const categoryId = categoryMap[slugify(item.categorySlug)];
    if (!categoryId) {
      validationErrors.push({
        fileName: "products.json",
        index: -1,
        detail: `Unknown categorySlug "${item.categorySlug}" for product "${item.name}"`,
      });
      return;
    }
    productInput.push(item);
  });
  if (validationErrors.length) {
    console.error("Relationship validation errors:");
    validationErrors.forEach((e) => console.error(`- ${e.fileName}: ${e.detail}`));
    process.exit(1);
  }

  results.products = await upsertList(
    Product,
    productInput,
    (item) => ({ slug: slugify(item.slug || item.name) }),
    (item) => ({
      name: item.name,
      slug: slugify(item.slug || item.name),
      description: item.description || "",
      categoryId: categoryMap[slugify(item.categorySlug)] || null,
      brand: item.brand || "SHIVAM",
      price: Number(item.price || 0),
      mrp: Number(item.mrp || 0),
      stock: Number(item.stock || 0),
      imageUrls: item.imageUrls || [],
      gallery: item.gallery || item.imageUrls || [],
      highlights: item.highlights || [],
      specs: item.specs || [],
      tags: item.tags || [],
      isFeatured: item.isFeatured === true,
      isActive: item.isActive !== false,
    })
  );

  results.services = await upsertList(
    Service,
    validated.services.validItems,
    (item) => ({ title: item.title }),
    (item) => ({
      title: item.title,
      description: item.description || "",
      imageUrl: item.imageUrl || "",
      ctaText: item.ctaText || "Learn More",
      ctaUrl: item.ctaUrl || "#",
      isActive: item.isActive !== false,
    })
  );

  results.brands = await upsertList(
    Brand,
    validated.brands.validItems,
    (item) => ({ name: item.name }),
    (item) => ({
      name: item.name,
      logoUrl: item.logoUrl || "",
      sortOrder: Number(item.sortOrder || 0),
      isActive: item.isActive !== false,
    })
  );

  results.offers = await upsertList(
    Offer,
    validated.offers.validItems,
    (item) => ({ title: item.title }),
    (item) => ({
      title: item.title,
      subtitle: item.subtitle || "",
      bannerImageUrl: item.bannerImageUrl || "",
      discountPercent: Number(item.discountPercent || 0),
      promoCode: item.promoCode || "",
      startAt: item.startAt ? new Date(item.startAt) : null,
      endAt: item.endAt ? new Date(item.endAt) : null,
      isActive: item.isActive !== false,
    })
  );

  results.jobs = await upsertList(
    JobPost,
    validated.jobs.validItems,
    (item) => ({ title: item.title }),
    (item) => ({
      title: item.title,
      department: item.department || "General",
      experienceText: item.experienceText || "",
      skillSummary: item.skillSummary || "",
      details: item.details || "",
      contactEmail: item.contactEmail || "careers@shivam.com",
      sortOrder: Number(item.sortOrder || 0),
      isActive: item.isActive !== false,
    })
  );

  results.faqs = await upsertList(
    Faq,
    validated.faqs.validItems,
    (item) => ({ question: item.question }),
    (item) => ({
      question: item.question,
      answer: item.answer,
      category: item.category || "general",
      sortOrder: Number(item.sortOrder || 0),
      isActive: item.isActive !== false,
    })
  );

  results.banners = await upsertList(
    Banner,
    validated.banners.validItems,
    (item) => ({ title: item.title, placement: item.placement }),
    (item) => ({
      title: item.title,
      subtitle: item.subtitle || "",
      imageUrl: item.imageUrl,
      ctaText: item.ctaText || "",
      ctaUrl: item.ctaUrl || "",
      placement: item.placement,
      sortOrder: Number(item.sortOrder || 0),
      isActive: item.isActive !== false,
    })
  );

  results.testimonials = await upsertList(
    Testimonial,
    validated.testimonials.validItems,
    (item) => ({ name: item.name, quote: item.quote }),
    (item) => ({
      name: item.name,
      role: item.role || "",
      quote: item.quote,
      rating: Number(item.rating || 5),
      avatarUrl: item.avatarUrl || "",
      sortOrder: Number(item.sortOrder || 0),
      isActive: item.isActive !== false,
    })
  );

  const faqMap = {};
  const allFaqs = await Faq.find();
  allFaqs.forEach((faq) => {
    faqMap[faq.question.toLowerCase().trim()] = faq._id;
  });

  results.pages = await upsertList(
    PageContent,
    validated.pages.validItems,
    (item) => ({ slug: slugify(item.slug) }),
    (item) => ({
      slug: slugify(item.slug),
      title: item.title,
      hero: item.hero || {},
      richText: item.richText || "",
      faqRefs: (item.faqQuestions || [])
        .map((q) => faqMap[String(q).toLowerCase().trim()])
        .filter(Boolean),
      cta: item.cta || {},
      seo: item.seo || {},
      isActive: item.isActive !== false,
    })
  );

  results.settings = await upsertList(
    SiteSetting,
    validated.settings.validItems,
    (item) => ({ key: item.key }),
    (item) => ({
      key: item.key,
      group: item.group || "general",
      value: item.value ?? null,
      isPublic: item.isPublic !== false,
    })
  );

  console.log("JSON sync completed successfully.");
  console.table(results);
  process.exit(0);
}

run().catch((error) => {
  console.error("JSON sync failed:", error);
  process.exit(1);
});
