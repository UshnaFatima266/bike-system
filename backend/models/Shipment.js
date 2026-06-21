const mongoose = require("mongoose");

const shipmentSchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
    carrier: { type: String, default: "", trim: true },
    trackingNumber: { type: String, default: "", trim: true },
    status: { type: String, enum: ["pending", "picked", "in_transit", "delivered", "failed"], default: "pending" },
    shippedAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
  },
  { timestamps: true, collection: "shipments" },
);

module.exports = mongoose.model("Shipment", shipmentSchema);
