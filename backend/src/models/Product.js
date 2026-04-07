/**
 * Product model
 * -------------
 * Purpose:
 * - Central catalog entity used by listing pages, single product page, cart, wishlist and orders.
 *
 * Premium fields:
 * - `gallery` and `highlights` support richer product-detail layouts.
 * - `specs` allows table-like key/value rendering in frontend tabs.
 * - `seo` provides optional meta content when page-level SEO is needed.
 */
const mongoose = require("mongoose");

const productSpecSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    value: { type: String, required: true },
  },
  { _id: false }
);

const seoSchema = new mongoose.Schema(
  {
    title: { type: String, default: "" },
    description: { type: String, default: "" },
    keywords: [{ type: String }],
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    slug: { type: String, required: true, unique: true, trim: true, index: true },
    description: { type: String, default: "" },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },
    brand: { type: String, default: "SHIVAM" },
    price: { type: Number, required: true, min: 0, index: true },
    mrp: { type: Number, required: true, min: 0 },
    stock: { type: Number, default: 0, min: 0 },
    imageUrls: [{ type: String }],
    gallery: [{ type: String }],
    highlights: [{ type: String }],
    specs: [productSpecSchema],
    seo: { type: seoSchema, default: () => ({}) },
    tags: [{ type: String, trim: true }],
    isFeatured: { type: Boolean, default: false, index: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
