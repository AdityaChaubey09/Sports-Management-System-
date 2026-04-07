/**
 * API route registry
 * ------------------
 * Single place to mount all feature modules.
 */
const express = require("express");
const authRoutes = require("./auth");
const catalogRoutes = require("./catalog");
const cartRoutes = require("./cart");
const wishlistRoutes = require("./wishlist");
const orderRoutes = require("./orders");
const paymentRoutes = require("./payments");
const careersRoutes = require("./careers");
const contentRoutes = require("./content");
const profileRoutes = require("./profile");
const adminRoutes = require("./admin");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/", catalogRoutes);
router.use("/cart", cartRoutes);
router.use("/wishlist", wishlistRoutes);
router.use("/orders", orderRoutes);
router.use("/payments", paymentRoutes);
router.use("/", careersRoutes);
router.use("/", contentRoutes);
router.use("/", profileRoutes);
router.use("/admin", adminRoutes);

module.exports = router;
