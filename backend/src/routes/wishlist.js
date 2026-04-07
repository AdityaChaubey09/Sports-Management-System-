/**
 * Wishlist routes
 * ---------------
 * Authenticated add/remove/list operations for user wishlists.
 */
const express = require("express");
const User = require("../models/User");
const Product = require("../models/Product");
const { requireAuth } = require("../middleware/auth");
const { requireDatabase } = require("../middleware/requireDatabase");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();
router.use(requireDatabase, requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).populate("wishlist");
    res.json({ wishlist: user?.wishlist || [] });
  })
);

router.post(
  "/:productId",
  asyncHandler(async (req, res) => {
    const product = await Product.findOne({ _id: req.params.productId, isActive: true });
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    await User.updateOne(
      { _id: req.user._id },
      { $addToSet: { wishlist: req.params.productId } }
    );
    const user = await User.findById(req.user._id).populate("wishlist");
    res.status(201).json({ wishlist: user.wishlist });
  })
);

router.delete(
  "/:productId",
  asyncHandler(async (req, res) => {
    await User.updateOne({ _id: req.user._id }, { $pull: { wishlist: req.params.productId } });
    const user = await User.findById(req.user._id).populate("wishlist");
    res.json({ wishlist: user.wishlist });
  })
);

module.exports = router;
