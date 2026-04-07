/**
 * Banner model
 * ------------
 * Flexible hero/promo banner storage. The `placement` field allows
 * page-specific querying (example: "home_hero", "offers_top", "products_sidebar").
 */
const mongoose = require("mongoose");

const bannerSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 180 },
    subtitle: { type: String, default: "" },
    imageUrl: { type: String, required: true },
    ctaText: { type: String, default: "" },
    ctaUrl: { type: String, default: "" },
    placement: { type: String, required: true, trim: true, index: true },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Banner", bannerSchema);
