/**
 * User model
 * ----------
 * Purpose:
 * - Stores account credentials, role permissions, and lightweight profile fields.
 * - Supports account-centric pages (profile, orders, wishlist) in the premium frontend.
 *
 * Notes:
 * - Password values are stored in `passwordHash` only (never raw password).
 * - `wishlist` stores product references for quick customer personalization.
 * - Additional profile fields are optional so migration from old data remains non-breaking.
 */
const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema(
  {
    fullName: { type: String, default: "" },
    line1: { type: String, default: "" },
    line2: { type: String, default: "" },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    pincode: { type: String, default: "" },
    country: { type: String, default: "India" },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ["customer", "admin"],
      default: "customer",
      index: true,
    },
    phone: { type: String, trim: true, default: "" },
    avatarUrl: { type: String, default: "" },
    bio: { type: String, default: "" },
    dateOfBirth: { type: String, default: "" },
    defaultAddress: { type: addressSchema, default: () => ({}) },
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
