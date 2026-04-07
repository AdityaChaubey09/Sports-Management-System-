/**
 * Payment routes
 * --------------
 * Razorpay scaffolding with:
 * - order creation
 * - signature verification
 * - webhook verification
 */
const express = require("express");
const crypto = require("crypto");
const Razorpay = require("razorpay");
const Order = require("../models/Order");
const PaymentCode = require("../models/PaymentCode");
const { requireAuth } = require("../middleware/auth");
const { requireDatabase } = require("../middleware/requireDatabase");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();
router.use(requireDatabase);

function razorpayEnabled() {
  return process.env.ENABLE_RAZORPAY === "true";
}

function getRazorpayClient() {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    return null;
  }
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

function normalizePaymentCode(rawCode) {
  return String(rawCode || "")
    .trim()
    .toUpperCase();
}

router.post(
  "/gift-code/preview",
  requireAuth,
  asyncHandler(async (req, res) => {
    const code = normalizePaymentCode(
      req.body?.code || req.body?.giftCardCode || req.body?.paymentCode || req.body?.giftCode
    );
    const subtotal = Math.max(Number(req.body?.subtotal) || 0, 0);
    if (!code) {
      return res.status(400).json({ message: "Gift code is required" });
    }
    if (subtotal <= 0) {
      return res.status(400).json({ message: "Subtotal must be greater than zero" });
    }

    const paymentCode = await PaymentCode.findOne({ code, isActive: true });
    if (!paymentCode) {
      return res.status(404).json({ message: "Gift code not found or inactive" });
    }

    if (paymentCode.expiresAt && paymentCode.expiresAt.getTime() < Date.now()) {
      return res.status(400).json({ message: "Gift code has expired" });
    }

    const assignedEmail = String(paymentCode.assignedEmail || "")
      .trim()
      .toLowerCase();
    const userEmail = String(req.user.email || "")
      .trim()
      .toLowerCase();
    if (assignedEmail && assignedEmail !== userEmail) {
      return res.status(403).json({ message: "Gift code is assigned to another user" });
    }

    const remainingAmount = Math.max(Number(paymentCode.remainingAmount || 0), 0);
    if (remainingAmount <= 0) {
      return res.status(400).json({ message: "Gift code has no remaining balance" });
    }

    const applicableAmount = Math.min(subtotal, remainingAmount);
    const payableAmount = Math.max(subtotal - applicableAmount, 0);
    res.json({
      code: paymentCode.code,
      title: paymentCode.title || "",
      applicableAmount,
      payableAmount,
      remainingAmount,
      expiresAt: paymentCode.expiresAt || null,
      assignedEmail: paymentCode.assignedEmail || "",
    });
  })
);

router.post(
  "/razorpay/order",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!razorpayEnabled()) {
      return res.status(503).json({
        message:
          "Razorpay is scaffolded but disabled. Set ENABLE_RAZORPAY=true and add key credentials.",
      });
    }

    const { orderId } = req.body || {};
    if (!orderId) {
      return res.status(400).json({ message: "orderId is required" });
    }

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (String(order.userId) !== String(req.user._id)) {
      return res.status(403).json({ message: "Forbidden for this order" });
    }
    if (order.payment?.paymentStatus === "paid") {
      return res.status(400).json({ message: "Order already paid" });
    }

    const razorpay = getRazorpayClient();
    if (!razorpay) {
      return res.status(503).json({
        message:
          "Razorpay credentials missing. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in backend/.env",
      });
    }

    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(order.total * 100),
      currency: "INR",
      receipt: `order_${order._id}`,
      notes: { internalOrderId: String(order._id), userId: String(req.user._id) },
    });

    order.payment = {
      ...order.payment,
      provider: "razorpay",
      paymentStatus: "created",
      razorpayOrderId: razorpayOrder.id,
    };
    await order.save();

    res.json({
      razorpayOrder,
      keyId: process.env.RAZORPAY_KEY_ID,
      order,
    });
  })
);

router.post(
  "/razorpay/verify",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!razorpayEnabled()) {
      return res.status(503).json({
        message:
          "Razorpay is scaffolded but disabled. Set ENABLE_RAZORPAY=true and add key credentials.",
      });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body || {};
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !orderId) {
      return res.status(400).json({
        message:
          "razorpay_order_id, razorpay_payment_id, razorpay_signature and orderId are required",
      });
    }

    if (!process.env.RAZORPAY_KEY_SECRET) {
      return res.status(503).json({ message: "RAZORPAY_KEY_SECRET missing in env" });
    }

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ message: "Invalid payment signature" });
    }

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (String(order.userId) !== String(req.user._id)) {
      return res.status(403).json({ message: "Forbidden for this order" });
    }

    order.status = "paid";
    order.payment = {
      ...order.payment,
      provider: "razorpay",
      paymentStatus: "paid",
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
    };
    await order.save();

    res.json({ message: "Payment verified", order });
  })
);

router.post(
  "/razorpay/webhook",
  asyncHandler(async (req, res) => {
    if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
      return res.status(503).json({ message: "RAZORPAY_WEBHOOK_SECRET missing in env" });
    }

    const signature = req.headers["x-razorpay-signature"];
    const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body || {}));

    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest("hex");

    if (expected !== signature) {
      return res.status(400).json({ message: "Invalid webhook signature" });
    }

    const event = req.body?.event;
    const payload = req.body?.payload || {};
    if (event === "payment.captured") {
      const entity = payload.payment?.entity || {};
      const razorpayOrderId = entity.order_id;
      const razorpayPaymentId = entity.id;
      if (razorpayOrderId) {
        await Order.updateOne(
          { "payment.razorpayOrderId": razorpayOrderId },
          {
            $set: {
              status: "paid",
              "payment.paymentStatus": "paid",
              "payment.razorpayPaymentId": razorpayPaymentId || "",
            },
          }
        );
      }
    }

    res.json({ received: true });
  })
);

module.exports = router;
