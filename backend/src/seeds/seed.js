/**
 * Seed Script
 * -----------
 * Creates a starter dataset for local development/demo.
 * Note:
 * - For full CMS-style data replacement, run `npm run sync:data` after this seed.
 */
require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });
const bcrypt = require("bcryptjs");
const { connectDb } = require("../config/db");
const User = require("../models/User");
const Category = require("../models/Category");
const Product = require("../models/Product");
const Service = require("../models/Service");
const Brand = require("../models/Brand");
const Offer = require("../models/Offer");
const JobPost = require("../models/JobPost");
const JobApplication = require("../models/JobApplication");
const Cart = require("../models/Cart");
const Order = require("../models/Order");
const Faq = require("../models/Faq");
const Banner = require("../models/Banner");
const Testimonial = require("../models/Testimonial");
const PageContent = require("../models/PageContent");
const SiteSetting = require("../models/SiteSetting");
const { slugify } = require("../utils/slugify");

async function runSeed() {
  await connectDb();

  await Promise.all([
    User.deleteMany({}),
    Category.deleteMany({}),
    Product.deleteMany({}),
    Service.deleteMany({}),
    Brand.deleteMany({}),
    Offer.deleteMany({}),
    JobPost.deleteMany({}),
    JobApplication.deleteMany({}),
    Cart.deleteMany({}),
    Order.deleteMany({}),
    Faq.deleteMany({}),
    Banner.deleteMany({}),
    Testimonial.deleteMany({}),
    PageContent.deleteMany({}),
    SiteSetting.deleteMany({}),
  ]);

  const adminPasswordHash = await bcrypt.hash("Admin@123", 10);
  const customerPasswordHash = await bcrypt.hash("Customer@123", 10);

  await User.create([
    {
      name: "Shivam Admin",
      email: "admin@shivam.com",
      passwordHash: adminPasswordHash,
      role: "admin",
      phone: "9999999999",
    },
    {
      name: "Demo Customer",
      email: "customer@shivam.com",
      passwordHash: customerPasswordHash,
      role: "customer",
      phone: "8888888888",
    },
  ]);

  const categories = await Category.insertMany([
    {
      name: "Football",
      slug: "football",
      imageUrl: "/assets/images/pdf-pages/page-2.png",
      sortOrder: 1,
      isActive: true,
    },
    {
      name: "Basketball",
      slug: "basketball",
      imageUrl: "/assets/images/pdf-pages/page-3.png",
      sortOrder: 2,
      isActive: true,
    },
    {
      name: "Tennis",
      slug: "tennis",
      imageUrl: "/assets/images/pdf-extracted/img-27.png",
      sortOrder: 3,
      isActive: true,
    },
    {
      name: "Fitness",
      slug: "fitness",
      imageUrl: "/assets/images/pdf-pages/page-6.png",
      sortOrder: 4,
      isActive: true,
    },
    {
      name: "Shoes",
      slug: "shoes",
      imageUrl: "/assets/images/pdf-extracted/img-91.jpeg",
      sortOrder: 5,
      isActive: true,
    },
  ]);

  await Brand.insertMany([
    { name: "COSCO", logoUrl: "/assets/images/pdf-extracted/img-68.png", sortOrder: 1 },
    { name: "ASICS", logoUrl: "/assets/images/pdf-extracted/img-84.png", sortOrder: 2 },
    { name: "Skechers", logoUrl: "/assets/images/pdf-extracted/img-84.png", sortOrder: 3 },
    { name: "Le Coq Sportif", logoUrl: "/assets/images/pdf-extracted/img-84.png", sortOrder: 4 },
    { name: "SHIVAM", logoUrl: "/assets/images/hero-sports.jpg", sortOrder: 5 },
  ]);

  const categoryBySlug = Object.fromEntries(categories.map((c) => [c.slug, c]));

  const productsRaw = [
    {
      name: "COSCO Super Basketball Size 6",
      categorySlug: "basketball",
      brand: "COSCO",
      price: 630,
      mrp: 675,
      stock: 40,
      imageUrls: ["/assets/images/pdf-extracted/img-29.jpeg"],
      tags: ["basketball", "featured"],
      isFeatured: true,
    },
    {
      name: "COSCO Pulse Basketball Size 6",
      categorySlug: "basketball",
      brand: "COSCO",
      price: 720,
      mrp: 800,
      stock: 30,
      imageUrls: ["/assets/images/pdf-extracted/img-37.jpeg"],
      tags: ["basketball"],
      isFeatured: true,
    },
    {
      name: "COSCO Funtime Basketball Size 5",
      categorySlug: "basketball",
      brand: "COSCO",
      price: 264,
      mrp: 275,
      stock: 55,
      imageUrls: ["/assets/images/pdf-extracted/img-38.jpeg"],
      tags: ["basketball"],
      isFeatured: false,
    },
    {
      name: "COSCO Dribble Basketball Size 6",
      categorySlug: "basketball",
      brand: "COSCO",
      price: 605,
      mrp: 655,
      stock: 45,
      imageUrls: ["/assets/images/pdf-extracted/img-39.png"],
      tags: ["basketball"],
      isFeatured: false,
    },
    {
      name: "ASICS Gel Peak Cricket Shoes",
      categorySlug: "shoes",
      brand: "ASICS",
      price: 5990,
      mrp: 6999,
      stock: 20,
      imageUrls: ["/assets/images/pdf-extracted/img-91.jpeg"],
      tags: ["shoes", "asics"],
      isFeatured: true,
    },
    {
      name: "ASICS 350 Not Out FF Leather",
      categorySlug: "shoes",
      brand: "ASICS",
      price: 10999,
      mrp: 13999,
      stock: 14,
      imageUrls: ["/assets/images/pdf-extracted/img-59.jpeg"],
      tags: ["shoes", "premium"],
      isFeatured: true,
    },
    {
      name: "ASICS Speed Menace FF Spike",
      categorySlug: "shoes",
      brand: "ASICS",
      price: 11800,
      mrp: 13999,
      stock: 12,
      imageUrls: ["/assets/images/pdf-extracted/img-60.jpeg"],
      tags: ["shoes", "running"],
      isFeatured: false,
    },
    {
      name: "Pro Match Football",
      categorySlug: "football",
      brand: "SHIVAM",
      price: 999,
      mrp: 1299,
      stock: 60,
      imageUrls: ["/assets/images/pdf-pages/page-2.png"],
      tags: ["football"],
      isFeatured: true,
    },
    {
      name: "Tournament Tennis Racket",
      categorySlug: "tennis",
      brand: "SHIVAM",
      price: 1799,
      mrp: 2299,
      stock: 35,
      imageUrls: ["/assets/images/pdf-extracted/img-56.jpeg"],
      tags: ["tennis", "racket"],
      isFeatured: true,
    },
    {
      name: "Padel Pro Racket",
      categorySlug: "tennis",
      brand: "SHIVAM",
      price: 2499,
      mrp: 2999,
      stock: 25,
      imageUrls: ["/assets/images/pdf-extracted/img-65.png"],
      tags: ["padel"],
      isFeatured: false,
    },
    {
      name: "Fitness Training Mat",
      categorySlug: "fitness",
      brand: "SHIVAM",
      price: 899,
      mrp: 1199,
      stock: 70,
      imageUrls: ["/assets/images/pdf-pages/page-6.png"],
      tags: ["fitness"],
      isFeatured: false,
    },
    {
      name: "Speed Rope for Endurance",
      categorySlug: "fitness",
      brand: "SHIVAM",
      price: 349,
      mrp: 499,
      stock: 100,
      imageUrls: ["/assets/images/pdf-extracted/img-47.jpeg"],
      tags: ["fitness", "training"],
      isFeatured: false,
    },
  ];

  await Product.insertMany(
    productsRaw.map((item) => ({
      name: item.name,
      slug: slugify(item.name),
      description:
        "Premium quality sports product from Shivam Sports with direct factory authenticity and reliable delivery.",
      categoryId: categoryBySlug[item.categorySlug]?._id,
      brand: item.brand,
      price: item.price,
      mrp: item.mrp,
      stock: item.stock,
      imageUrls: item.imageUrls,
      gallery: item.imageUrls,
      highlights: [
        "Factory-direct authenticity",
        "Quality-tested sports performance",
        "Designed for training and match usage",
      ],
      specs: [
        { label: "Brand", value: item.brand },
        { label: "Stock", value: String(item.stock) },
        { label: "Segment", value: item.categorySlug },
      ],
      tags: item.tags,
      isFeatured: item.isFeatured,
      isActive: true,
    }))
  );

  await Service.insertMany([
    {
      title: "Custom T-Shirt Service",
      description:
        "Manufacturing, printing and embroidery service for teams and events with custom sizing and delivery.",
      imageUrl: "/assets/images/pdf-pages/page-3.png",
      ctaText: "Book Service",
      ctaUrl: "/services.html",
    },
    {
      title: "Sports Kit Consultation",
      description:
        "Get guidance on selecting the best kits by comparing product features, size ranges and budgets.",
      imageUrl: "/assets/images/pdf-pages/page-2.png",
      ctaText: "Get Consultation",
      ctaUrl: "/contact.html",
    },
    {
      title: "Bulk Team Supply",
      description:
        "Factory-direct bulk ordering for schools, academies and clubs with fast all-India shipping.",
      imageUrl: "/assets/images/pdf-pages/page-5.png",
      ctaText: "Request Quote",
      ctaUrl: "/contact.html",
    },
  ]);

  await Offer.insertMany([
    {
      title: "Mega Deal",
      subtitle: "Flat 80% Off",
      bannerImageUrl: "/assets/images/pdf-pages/page-4.png",
      discountPercent: 80,
      promoCode: "ALAY80",
      isActive: true,
    },
    {
      title: "Top Brand Offer",
      subtitle: "Flat 70% Off",
      bannerImageUrl: "/assets/images/pdf-pages/page-5.png",
      discountPercent: 70,
      promoCode: "ALAY70",
      isActive: true,
    },
    {
      title: "Season Offer",
      subtitle: "Flat 60% Off",
      bannerImageUrl: "/assets/images/pdf-pages/page-5.png",
      discountPercent: 60,
      promoCode: "ALAY60",
      isActive: true,
    },
    {
      title: "Weekend Offer",
      subtitle: "Flat 50% Off",
      bannerImageUrl: "/assets/images/pdf-pages/page-5.png",
      discountPercent: 50,
      promoCode: "ALAY50",
      isActive: true,
    },
    {
      title: "Fitness Offer",
      subtitle: "Flat 40% Off",
      bannerImageUrl: "/assets/images/pdf-pages/page-5.png",
      discountPercent: 40,
      promoCode: "FIT40",
      isActive: true,
    },
    {
      title: "Shoes Offer",
      subtitle: "Flat 30% Off",
      bannerImageUrl: "/assets/images/pdf-pages/page-5.png",
      discountPercent: 30,
      promoCode: "SHOES30",
      isActive: true,
    },
  ]);

  await JobPost.insertMany([
    {
      title: "Account Executive",
      department: "Finance",
      experienceText: "4 to 6 years",
      skillSummary:
        "Proficient in financial accounting, bookkeeping, GST/TDS compliance, payroll management, MS Excel and Tally/ERP with strong analytical and reporting abilities.",
      details:
        "Manage daily accounting operations, reconciliations, tax documentation and compliance reporting.",
      contactEmail: "careers@shivam.com",
      sortOrder: 1,
    },
    {
      title: "Web Developer",
      department: "Technology",
      experienceText: "2 to 5 years",
      skillSummary:
        "HTML, CSS, JavaScript, jQuery, Bootstrap, REST APIs, responsive UI, debugging and version control.",
      details:
        "Build and maintain website modules, optimize performance, and collaborate with product and design teams.",
      contactEmail: "careers@shivam.com",
      sortOrder: 2,
    },
    {
      title: "HR Executive",
      department: "Human Resources",
      experienceText: "2 to 4 years",
      skillSummary:
        "Recruitment lifecycle, onboarding, attendance, policy communication, employee engagement and HRMS usage.",
      details:
        "Support hiring, employee records, compliance documentation and internal communication processes.",
      contactEmail: "careers@shivam.com",
      sortOrder: 3,
    },
    {
      title: "Admin Executive",
      department: "Administration",
      experienceText: "2 to 5 years",
      skillSummary:
        "Office operations, vendor coordination, facility management, documentation and communication skills.",
      details:
        "Handle administrative workflows, procurement, office maintenance and operational reporting.",
      contactEmail: "careers@shivam.com",
      sortOrder: 4,
    },
    {
      title: "Graphics Designer",
      department: "Creative",
      experienceText: "2 to 5 years",
      skillSummary:
        "Adobe Photoshop, Illustrator, branding layouts, social creatives, catalog design and visual storytelling.",
      details:
        "Create banners, campaign visuals, product creatives and brand design assets for online and offline channels.",
      contactEmail: "careers@shivam.com",
      sortOrder: 5,
    },
    {
      title: "Frontdesk Executive",
      department: "Operations",
      experienceText: "1 to 3 years",
      skillSummary:
        "Reception handling, visitor management, call coordination, scheduling and office communication etiquette.",
      details:
        "Manage front office operations and maintain a professional first point of contact for visitors and clients.",
      contactEmail: "careers@shivam.com",
      sortOrder: 6,
    },
    {
      title: "BD Executive",
      department: "Business Development",
      experienceText: "2 to 5 years",
      skillSummary:
        "Lead generation, pitching, relationship management, negotiation, CRM tracking and target orientation.",
      details:
        "Identify business opportunities, engage new clients and support strategic growth initiatives.",
      contactEmail: "careers@shivam.com",
      sortOrder: 7,
    },
    {
      title: "Sales Manager",
      department: "Sales",
      experienceText: "4 to 8 years",
      skillSummary:
        "Sales planning, team leadership, pipeline forecasting, channel management and revenue growth strategy.",
      details:
        "Drive sales targets, mentor the sales team and manage key customer accounts across regions.",
      contactEmail: "careers@shivam.com",
      sortOrder: 8,
    },
    {
      title: "Marketing Executive",
      department: "Marketing",
      experienceText: "2 to 5 years",
      skillSummary:
        "Digital campaigns, performance tracking, content coordination, social media and brand positioning.",
      details:
        "Execute marketing campaigns, optimize acquisition funnels and improve brand reach and engagement.",
      contactEmail: "careers@shivam.com",
      sortOrder: 9,
    },
  ]);

  const faqs = await Faq.insertMany([
    {
      question: "How long does shipping usually take?",
      answer: "Standard shipping takes around 3-7 business days depending on location.",
      category: "shipping",
      sortOrder: 1,
      isActive: true,
    },
    {
      question: "Are products authentic and factory direct?",
      answer: "Yes, products are sourced through direct manufacturing channels.",
      category: "products",
      sortOrder: 2,
      isActive: true,
    },
  ]);

  await Banner.insertMany([
    {
      title: "Play Beyond Limits",
      subtitle: "Factory direct sports gear with premium value",
      imageUrl: "/assets/images/pdf-pages/page-2.png",
      ctaText: "Shop Now",
      ctaUrl: "/products.html",
      placement: "home_hero",
      sortOrder: 1,
      isActive: true,
    },
    {
      title: "Top Seasonal Offers",
      subtitle: "Save big on shoes, kits and accessories",
      imageUrl: "/assets/images/pdf-pages/page-5.png",
      ctaText: "View Offers",
      ctaUrl: "/offers.html",
      placement: "offers_top",
      sortOrder: 1,
      isActive: true,
    },
  ]);

  await Testimonial.insertMany([
    {
      name: "Rahul Verma",
      role: "School Coach",
      quote: "Excellent product quality and fast shipping for our tournaments.",
      rating: 5,
      avatarUrl: "/assets/images/pdf-extracted/img-67.jpeg",
      sortOrder: 1,
      isActive: true,
    },
    {
      name: "Meera Sharma",
      role: "Fitness Trainer",
      quote: "Reliable supply chain and good pricing for recurring orders.",
      rating: 5,
      avatarUrl: "/assets/images/pdf-extracted/img-67.jpeg",
      sortOrder: 2,
      isActive: true,
    },
  ]);

  await PageContent.insertMany([
    {
      slug: "about",
      title: "About Shivam Sports",
      hero: {
        eyebrow: "About Us",
        heading: "Three Generations of Sports Manufacturing",
        subheading: "Factory-direct quality and athlete-focused product strategy.",
        imageUrl: "/assets/images/pdf-pages/page-1.png",
      },
      richText:
        "<p>SHIVAM SPORTS SHOP is an exclusive online sports shop established by Shivam Enterprises Pvt. Ltd. to provide customers with the best quality sports equipment and services.</p>",
      faqRefs: faqs.map((f) => f._id),
      cta: { text: "Explore Products", url: "/products.html", style: "primary" },
      isActive: true,
    },
    {
      slug: "shipping-policy",
      title: "Shipping Policy",
      hero: {
        eyebrow: "Policy",
        heading: "Shipping and Delivery",
        subheading: "Transparent timelines and secure dispatch process.",
        imageUrl: "/assets/images/pdf-pages/page-5.png",
      },
      richText:
        "<p>Orders are processed after payment confirmation and shipped through trusted courier channels.</p>",
      faqRefs: [faqs[0]._id],
      cta: { text: "Track Your Order", url: "/order-track.html", style: "primary" },
      isActive: true,
    },
    {
      slug: "returns-policy",
      title: "Returns Policy",
      hero: {
        eyebrow: "Policy",
        heading: "Returns and Replacements",
        subheading: "Simple process for eligible return requests.",
        imageUrl: "/assets/images/pdf-pages/page-4.png",
      },
      richText:
        "<p>Eligible return requests can be raised within policy timelines subject to conditions.</p>",
      faqRefs: [],
      cta: { text: "Contact Support", url: "/contact.html", style: "outline" },
      isActive: true,
    },
    {
      slug: "privacy-policy",
      title: "Privacy Policy",
      hero: {
        eyebrow: "Policy",
        heading: "Your Data, Your Trust",
        subheading: "How customer information is collected and used.",
        imageUrl: "/assets/images/pdf-pages/page-6.png",
      },
      richText:
        "<p>We collect essential customer data required for account and order operations only.</p>",
      faqRefs: [],
      cta: { text: "Read Terms", url: "/terms.html", style: "outline" },
      isActive: true,
    },
    {
      slug: "terms",
      title: "Terms and Conditions",
      hero: {
        eyebrow: "Legal",
        heading: "Terms of Use",
        subheading: "Rules for using Shivam Sports platform.",
        imageUrl: "/assets/images/pdf-pages/page-1.png",
      },
      richText: "<p>By using this platform, users agree to terms related to purchases and usage.</p>",
      faqRefs: [],
      cta: { text: "Need Help?", url: "/faq.html", style: "primary" },
      isActive: true,
    },
  ]);

  await SiteSetting.insertMany([
    {
      key: "home.marquee_text",
      group: "home",
      value: "Factory Direct | Secure Payment | Fast All India Shipping | Trusted by Athletes",
      isPublic: true,
    },
    { key: "home.stat_customers", group: "home", value: 12000, isPublic: true },
    { key: "home.stat_products", group: "home", value: 1800, isPublic: true },
    { key: "home.stat_years", group: "home", value: 66, isPublic: true },
    { key: "site.contact_email", group: "contact", value: "careers@shivam.com", isPublic: true },
  ]);

  console.log("Seed completed.");
  console.log("Admin login: admin@shivam.com / Admin@123");
  console.log("Customer login: customer@shivam.com / Customer@123");
  process.exit(0);
}

runSeed().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
