/**
 * Auth routes
 * -----------
 * Handles registration, login, token-introspection (`/me`) and logout response.
 */
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { requireAuth } = require("../middleware/auth");
const { requireDatabase } = require("../middleware/requireDatabase");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();
router.use(requireDatabase);

function signToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

router.post(
  "/register",
  asyncHandler(async (req, res) => {
    const { name, email, password, phone, address } = req.body || {};
    if (!name || !email || !password || !phone || !address) {
      return res
        .status(400)
        .json({ message: "name, email, password, phone and address are required" });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }
    if (!/^\d{10}$/.test(String(phone).trim())) {
      return res.status(400).json({ message: "Phone number must be exactly 10 digits" });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      passwordHash,
      phone: String(phone).trim(),
      defaultAddress: {
        fullName: String(name).trim(),
        line1: String(address).trim(),
      },
      role: "customer",
    });

    const token = signToken(user);
    return res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
      },
    });
  })
);

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required" });
    }

    const user = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = signToken(user);
    return res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
      },
    });
  })
);

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    return res.json({ user: req.user });
  })
);

router.post("/logout", requireAuth, (req, res) => {
  return res.json({
    message:
      "Logout successful. Client should delete JWT token from local storage/session storage.",
  });
});

module.exports = router;
