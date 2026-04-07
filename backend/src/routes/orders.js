/**
 * Orders routes
 * -------------
 * Contains:
 * - authenticated order creation and retrieval
 * - unauthenticated "track order" endpoint using order id + customer email
 */
const express = require("express");
const Product = require("../models/Product");
const Cart = require("../models/Cart");
const Order = require("../models/Order");
const PaymentCode = require("../models/PaymentCode");
const { requireAuth } = require("../middleware/auth");
const { requireDatabase } = require("../middleware/requireDatabase");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();
router.use(requireDatabase);
const SUPPORTED_PAYMENT_METHODS = new Set(["razorpay", "cod"]);

/**
 * Public tracking route.
 * Input:
 * - orderId: mongo id of order
 * - email: customer email used in shippingAddress
 */
router.post(
  "/track",
  asyncHandler(async (req, res) => {
    const { orderId, email } = req.body || {};
    if (!orderId || !email) {
      return res.status(400).json({ message: "orderId and email are required" });
    }

    const order = await Order.findById(orderId).select(
      "_id status total shippingAddress createdAt updatedAt"
    );
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const orderEmail = String(order.shippingAddress?.email || "").toLowerCase().trim();
    if (!orderEmail || normalizedEmail !== orderEmail) {
      return res.status(403).json({ message: "Email does not match order details" });
    }

    res.json({
      tracking: {
        orderId: order._id,
        status: order.status,
        total: order.total,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      },
    });
  })
);

router.use(requireAuth);

async function buildOrderItems(itemsInput) {
  const normalized = [];
  for (const item of itemsInput) {
    if (!item.productId || !item.qty) continue;
    const qty = Math.max(Number(item.qty) || 1, 1);
    const product = await Product.findOne({ _id: item.productId, isActive: true });
    if (!product) continue;
    normalized.push({
      productId: product._id,
      name: product.name,
      qty,
      unitPrice: product.price,
      lineTotal: qty * product.price,
    });
  }
  return normalized;
}

function validateShipping(shippingAddress = {}) {
  const required = [
    "fullName",
    "email",
    "phone",
    "line1",
    "city",
    "state",
    "pincode",
    "country",
  ];
  for (const key of required) {
    if (!shippingAddress[key]) {
      return `shippingAddress.${key} is required`;
    }
  }
  return null;
}

function normalizePaymentMethod(rawMethod) {
  const method = String(rawMethod || "razorpay")
    .trim()
    .toLowerCase();
  return SUPPORTED_PAYMENT_METHODS.has(method) ? method : "razorpay";
}

function normalizePaymentCode(rawCode) {
  return String(rawCode || "")
    .trim()
    .toUpperCase();
}

function buildPaymentCodeError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function resolveOrderStatusAndPayment({ paymentMethod, total, paymentCodeContext, discount }) {
  const base = {
    provider: "razorpay",
    paymentStatus: "unpaid",
    paymentCodeId: null,
    paymentCode: "",
    giftAppliedAmount: discount,
    giftTitle: paymentCodeContext?.codeDoc?.title || "",
  };

  if (paymentCodeContext) {
    base.paymentCodeId = paymentCodeContext.codeDoc._id;
    base.paymentCode = paymentCodeContext.codeDoc.code;
  }

  if (total <= 0) {
    return {
      orderStatus: "paid",
      payment: {
        ...base,
        provider: paymentCodeContext ? "gift-code" : paymentMethod === "cod" ? "cash" : "manual",
        paymentStatus: "paid",
      },
    };
  }

  if (paymentMethod === "cod") {
    return {
      orderStatus: "processing",
      payment: {
        ...base,
        provider: "cash",
        paymentStatus: "unpaid",
      },
    };
  }

  return {
    orderStatus: "pending",
    payment: {
      ...base,
      provider: "razorpay",
      paymentStatus: "unpaid",
    },
  };
}

async function resolvePaymentCodeForOrder({ rawPaymentCode, user, subtotal }) {
  const paymentCode = normalizePaymentCode(rawPaymentCode);
  if (!paymentCode) return null;

  const codeDoc = await PaymentCode.findOne({ code: paymentCode, isActive: true });
  if (!codeDoc) {
    throw buildPaymentCodeError("Invalid or inactive payment code.");
  }

  if (codeDoc.expiresAt && codeDoc.expiresAt.getTime() < Date.now()) {
    throw buildPaymentCodeError("This payment code has expired.");
  }

  const assignedEmail = String(codeDoc.assignedEmail || "")
    .trim()
    .toLowerCase();
  const userEmail = String(user.email || "")
    .trim()
    .toLowerCase();
  if (assignedEmail && assignedEmail !== userEmail) {
    throw buildPaymentCodeError("This payment code is assigned to another user.", 403);
  }

  const availableAmount = Number(codeDoc.remainingAmount || 0);
  if (availableAmount <= 0) {
    throw buildPaymentCodeError("This payment code has no remaining balance.");
  }

  const applicableAmount = Math.min(Number(subtotal || 0), availableAmount);
  if (applicableAmount <= 0) {
    throw buildPaymentCodeError("Payment code cannot be applied to this order.");
  }

  return {
    codeDoc,
    applicableAmount,
  };
}

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const {
      shippingAddress,
      items = [],
      paymentMethod: rawPaymentMethod,
      paymentCode,
      giftCardCode,
      giftCode,
    } = req.body || {};
    const resolvedPaymentCode = paymentCode || giftCardCode || giftCode;
    const paymentMethod = normalizePaymentMethod(rawPaymentMethod);
    const shippingError = validateShipping(shippingAddress || {});
    if (shippingError) {
      return res.status(400).json({ message: shippingError });
    }

    let sourceItems = items;
    if (!Array.isArray(sourceItems) || sourceItems.length === 0) {
      const cart = await Cart.findOne({ userId: req.user._id });
      sourceItems = (cart?.items || []).map((item) => ({
        productId: item.productId,
        qty: item.qty,
      }));
    }

    const orderItems = await buildOrderItems(sourceItems);
    if (!orderItems.length) {
      return res.status(400).json({ message: "No valid items found for order" });
    }

    const subtotal = orderItems.reduce((sum, item) => sum + item.lineTotal, 0);
    const paymentCodeContext = await resolvePaymentCodeForOrder({
      rawPaymentCode: resolvedPaymentCode,
      user: req.user,
      subtotal,
    });
    const discount = Number(paymentCodeContext?.applicableAmount || 0);
    const total = Math.max(subtotal - discount, 0);
    const { orderStatus, payment } = resolveOrderStatusAndPayment({
      paymentMethod,
      total,
      paymentCodeContext,
      discount,
    });

    let reservedPaymentCode = false;
    if (paymentCodeContext && discount > 0) {
      const reserveResult = await PaymentCode.updateOne(
        {
          _id: paymentCodeContext.codeDoc._id,
          isActive: true,
          remainingAmount: { $gte: discount },
        },
        {
          $inc: {
            remainingAmount: -discount,
            usageCount: 1,
          },
        }
      );

      if (!reserveResult.modifiedCount) {
        throw buildPaymentCodeError(
          "Payment code balance changed. Please apply the code again before placing order."
        );
      }
      reservedPaymentCode = true;
    }

    let order;
    try {
      order = await Order.create({
        userId: req.user._id,
        items: orderItems,
        subtotal,
        discount,
        total,
        shippingAddress,
        status: orderStatus,
        payment,
      });
    } catch (error) {
      if (reservedPaymentCode && paymentCodeContext && discount > 0) {
        await PaymentCode.updateOne(
          { _id: paymentCodeContext.codeDoc._id },
          {
            $inc: {
              remainingAmount: discount,
              usageCount: -1,
            },
          }
        );
      }
      throw error;
    }

    if (reservedPaymentCode && paymentCodeContext && discount > 0) {
      await PaymentCode.updateOne(
        { _id: paymentCodeContext.codeDoc._id },
        {
          $push: {
            redemptions: {
              orderId: order._id,
              userId: req.user._id,
              email: String(req.user.email || "").toLowerCase().trim(),
              amount: discount,
              usedAt: new Date(),
            },
          },
        }
      );
    }

    await Cart.updateOne({ userId: req.user._id }, { $set: { items: [] } });

    res.status(201).json({
      order,
      paymentSummary: {
        paymentMethod,
        paymentProvider: order.payment?.provider || payment.provider,
        giftCodeApplied: order.payment?.paymentCode || "",
        giftAppliedAmount: Number(order.payment?.giftAppliedAmount || 0),
        payableAmount: total,
        isFullyPaid: total <= 0 || order.payment?.paymentStatus === "paid",
        requiresOnlinePayment: paymentMethod === "razorpay" && total > 0,
      },
    });
  })
);

router.get(
  "/my",
  asyncHandler(async (req, res) => {
    const orders = await Order.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json({ orders });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id).populate("items.productId", "name imageUrls");
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    const isOwner = String(order.userId) === String(req.user._id);
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Not allowed to access this order" });
    }
    res.json({ order });
  })
);

module.exports = router;
