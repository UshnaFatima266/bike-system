const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    subtotal: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true, collection: "orderItems" },
);

module.exports = mongoose.model("OrderItem", orderItemSchema);
