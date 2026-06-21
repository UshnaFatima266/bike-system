const mongoose = require("mongoose");

const stockMovementSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    type: { type: String, enum: ["in", "out", "adjustment", "return"], required: true },
    quantity: { type: Number, required: true, min: 1 },
    referenceType: { type: String, enum: ["purchase", "sale", "return", "manual"], default: "manual" },
    referenceId: { type: mongoose.Schema.Types.ObjectId, default: null },
    movementDate: { type: Date, default: Date.now },
    notes: { type: String, default: "", trim: true },
  },
  { timestamps: true, collection: "stockMovements" },
);

module.exports = mongoose.model("StockMovement", stockMovementSchema);
