const mongoose = require("mongoose");

const offerSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    subtitle: { type: String, default: "" },
    bannerImageUrl: { type: String, default: "" },
    discountPercent: { type: Number, min: 0, max: 100, required: true },
    promoCode: { type: String, default: "" },
    startAt: { type: Date, default: null },
    endAt: { type: Date, default: null },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Offer", offerSchema);
