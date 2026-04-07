const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 180 },
    description: { type: String, default: "" },
    imageUrl: { type: String, default: "" },
    ctaText: { type: String, default: "Learn More" },
    ctaUrl: { type: String, default: "#" },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Service", serviceSchema);
