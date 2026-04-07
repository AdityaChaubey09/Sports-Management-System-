/**
 * FAQ model
 * ---------
 * Stores frequently asked questions consumed by support pages and accordion sections.
 */
const mongoose = require("mongoose");

const faqSchema = new mongoose.Schema(
  {
    question: { type: String, required: true, trim: true, maxlength: 500 },
    answer: { type: String, required: true, trim: true },
    category: { type: String, default: "general", index: true },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Faq", faqSchema);
