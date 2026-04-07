/**
 * Catalog routes
 * --------------
 * Public read-only routes for product discovery and storefront data.
 * Includes premium additions:
 * - featured product endpoint
 * - related product endpoint for single product pages
 */
const express = require("express");
const mongoose = require("mongoose");
const Category = require("../models/Category");
const Product = require("../models/Product");
const Service = require("../models/Service");
const Brand = require("../models/Brand");
const Offer = require("../models/Offer");
const JobPost = require("../models/JobPost");
const { isDbConnected } = require("../config/db");
const LocalData = require("../utils/localData");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();

const sortMap = {
  newest: { createdAt: -1 },
  price_asc: { price: 1 },
  price_desc: { price: -1 },
  name_asc: { name: 1 },
  name_desc: { name: -1 },
};

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Resolve category query parameter that can be either an ObjectId, slug, or display name.
 */
async function resolveCategoryFilter(categoryValue) {
  if (!categoryValue) return null;
  if (mongoose.Types.ObjectId.isValid(categoryValue)) {
    return categoryValue;
  }

  const categoryDoc = await Category.findOne({
    $or: [
      { slug: String(categoryValue).toLowerCase().trim() },
      { name: { $regex: `^${String(categoryValue).trim()}$`, $options: "i" } },
    ],
  });
  return categoryDoc ? categoryDoc._id : "__no_match__";
}

router.get(
  "/categories",
  asyncHandler(async (req, res) => {
    if (!isDbConnected()) {
      return res.json({ categories: LocalData.getCategories() });
    }
    const categories = await Category.find({ isActive: true }).sort({
      sortOrder: 1,
      name: 1,
    });
    res.json({ categories });
  })
);

router.get(
  "/products",
  asyncHandler(async (req, res) => {
    if (!isDbConnected()) {
      return res.json(LocalData.getProducts(req.query || {}));
    }
    const {
      search = "",
      category = "",
      brand = "",
      minPrice,
      maxPrice,
      sort = "newest",
      page = 1,
      limit = 12,
      featured = "",
    } = req.query;

    const filter = { isActive: true };
    const searchText = String(search).trim();
    if (searchText) {
      const searchRegex = { $regex: escapeRegExp(searchText), $options: "i" };
      filter.$or = [{ name: searchRegex }, { brand: searchRegex }];
    }

    const brandText = String(brand).trim();
    if (brandText) {
      filter.brand = { $regex: `^${escapeRegExp(brandText)}$`, $options: "i" };
    }

    const categoryId = await resolveCategoryFilter(category);
    if (categoryId === "__no_match__") {
      return res.json({
        products: [],
        pagination: {
          page: Number(page),
          limit: Number(limit),
          totalItems: 0,
          totalPages: 0,
        },
      });
    }
    if (categoryId) {
      filter.categoryId = categoryId;
    }

    if (featured === "true") {
      filter.isFeatured = true;
    }

    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice !== undefined && minPrice !== "") {
        filter.price.$gte = Number(minPrice);
      }
      if (maxPrice !== undefined && maxPrice !== "") {
        filter.price.$lte = Number(maxPrice);
      }
    }

    const safePage = Math.max(Number(page) || 1, 1);
    const safeLimit = Math.min(Math.max(Number(limit) || 12, 1), 50);
    const totalItems = await Product.countDocuments(filter);
    const totalPages = Math.ceil(totalItems / safeLimit) || 1;
    const skip = (safePage - 1) * safeLimit;

    const products = await Product.find(filter)
      .populate("categoryId", "name slug")
      .sort(sortMap[sort] || sortMap.newest)
      .skip(skip)
      .limit(safeLimit);

    res.json({
      products,
      pagination: {
        page: safePage,
        limit: safeLimit,
        totalItems,
        totalPages,
      },
    });
  })
);

/**
 * Featured endpoint used by marquee/hero/spotlight sections.
 */
router.get(
  "/products/featured",
  asyncHandler(async (req, res) => {
    if (!isDbConnected()) {
      return res.json({ products: LocalData.getFeaturedProducts(req.query.limit) });
    }
    const limit = Math.min(Math.max(Number(req.query.limit) || 8, 1), 24);
    const products = await Product.find({ isActive: true, isFeatured: true })
      .populate("categoryId", "name slug")
      .sort({ createdAt: -1 })
      .limit(limit);
    res.json({ products });
  })
);

router.get(
  "/products/:slug/related",
  asyncHandler(async (req, res) => {
    if (!isDbConnected()) {
      const result = LocalData.getRelatedProducts(req.params.slug, req.query.limit);
      if (!result) {
        return res.status(404).json({ message: "Product not found" });
      }
      return res.json({ related: result.related });
    }
    const { slug } = req.params;
    const limit = Math.min(Math.max(Number(req.query.limit) || 4, 1), 12);
    const product = await Product.findOne({ slug, isActive: true });
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const related = await Product.find({
      _id: { $ne: product._id },
      isActive: true,
      $or: [{ categoryId: product.categoryId }, { brand: product.brand }],
    })
      .populate("categoryId", "name slug")
      .sort({ isFeatured: -1, createdAt: -1 })
      .limit(limit);

    res.json({ related });
  })
);

router.get(
  "/products/:slug",
  asyncHandler(async (req, res) => {
    if (!isDbConnected()) {
      const product = LocalData.getProductBySlug(req.params.slug);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      return res.json({ product });
    }
    const product = await Product.findOne({
      slug: req.params.slug,
      isActive: true,
    }).populate("categoryId", "name slug");
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.json({ product });
  })
);

router.get(
  "/services",
  asyncHandler(async (req, res) => {
    if (!isDbConnected()) {
      return res.json({ services: LocalData.getServices() });
    }
    const services = await Service.find({ isActive: true }).sort({ createdAt: -1 });
    res.json({ services });
  })
);

router.get(
  "/brands",
  asyncHandler(async (req, res) => {
    if (!isDbConnected()) {
      return res.json({ brands: LocalData.getBrands() });
    }
    const brands = await Brand.find({ isActive: true }).sort({ sortOrder: 1, name: 1 });
    res.json({ brands });
  })
);

router.get(
  "/offers",
  asyncHandler(async (req, res) => {
    if (!isDbConnected()) {
      return res.json({ offers: LocalData.getOffers() });
    }
    const now = new Date();
    const offers = await Offer.find({
      isActive: true,
      $and: [
        { $or: [{ startAt: null }, { startAt: { $lte: now } }] },
        { $or: [{ endAt: null }, { endAt: { $gte: now } }] },
      ],
    }).sort({ discountPercent: -1 });
    res.json({ offers });
  })
);

router.get(
  "/jobs",
  asyncHandler(async (req, res) => {
    if (!isDbConnected()) {
      return res.json({ jobs: LocalData.getJobs() });
    }
    const jobs = await JobPost.find({ isActive: true }).sort({ sortOrder: 1, createdAt: -1 });
    res.json({ jobs });
  })
);

module.exports = router;
