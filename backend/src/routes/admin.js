/**
 * Admin routes
 * ------------
 * Centralized role-protected CRUD endpoints for catalog, hiring, orders and content entities.
 *
 * Added in this revision:
 * - Product/business report exports in Excel and PDF.
 * - Shared date/status filters for both order table and export pipelines.
 * - Report payloads designed for business operations:
 *   product name/id, quantity, customer details, payment mode/status, price paid.
 */
const express = require("express");
const mongoose = require("mongoose");
const XLSX = require("xlsx");
const PDFDocument = require("pdfkit");
const Category = require("../models/Category");
const Product = require("../models/Product");
const Service = require("../models/Service");
const Brand = require("../models/Brand");
const Offer = require("../models/Offer");
const JobPost = require("../models/JobPost");
const JobApplication = require("../models/JobApplication");
const Order = require("../models/Order");
const Faq = require("../models/Faq");
const Testimonial = require("../models/Testimonial");
const Banner = require("../models/Banner");
const PageContent = require("../models/PageContent");
const SiteSetting = require("../models/SiteSetting");
const PaymentCode = require("../models/PaymentCode");
const { requireAuth, requireRole } = require("../middleware/auth");
const { requireDatabase } = require("../middleware/requireDatabase");
const { asyncHandler } = require("../utils/asyncHandler");
const { slugify } = require("../utils/slugify");

const router = express.Router();
router.use(requireDatabase, requireAuth, requireRole("admin"));

const ORDER_STATUSES = ["pending", "paid", "processing", "shipped", "delivered", "cancelled"];
const OFFLINE_PAYMENT_MODES = new Set(["cash", "online"]);
const OFFLINE_NAME_REGEX = /^[A-Za-z][A-Za-z .'-]{1,79}$/;
const OFFLINE_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OFFLINE_PHONE_REGEX = /^\d{10}$/;
const OFFLINE_POSTAL_REGEX = /^[A-Za-z0-9 -]{4,10}$/;

const SALES_REPORT_COLUMNS = [
  { key: "serial", title: "S.No", excelWidth: 8, pdfWidth: 36, align: "right" },
  { key: "orderId", title: "Order ID", excelWidth: 28, pdfWidth: 120 },
  { key: "orderDate", title: "Order Date", excelWidth: 18, pdfWidth: 76 },
  { key: "productName", title: "Product Name", excelWidth: 30, pdfWidth: 130 },
  { key: "productId", title: "Product ID", excelWidth: 28, pdfWidth: 110 },
  { key: "quantity", title: "Quantity", excelWidth: 10, pdfWidth: 48, align: "right" },
  { key: "unitPrice", title: "Unit Price (INR)", excelWidth: 16, pdfWidth: 72, align: "right" },
  { key: "lineTotal", title: "Line Total (INR)", excelWidth: 16, pdfWidth: 74, align: "right" },
  { key: "customerName", title: "Customer Name", excelWidth: 22, pdfWidth: 110 },
  { key: "customerDetails", title: "Customer Details", excelWidth: 36, pdfWidth: 180 },
  { key: "paymentMode", title: "Payment Mode", excelWidth: 14, pdfWidth: 78 },
  { key: "paymentStatus", title: "Payment Status", excelWidth: 14, pdfWidth: 70 },
  { key: "orderStatus", title: "Order Status", excelWidth: 14, pdfWidth: 70 },
  { key: "pricePaid", title: "Price Paid (INR)", excelWidth: 16, pdfWidth: 82, align: "right" },
];

const INVENTORY_REPORT_COLUMNS = [
  { key: "serial", title: "S.No", excelWidth: 8, pdfWidth: 36, align: "right" },
  { key: "productId", title: "Product ID", excelWidth: 28, pdfWidth: 120 },
  { key: "productName", title: "Product Name", excelWidth: 30, pdfWidth: 150 },
  { key: "categoryName", title: "Category", excelWidth: 20, pdfWidth: 90 },
  { key: "brand", title: "Brand", excelWidth: 16, pdfWidth: 80 },
  { key: "price", title: "Price (INR)", excelWidth: 14, pdfWidth: 70, align: "right" },
  { key: "mrp", title: "MRP (INR)", excelWidth: 14, pdfWidth: 70, align: "right" },
  { key: "stock", title: "Stock Qty", excelWidth: 12, pdfWidth: 60, align: "right" },
  { key: "stockValue", title: "Stock Value (INR)", excelWidth: 18, pdfWidth: 92, align: "right" },
  { key: "isActive", title: "Active", excelWidth: 10, pdfWidth: 52 },
  { key: "updatedAt", title: "Updated At", excelWidth: 20, pdfWidth: 90 },
];

function buildSearchFilter(search, fields = []) {
  if (!search || !fields.length) return {};
  return {
    $or: fields.map((field) => ({
      [field]: { $regex: String(search).trim(), $options: "i" },
    })),
  };
}

/**
 * Generic CRUD generator
 * ----------------------
 * Keeps route code concise while preserving per-resource sorting/search behavior.
 */
function createCrudRoutes(path, Model, options = {}) {
  const {
    searchFields = [],
    slugField = null,
    populate = "",
    defaultSort = { createdAt: -1 },
    transformPayload = null,
  } = options;

  router.get(
    `/${path}`,
    asyncHandler(async (req, res) => {
      const { page = 1, limit = 20, search = "" } = req.query;
      const safePage = Math.max(Number(page) || 1, 1);
      const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
      const filter = buildSearchFilter(search, searchFields);
      const totalItems = await Model.countDocuments(filter);
      const data = await Model.find(filter)
        .sort(defaultSort)
        .skip((safePage - 1) * safeLimit)
        .limit(safeLimit)
        .populate(populate);
      res.json({
        data,
        pagination: {
          page: safePage,
          limit: safeLimit,
          totalItems,
          totalPages: Math.ceil(totalItems / safeLimit) || 1,
        },
      });
    })
  );

  router.get(
    `/${path}/:id`,
    asyncHandler(async (req, res) => {
      const data = await Model.findById(req.params.id).populate(populate);
      if (!data) return res.status(404).json({ message: `${path} item not found` });
      res.json({ data });
    })
  );

  router.post(
    `/${path}`,
    asyncHandler(async (req, res) => {
      const payload = { ...(req.body || {}) };
      if (slugField) {
        const source = payload[slugField] || payload.name || payload.title;
        payload[slugField] = slugify(source);
      }
      if (typeof transformPayload === "function") {
        transformPayload(payload);
      }
      const data = await Model.create(payload);
      res.status(201).json({ data });
    })
  );

  router.patch(
    `/${path}/:id`,
    asyncHandler(async (req, res) => {
      const payload = { ...(req.body || {}) };
      if (slugField && (payload.name || payload.title || payload[slugField])) {
        payload[slugField] = slugify(payload[slugField] || payload.name || payload.title);
      }
      if (typeof transformPayload === "function") {
        transformPayload(payload);
      }
      const data = await Model.findByIdAndUpdate(req.params.id, payload, {
        new: true,
        runValidators: true,
      });
      if (!data) return res.status(404).json({ message: `${path} item not found` });
      res.json({ data });
    })
  );

  router.delete(
    `/${path}/:id`,
    asyncHandler(async (req, res) => {
      const data = await Model.findByIdAndDelete(req.params.id);
      if (!data) return res.status(404).json({ message: `${path} item not found` });
      res.json({ message: "Deleted successfully" });
    })
  );
}

function parseDateInput(rawDate, endOfDay = false) {
  if (!rawDate) return null;
  const parsed = new Date(rawDate);
  if (Number.isNaN(parsed.getTime())) {
    const error = new Error(`Invalid date value: ${rawDate}`);
    error.statusCode = 400;
    throw error;
  }
  if (endOfDay) {
    parsed.setHours(23, 59, 59, 999);
  } else {
    parsed.setHours(0, 0, 0, 0);
  }
  return parsed;
}

/**
 * Shared date/status filter parser for order listing and exports.
 * Query params:
 * - status: optional, one of ORDER_STATUSES.
 * - from: optional, ISO-like date.
 * - to: optional, ISO-like date.
 */
function buildOrderFilterFromQuery(query = {}) {
  const filter = {};
  if (query.status) {
    if (!ORDER_STATUSES.includes(query.status)) {
      const error = new Error(`status must be one of: ${ORDER_STATUSES.join(", ")}`);
      error.statusCode = 400;
      throw error;
    }
    filter.status = query.status;
  }

  const fromDate = parseDateInput(query.from, false);
  const toDate = parseDateInput(query.to, true);
  if (fromDate || toDate) {
    filter.createdAt = {};
    if (fromDate) filter.createdAt.$gte = fromDate;
    if (toDate) filter.createdAt.$lte = toDate;
  }
  return filter;
}

function normalizeOfflinePaymentMode(rawMode) {
  const mode = String(rawMode || "cash")
    .trim()
    .toLowerCase();
  return OFFLINE_PAYMENT_MODES.has(mode) ? mode : "cash";
}

function normalizeShippingAddress(input = {}) {
  return {
    fullName: String(input.fullName || "").trim(),
    email: String(input.email || "")
      .trim()
      .toLowerCase(),
    phone: String(input.phone || "").trim(),
    line1: String(input.line1 || "").trim(),
    line2: String(input.line2 || "").trim(),
    city: String(input.city || "").trim(),
    state: String(input.state || "").trim(),
    pincode: String(input.pincode || "").trim(),
    country: String(input.country || "India").trim() || "India",
  };
}

function validateShippingAddressInput(shippingAddress = {}) {
  const required = [
    { key: "fullName", message: "Please enter the customer's full name." },
    { key: "email", message: "Please enter the customer's email address." },
    { key: "phone", message: "Please enter the customer's phone number." },
    { key: "line1", message: "Please enter address line 1." },
    { key: "city", message: "Please enter the city." },
    { key: "state", message: "Please enter the state." },
    { key: "pincode", message: "Please enter the postal code." },
    { key: "country", message: "Please enter the country." },
  ];
  for (const field of required) {
    if (!shippingAddress[field.key]) {
      return field.message;
    }
  }

  if (!OFFLINE_NAME_REGEX.test(shippingAddress.fullName)) {
    return "Please enter a valid full name (letters, spaces, apostrophes, periods, and hyphens only).";
  }
  if (!OFFLINE_EMAIL_REGEX.test(shippingAddress.email)) {
    return "Please enter a valid customer email address.";
  }
  if (!OFFLINE_PHONE_REGEX.test(shippingAddress.phone)) {
    return "Please enter a valid 10-digit phone number (numbers only).";
  }
  if (!OFFLINE_POSTAL_REGEX.test(shippingAddress.pincode)) {
    return "Please enter a valid postal code (4 to 10 characters).";
  }

  return null;
}

async function buildOfflineOrderItems(itemsInput = []) {
  const quantityByProductId = new Map();

  (Array.isArray(itemsInput) ? itemsInput : []).forEach((item) => {
    const productId = String(item?.productId || "").trim();
    const qty = Math.max(Number(item?.qty) || 0, 0);
    if (!productId || qty <= 0 || !mongoose.Types.ObjectId.isValid(productId)) return;
    quantityByProductId.set(productId, (quantityByProductId.get(productId) || 0) + qty);
  });

  if (!quantityByProductId.size) return [];

  const products = await Product.find({
    _id: { $in: Array.from(quantityByProductId.keys()) },
    isActive: true,
  }).select("_id name price");

  const productById = products.reduce((map, product) => {
    map[String(product._id)] = product;
    return map;
  }, {});

  const orderItems = [];
  quantityByProductId.forEach((qty, productId) => {
    const product = productById[productId];
    if (!product) return;
    orderItems.push({
      productId: product._id,
      name: product.name,
      qty,
      unitPrice: product.price,
      lineTotal: Number(product.price) * qty,
    });
  });

  return orderItems;
}

function safeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function formatCurrencyLabel(value) {
  return `INR ${safeNumber(value).toFixed(2)}`;
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toISOString().replace("T", " ").slice(0, 16);
}

function buildAddressText(shipping = {}) {
  const parts = [
    shipping.line1,
    shipping.line2,
    shipping.city,
    shipping.state,
    shipping.pincode,
    shipping.country,
  ].filter(Boolean);
  return parts.join(", ");
}

function getFileDateSuffix() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Converts generic rows into a user-friendly sheet table.
 * Titles are controlled by the `columns` mapping to guarantee consistent export headers.
 */
function toSheetRows(rows, columns) {
  return rows.map((row) => {
    const shaped = {};
    columns.forEach((column) => {
      shaped[column.title] = row[column.key];
    });
    return shaped;
  });
}

function sendExcelReport(res, options) {
  const { fileName, sheetName, columns, rows } = options;
  const workbook = XLSX.utils.book_new();
  const sheetRows = toSheetRows(rows, columns);
  const worksheet = XLSX.utils.json_to_sheet(
    sheetRows.length ? sheetRows : [{ Notice: "No matching records found for selected filters." }]
  );
  worksheet["!cols"] = columns.map((column) => ({ wch: column.excelWidth || 14 }));
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  const buffer = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
    compression: true,
  });

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  res.send(buffer);
}

/**
 * PDF table renderer
 * ------------------
 * Inputs:
 * - columns: [{ key, title, pdfWidth, align }]
 * - rows: flat array of primitive values by key.
 *
 * Side effects:
 * - Writes directly to `res` stream.
 * - Handles pagination and repeats table header per page.
 */
function sendPdfReport(res, options) {
  const { fileName, title, subtitle, columns, rows, size = "A4", summary = [] } = options;
  const doc = new PDFDocument({ size, layout: "landscape", margin: 24 });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  doc.pipe(res);
  const usableTableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const requestedTableWidth = columns.reduce((sum, column) => sum + (column.pdfWidth || 80), 0);
  const widthScale = requestedTableWidth > usableTableWidth ? usableTableWidth / requestedTableWidth : 1;
  let consumedWidth = 0;
  const tableColumns = columns.map((column, index) => {
    let renderWidth = Math.floor((column.pdfWidth || 80) * widthScale);
    if (index === columns.length - 1) {
      renderWidth = usableTableWidth - consumedWidth;
    } else {
      consumedWidth += renderWidth;
    }
    return { ...column, renderWidth };
  });
  const tableFontSize = widthScale < 0.72 ? 7 : 8;

  const drawHeader = (y) => {
    const left = doc.page.margins.left;
    const usableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    doc.save();
    doc.roundedRect(left, y, usableWidth, 44, 8).fill("#0b2747");
    doc.restore();
    doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(16).text(title, left + 12, y + 8);
    doc.font("Helvetica").fontSize(9).text(subtitle, left + 12, y + 28);
    return y + 56;
  };

  const drawTableHead = (y) => {
    let x = doc.page.margins.left;
    tableColumns.forEach((column) => {
      doc.save();
      doc.rect(x, y, column.renderWidth, 18).fill("#133a63");
      doc.restore();
      doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(tableFontSize).text(column.title, x + 3, y + 5, {
        width: column.renderWidth - 6,
        ellipsis: true,
      });
      x += column.renderWidth;
    });
    return y + 18;
  };

  const drawSummaryBand = (y) => {
    if (!Array.isArray(summary) || !summary.length) return y;
    const left = doc.page.margins.left;
    const boxGap = 8;
    const totalWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const boxWidth = (totalWidth - boxGap * 2) / 3;
    let currentY = y;

    summary.forEach((item, index) => {
      const column = index % 3;
      if (column === 0 && index !== 0) {
        currentY += 30;
      }
      const x = left + column * (boxWidth + boxGap);

      doc.save();
      doc.roundedRect(x, currentY, boxWidth, 24, 5).fill("#eef5fd");
      doc.restore();
      doc.fillColor("#0e3559").font("Helvetica-Bold").fontSize(8).text(item.label, x + 6, currentY + 5, {
        width: boxWidth - 12,
        ellipsis: true,
      });
      doc.fillColor("#0e3559").font("Helvetica").fontSize(8).text(item.value, x + 6, currentY + 14, {
        width: boxWidth - 12,
        ellipsis: true,
      });
    });

    const rowsUsed = Math.ceil(summary.length / 3);
    return currentY + 30 + (rowsUsed > 1 ? 0 : 0);
  };

  const rowHeight = 18;
  let y = drawHeader(doc.page.margins.top);
  y = drawSummaryBand(y);
  y = drawTableHead(y);

  if (!rows.length) {
    doc.fillColor("#1b3553").font("Helvetica").fontSize(11).text("No matching records found.", doc.page.margins.left, y + 12);
    doc.end();
    return;
  }

  rows.forEach((row) => {
    const limitY = doc.page.height - doc.page.margins.bottom - rowHeight;
    if (y > limitY) {
      doc.addPage();
      y = drawHeader(doc.page.margins.top);
      y = drawSummaryBand(y);
      y = drawTableHead(y);
    }

    let x = doc.page.margins.left;
    tableColumns.forEach((column) => {
      const raw = row[column.key];
      const value = raw === undefined || raw === null || raw === "" ? "-" : String(raw);
      doc.fillColor("#183754").font("Helvetica").fontSize(tableFontSize).text(value, x + 3, y + 5, {
        width: column.renderWidth - 6,
        align: column.align || "left",
        ellipsis: true,
      });
      x += column.renderWidth;
    });

    doc.save();
    doc.moveTo(doc.page.margins.left, y + rowHeight)
      .lineTo(doc.page.width - doc.page.margins.right, y + rowHeight)
      .lineWidth(0.4)
      .strokeColor("#dbe7f3")
      .stroke();
    doc.restore();
    y += rowHeight;
  });

  doc.end();
}

function buildSalesReportRows(orders = []) {
  const rows = [];
  let serial = 1;

  orders.forEach((order) => {
    const items = Array.isArray(order.items) ? order.items : [];
    const customerName = order.shippingAddress?.fullName || order.userId?.name || "-";
    const customerEmail = order.shippingAddress?.email || order.userId?.email || "";
    const customerPhone = order.shippingAddress?.phone || order.userId?.phone || "";
    const address = buildAddressText(order.shippingAddress);
    const customerDetails = [customerEmail, customerPhone, address].filter(Boolean).join(" | ");

    items.forEach((item) => {
      const productRef = item.productId?._id ? String(item.productId._id) : String(item.productId || "-");
      rows.push({
        serial,
        orderId: String(order._id),
        orderDate: formatDateTime(order.createdAt),
        productName: item.name || item.productId?.name || "-",
        productId: productRef,
        quantity: safeNumber(item.qty),
        unitPrice: safeNumber(item.unitPrice).toFixed(2),
        lineTotal: safeNumber(item.lineTotal).toFixed(2),
        customerName,
        customerDetails: customerDetails || "-",
        paymentMode: String(order.payment?.provider || "N/A").toUpperCase(),
        paymentStatus: order.payment?.paymentStatus || "unpaid",
        orderStatus: order.status || "pending",
        pricePaid: safeNumber(order.total).toFixed(2),
      });
      serial += 1;
    });
  });

  return rows;
}

function buildInventoryReportRows(products = []) {
  return products.map((product, index) => {
    const stock = safeNumber(product.stock);
    const price = safeNumber(product.price);
    return {
      serial: index + 1,
      productId: String(product._id),
      productName: product.name || "-",
      categoryName: product.categoryId?.name || "-",
      brand: product.brand || "-",
      price: price.toFixed(2),
      mrp: safeNumber(product.mrp).toFixed(2),
      stock,
      stockValue: (stock * price).toFixed(2),
      isActive: product.isActive ? "Yes" : "No",
      updatedAt: formatDateTime(product.updatedAt),
    };
  });
}

createCrudRoutes("categories", Category, {
  searchFields: ["name", "slug"],
  slugField: "slug",
  defaultSort: { sortOrder: 1, name: 1 },
});

createCrudRoutes("products", Product, {
  searchFields: ["name", "slug", "brand", "description"],
  slugField: "slug",
  populate: "categoryId",
  defaultSort: { createdAt: -1 },
});

createCrudRoutes("services", Service, {
  searchFields: ["title", "description"],
  defaultSort: { createdAt: -1 },
});

createCrudRoutes("brands", Brand, {
  searchFields: ["name"],
  defaultSort: { sortOrder: 1, name: 1 },
});

createCrudRoutes("offers", Offer, {
  searchFields: ["title", "subtitle", "promoCode"],
  defaultSort: { discountPercent: -1 },
});

createCrudRoutes("jobs", JobPost, {
  searchFields: ["title", "department", "skillSummary"],
  defaultSort: { sortOrder: 1, createdAt: -1 },
});

createCrudRoutes("faqs", Faq, {
  searchFields: ["question", "answer", "category"],
  defaultSort: { category: 1, sortOrder: 1 },
});

createCrudRoutes("testimonials", Testimonial, {
  searchFields: ["name", "role", "quote"],
  defaultSort: { sortOrder: 1, createdAt: -1 },
});

createCrudRoutes("banners", Banner, {
  searchFields: ["title", "subtitle", "placement"],
  defaultSort: { placement: 1, sortOrder: 1 },
});

createCrudRoutes("pages", PageContent, {
  searchFields: ["slug", "title", "richText"],
  slugField: "slug",
  populate: "faqRefs",
  defaultSort: { slug: 1 },
});

createCrudRoutes("site-settings", SiteSetting, {
  searchFields: ["key", "group"],
  defaultSort: { group: 1, key: 1 },
});

createCrudRoutes("payment-codes", PaymentCode, {
  searchFields: ["code", "title", "assignedEmail"],
  defaultSort: { createdAt: -1 },
  transformPayload: (payload) => {
    if (payload.code !== undefined) {
      payload.code = String(payload.code || "")
        .trim()
        .toUpperCase();
    }
    if (payload.assignedEmail !== undefined) {
      payload.assignedEmail = String(payload.assignedEmail || "")
        .trim()
        .toLowerCase();
    }
    if (payload.initialAmount !== undefined) {
      payload.initialAmount = Math.max(Number(payload.initialAmount) || 0, 0);
    }
    if (payload.remainingAmount !== undefined) {
      payload.remainingAmount = Math.max(Number(payload.remainingAmount) || 0, 0);
    }
    if (payload.remainingAmount === undefined && payload.initialAmount !== undefined) {
      payload.remainingAmount = payload.initialAmount;
    }
    if (payload.expiresAt === "") {
      payload.expiresAt = null;
    }
  },
});

router.get(
  "/job-applications",
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 20 } = req.query;
    const safePage = Math.max(Number(page) || 1, 1);
    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const totalItems = await JobApplication.countDocuments();
    const applications = await JobApplication.find()
      .populate("jobId", "title department")
      .sort({ createdAt: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit);
    res.json({
      applications,
      pagination: {
        page: safePage,
        limit: safeLimit,
        totalItems,
        totalPages: Math.ceil(totalItems / safeLimit) || 1,
      },
    });
  })
);

router.get(
  "/orders",
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 20 } = req.query;
    const safePage = Math.max(Number(page) || 1, 1);
    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const filter = buildOrderFilterFromQuery(req.query);

    const totalItems = await Order.countDocuments(filter);
    const orders = await Order.find(filter)
      .populate("userId", "name email role")
      .sort({ createdAt: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit);

    res.json({
      orders,
      pagination: {
        page: safePage,
        limit: safeLimit,
        totalItems,
        totalPages: Math.ceil(totalItems / safeLimit) || 1,
      },
    });
  })
);

router.post(
  "/offline-orders",
  asyncHandler(async (req, res) => {
    const { shippingAddress, items = [], paymentMode: rawPaymentMode, markPaid = true } = req.body || {};
    const normalizedShipping = normalizeShippingAddress(shippingAddress || {});
    const shippingError = validateShippingAddressInput(normalizedShipping);
    if (shippingError) {
      return res.status(400).json({ message: shippingError });
    }

    const orderItems = await buildOfflineOrderItems(items);
    if (!orderItems.length) {
      return res.status(400).json({ message: "At least one valid active product is required" });
    }

    const subtotal = orderItems.reduce((sum, item) => sum + safeNumber(item.lineTotal), 0);
    const total = subtotal;
    const paymentMode = normalizeOfflinePaymentMode(rawPaymentMode);
    const isPaidNow = markPaid !== false;
    const provider = paymentMode === "cash" ? "cash" : "online";
    const paymentStatus = isPaidNow ? "paid" : "unpaid";
    const orderStatus = isPaidNow ? "paid" : "processing";

    const order = await Order.create({
      userId: req.user._id,
      items: orderItems,
      subtotal,
      discount: 0,
      total,
      shippingAddress: normalizedShipping,
      status: orderStatus,
      payment: {
        provider,
        paymentStatus,
      },
    });

    res.status(201).json({
      message: "Offline store order created successfully",
      order,
      paymentSummary: {
        paymentMode,
        paymentProvider: provider,
        paymentStatus,
        markedPaid: isPaidNow,
      },
    });
  })
);

router.patch(
  "/orders/:id/status",
  asyncHandler(async (req, res) => {
    const { status } = req.body || {};
    if (!ORDER_STATUSES.includes(status)) {
      return res.status(400).json({ message: `status must be one of: ${ORDER_STATUSES.join(", ")}` });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json({ order });
  })
);

/**
 * Sales reports:
 * - Excel and PDF output with flattened order item rows.
 * - Includes customer and payment columns required by business ops.
 */
router.get(
  "/reports/sales.xlsx",
  asyncHandler(async (req, res) => {
    const filter = buildOrderFilterFromQuery(req.query);
    const orders = await Order.find(filter)
      .populate("userId", "name email phone")
      .populate("items.productId", "name")
      .sort({ createdAt: -1 });
    const rows = buildSalesReportRows(orders);
    sendExcelReport(res, {
      fileName: `shivam-sales-report-${getFileDateSuffix()}.xlsx`,
      sheetName: "Sales Report",
      columns: SALES_REPORT_COLUMNS,
      rows,
    });
  })
);

router.get(
  "/reports/sales.pdf",
  asyncHandler(async (req, res) => {
    const filter = buildOrderFilterFromQuery(req.query);
    const orders = await Order.find(filter)
      .populate("userId", "name email phone")
      .populate("items.productId", "name")
      .sort({ createdAt: -1 });
    const rows = buildSalesReportRows(orders);
    const totalQuantity = rows.reduce((sum, row) => sum + safeNumber(row.quantity), 0);
    const totalLineAmount = rows.reduce((sum, row) => sum + safeNumber(row.lineTotal), 0);
    const totalRevenue = orders.reduce((sum, order) => sum + safeNumber(order.total), 0);
    sendPdfReport(res, {
      fileName: `shivam-sales-report-${getFileDateSuffix()}.pdf`,
      title: "Shivam Sports - Sales Report",
      subtitle: `Generated: ${formatDateTime(new Date())} | Rows: ${rows.length}`,
      columns: SALES_REPORT_COLUMNS,
      rows,
      summary: [
        { label: "Total Orders", value: String(orders.length) },
        { label: "Total Quantity Sold", value: String(totalQuantity) },
        { label: "Order Revenue", value: formatCurrencyLabel(totalRevenue) },
        { label: "Item Line Total", value: formatCurrencyLabel(totalLineAmount) },
        { label: "Status Filter", value: req.query.status || "All" },
        {
          label: "Date Range",
          value: `${req.query.from || "Beginning"} to ${req.query.to || "Today"}`,
        },
      ],
      size: "A3",
    });
  })
);

/**
 * Inventory reports:
 * - Product-centric stock and valuation snapshot.
 * - `onlyLowStock=true&lowStock=10` can be used to inspect low inventory quickly.
 */
router.get(
  "/reports/inventory.xlsx",
  asyncHandler(async (req, res) => {
    const filter = {};
    if (req.query.onlyLowStock === "true") {
      const threshold = Math.max(Number(req.query.lowStock) || 10, 0);
      filter.stock = { $lte: threshold };
    }

    const products = await Product.find(filter).populate("categoryId", "name").sort({ name: 1 });
    const rows = buildInventoryReportRows(products);
    sendExcelReport(res, {
      fileName: `shivam-inventory-report-${getFileDateSuffix()}.xlsx`,
      sheetName: "Inventory Report",
      columns: INVENTORY_REPORT_COLUMNS,
      rows,
    });
  })
);

router.get(
  "/reports/inventory.pdf",
  asyncHandler(async (req, res) => {
    const filter = {};
    if (req.query.onlyLowStock === "true") {
      const threshold = Math.max(Number(req.query.lowStock) || 10, 0);
      filter.stock = { $lte: threshold };
    }

    const products = await Product.find(filter).populate("categoryId", "name").sort({ name: 1 });
    const rows = buildInventoryReportRows(products);
    const totalStock = rows.reduce((sum, row) => sum + safeNumber(row.stock), 0);
    const totalStockValue = rows.reduce((sum, row) => sum + safeNumber(row.stockValue), 0);
    const lowStockCount = rows.filter((row) => safeNumber(row.stock) <= 10).length;
    sendPdfReport(res, {
      fileName: `shivam-inventory-report-${getFileDateSuffix()}.pdf`,
      title: "Shivam Sports - Inventory Report",
      subtitle: `Generated: ${formatDateTime(new Date())} | Products: ${rows.length}`,
      columns: INVENTORY_REPORT_COLUMNS,
      rows,
      summary: [
        { label: "Total Products", value: String(rows.length) },
        { label: "Total Stock Units", value: String(totalStock) },
        { label: "Stock Value", value: formatCurrencyLabel(totalStockValue) },
        { label: "Low Stock (<=10)", value: String(lowStockCount) },
        {
          label: "Low Stock Filter",
          value: req.query.onlyLowStock === "true" ? "Applied" : "Not Applied",
        },
      ],
      size: "A4",
    });
  })
);

module.exports = router;
