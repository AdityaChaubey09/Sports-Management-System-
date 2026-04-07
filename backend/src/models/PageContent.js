/**
 * PageContent model
 * -----------------
 * Stores flexible rich content blocks for about/legal/support pages.
 * All legal pages can share one common rendering template by querying this model via slug.
 */
const mongoose = require("mongoose");

const pageHeroSchema = new mongoose.Schema(
  {
    eyebrow: { type: String, default: "" },
    heading: { type: String, default: "" },
    subheading: { type: String, default: "" },
    imageUrl: { type: String, default: "" },
  },
  { _id: false }
);

const pageCtaSchema = new mongoose.Schema(
  {
    text: { type: String, default: "" },
    url: { type: String, default: "" },
    style: { type: String, default: "primary" },
  },
  { _id: false }
);

const pageContentSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, trim: true, index: true },
    title: { type: String, required: true, trim: true },
    hero: { type: pageHeroSchema, default: () => ({}) },
    richText: { type: String, default: "" },
    faqRefs: [{ type: mongoose.Schema.Types.ObjectId, ref: "Faq" }],
    cta: { type: pageCtaSchema, default: () => ({}) },
    seo: {
      title: { type: String, default: "" },
      description: { type: String, default: "" },
      keywords: [{ type: String }],
    },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PageContent", pageContentSchema);
