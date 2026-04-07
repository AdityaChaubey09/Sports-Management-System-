/**
 * Content routes
 * --------------
 * Public, read-only endpoints consumed by:
 * - home page banners/testimonials
 * - faq page
 * - legal/support pages via slug-driven page content
 */
const express = require("express");
const Banner = require("../models/Banner");
const Faq = require("../models/Faq");
const Testimonial = require("../models/Testimonial");
const PageContent = require("../models/PageContent");
const SiteSetting = require("../models/SiteSetting");
const { isDbConnected } = require("../config/db");
const LocalData = require("../utils/localData");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();

router.get(
  "/content/banners",
  asyncHandler(async (req, res) => {
    const { placement = "" } = req.query;
    if (!isDbConnected()) {
      return res.json({ banners: LocalData.getBanners(placement) });
    }
    const filter = { isActive: true };
    if (placement) {
      filter.placement = placement;
    }
    const banners = await Banner.find(filter).sort({ sortOrder: 1, createdAt: -1 });
    res.json({ banners });
  })
);

router.get(
  "/content/faqs",
  asyncHandler(async (req, res) => {
    const { category = "" } = req.query;
    if (!isDbConnected()) {
      return res.json({ faqs: LocalData.getFaqs(category) });
    }
    const filter = { isActive: true };
    if (category) filter.category = category;
    const faqs = await Faq.find(filter).sort({ sortOrder: 1, createdAt: -1 });
    res.json({ faqs });
  })
);

router.get(
  "/content/testimonials",
  asyncHandler(async (req, res) => {
    if (!isDbConnected()) {
      return res.json({ testimonials: LocalData.getTestimonials() });
    }
    const testimonials = await Testimonial.find({ isActive: true }).sort({
      sortOrder: 1,
      createdAt: -1,
    });
    res.json({ testimonials });
  })
);

router.get(
  "/content/page/:slug",
  asyncHandler(async (req, res) => {
    if (!isDbConnected()) {
      const page = LocalData.getPageBySlug(req.params.slug);
      if (!page) {
        return res.status(404).json({ message: "Page content not found" });
      }
      return res.json({ page });
    }
    const page = await PageContent.findOne({
      slug: req.params.slug,
      isActive: true,
    }).populate("faqRefs");
    if (!page) {
      return res.status(404).json({ message: "Page content not found" });
    }
    res.json({ page });
  })
);

router.get(
  "/content/settings",
  asyncHandler(async (req, res) => {
    const { group = "" } = req.query;
    if (!isDbConnected()) {
      return res.json({ settings: LocalData.getSettings(group) });
    }
    const filter = { isPublic: true };
    if (group) filter.group = group;
    const settings = await SiteSetting.find(filter).sort({ group: 1, key: 1 });
    res.json({ settings });
  })
);

module.exports = router;
