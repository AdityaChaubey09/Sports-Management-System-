/**
 * Careers routes
 * --------------
 * Public endpoint for job applications against active job posts.
 */
const express = require("express");
const JobPost = require("../models/JobPost");
const JobApplication = require("../models/JobApplication");
const { requireDatabase } = require("../middleware/requireDatabase");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();
router.use(requireDatabase);

router.post(
  "/jobs/:jobId/applications",
  asyncHandler(async (req, res) => {
    const { fullName, email, phone, address, resumeLink = "", coverLetter = "" } = req.body || {};
    if (!fullName || !email || !phone || !address) {
      return res
        .status(400)
        .json({ message: "fullName, email, phone and address are required for application" });
    }

    const job = await JobPost.findOne({ _id: req.params.jobId, isActive: true });
    if (!job) {
      return res.status(404).json({ message: "Job post not found" });
    }

    const application = await JobApplication.create({
      jobId: job._id,
      fullName: String(fullName).trim(),
      email: String(email).toLowerCase().trim(),
      phone: String(phone).trim(),
      address: String(address).trim(),
      resumeLink: String(resumeLink || "").trim(),
      coverLetter: String(coverLetter || "").trim(),
      status: "received",
    });

    res.status(201).json({
      message: "Application submitted successfully",
      application,
    });
  })
);

module.exports = router;
