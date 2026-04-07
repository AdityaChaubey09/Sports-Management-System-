/**
 * SiteSetting model
 * -----------------
 * Generic key-value store used for lightweight global config values
 * (contact info, social links, counters, ticker text, etc.).
 */
const mongoose = require("mongoose");

const siteSettingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true, index: true },
    group: { type: String, default: "general", index: true },
    value: { type: mongoose.Schema.Types.Mixed, default: null },
    isPublic: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SiteSetting", siteSettingSchema);
