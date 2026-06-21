const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
    amount: { type: Number, required: true, min: 0 },
    method: { type: String, enum: ["cash_on_delivery", "card", "bank_transfer", "easypaisa", "jazzcash"], required: true },
    status: { type: String, enum: ["pending", "paid", "failed", "refunded"], default: "pending" },
    transactionRef: { type: String, default: "", trim: true },
    paidAt: { type: Date, default: null },
  },
  { timestamps: true, collection: "payments" },
);

module.exports = mongoose.model("Payment", paymentSchema);
