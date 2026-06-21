const mongoose = require("mongoose");

const returnSchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items: [
      {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
        name: { type: String, required: true, trim: true },
        quantity: { type: Number, required: true, min: 1 },
      },
    ],
    reason: { type: String, required: true, trim: true },
    status: { type: String, enum: ["requested", "approved", "rejected", "received", "refunded"], default: "requested" },
    requestedAt: { type: Date, default: Date.now },
  },
  { timestamps: true, collection: "returns" },
);

module.exports = mongoose.model("Return", returnSchema);
