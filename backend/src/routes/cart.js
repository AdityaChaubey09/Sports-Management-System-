/**
 * Cart routes
 * -----------
 * Authenticated cart CRUD for current user.
 */
const express = require("express");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const { requireAuth } = require("../middleware/auth");
const { requireDatabase } = require("../middleware/requireDatabase");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();
router.use(requireDatabase, requireAuth);

async function getOrCreateCart(userId) {
  let cart = await Cart.findOne({ userId });
  if (!cart) {
    cart = await Cart.create({ userId, items: [] });
  }
  return cart;
}

function cartTotals(cart) {
  const subtotal = cart.items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);
  return { subtotal, total: subtotal };
}

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const cart = await getOrCreateCart(req.user._id);
    await cart.populate("items.productId");
    res.json({ cart, totals: cartTotals(cart) });
  })
);

router.post(
  "/items",
  asyncHandler(async (req, res) => {
    const { productId, qty = 1 } = req.body || {};
    const quantity = Math.max(Number(qty) || 1, 1);

    if (!productId) {
      return res.status(400).json({ message: "productId is required" });
    }

    const product = await Product.findOne({ _id: productId, isActive: true });
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const cart = await getOrCreateCart(req.user._id);
    const existing = cart.items.find((item) => String(item.productId) === String(product._id));
    if (existing) {
      existing.qty += quantity;
      existing.unitPrice = product.price;
    } else {
      cart.items.push({
        productId: product._id,
        qty: quantity,
        unitPrice: product.price,
      });
    }

    cart.updatedAt = new Date();
    await cart.save();
    await cart.populate("items.productId");
    res.status(201).json({ cart, totals: cartTotals(cart) });
  })
);

router.patch(
  "/items/:itemId",
  asyncHandler(async (req, res) => {
    const { qty } = req.body || {};
    const quantity = Number(qty);
    if (!Number.isFinite(quantity) || quantity < 1) {
      return res.status(400).json({ message: "qty must be a number >= 1" });
    }

    const cart = await getOrCreateCart(req.user._id);
    const item = cart.items.id(req.params.itemId);
    if (!item) {
      return res.status(404).json({ message: "Cart item not found" });
    }

    item.qty = quantity;
    cart.updatedAt = new Date();
    await cart.save();
    await cart.populate("items.productId");
    res.json({ cart, totals: cartTotals(cart) });
  })
);

router.delete(
  "/items/:itemId",
  asyncHandler(async (req, res) => {
    const cart = await getOrCreateCart(req.user._id);
    const item = cart.items.id(req.params.itemId);
    if (!item) {
      return res.status(404).json({ message: "Cart item not found" });
    }

    item.deleteOne();
    cart.updatedAt = new Date();
    await cart.save();
    await cart.populate("items.productId");
    res.json({ cart, totals: cartTotals(cart) });
  })
);

module.exports = router;
