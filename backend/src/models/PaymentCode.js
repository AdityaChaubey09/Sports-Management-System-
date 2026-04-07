const mongoose = require("mongoose");

const redemptionSchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    usedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const paymentCodeSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, trim: true, uppercase: true, index: true },
    title: { type: String, default: "", trim: true, maxlength: 160 },
    description: { type: String, default: "", trim: true, maxlength: 600 },
    assignedEmail: { type: String, default: "", lowercase: true, trim: true, index: true },
    currency: { type: String, default: "INR", trim: true, maxlength: 8 },
    initialAmount: { type: Number, required: true, min: 0 },
    remainingAmount: { type: Number, default: null, min: 0 },
    usageCount: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true, index: true },
    expiresAt: { type: Date, default: null, index: true },
    redemptions: [redemptionSchema],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

paymentCodeSchema.pre("validate", function onValidate(next) {
  if (this.remainingAmount === null || this.remainingAmount === undefined) {
    this.remainingAmount = Number(this.initialAmount || 0);
  }
  if (this.code) {
    this.code = String(this.code).trim().toUpperCase();
  }
  if (this.assignedEmail) {
    this.assignedEmail = String(this.assignedEmail).trim().toLowerCase();
  }
  next();
});

module.exports = mongoose.model("PaymentCode", paymentCodeSchema);
