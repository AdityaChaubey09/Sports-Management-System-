const mongoose = require("mongoose");

const jobPostSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 140 },
    department: { type: String, default: "General" },
    experienceText: { type: String, default: "" },
    skillSummary: { type: String, required: true },
    details: { type: String, default: "" },
    contactEmail: { type: String, default: "careers@shivam.com" },
    isActive: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("JobPost", jobPostSchema);
