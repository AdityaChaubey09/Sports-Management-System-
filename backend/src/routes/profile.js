/**
 * Profile routes
 * --------------
 * Authenticated endpoints for customer profile and password management.
 */
const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { requireAuth } = require("../middleware/auth");
const { requireDatabase } = require("../middleware/requireDatabase");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();
router.use(requireDatabase, requireAuth);

/**
 * Shape response object to avoid returning sensitive fields.
 */
function buildProfileResponse(userDoc) {
  return {
    id: userDoc._id,
    name: userDoc.name,
    email: userDoc.email,
    role: userDoc.role,
    phone: userDoc.phone,
    avatarUrl: userDoc.avatarUrl || "",
    bio: userDoc.bio || "",
    dateOfBirth: userDoc.dateOfBirth || "",
    defaultAddress: userDoc.defaultAddress || {},
    createdAt: userDoc.createdAt,
    updatedAt: userDoc.updatedAt,
  };
}

router.get(
  "/profile",
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ profile: buildProfileResponse(user) });
  })
);

router.patch(
  "/profile",
  asyncHandler(async (req, res) => {
    const allowedFields = ["name", "phone", "avatarUrl", "bio", "dateOfBirth", "defaultAddress"];
    const payload = {};
    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body || {}, field)) {
        payload[field] = req.body[field];
      }
    }

    if (payload.name && !String(payload.name).trim()) {
      return res.status(400).json({ message: "name cannot be empty" });
    }

    const user = await User.findByIdAndUpdate(req.user._id, payload, {
      new: true,
      runValidators: true,
    });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ profile: buildProfileResponse(user) });
  })
);

router.patch(
  "/profile/password",
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "currentPassword and newPassword are required" });
    }
    if (String(newPassword).length < 6) {
      return res.status(400).json({ message: "newPassword must be at least 6 characters" });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ message: "Password updated successfully" });
  })
);

module.exports = router;
