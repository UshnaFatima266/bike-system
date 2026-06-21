const mongoose = require("mongoose");

const posSaleItemSchema = new mongoose.Schema(
  {
    posSaleId: { type: mongoose.Schema.Types.ObjectId, ref: "PosSale", required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    name: { type: String, required: true, trim: true },
    sku: { type: String, default: "", trim: true },
    brand: { type: String, default: "", trim: true },
    categoryName: { type: String, default: "", trim: true },
    quantity: { type: Number, required: true, min: 1 },
    quantityReturned: { type: Number, default: 0, min: 0 },
    unitCost: { type: Number, required: true, min: 0, default: 0 },
    unitPrice: { type: Number, required: true, min: 0 },
    discountAmount: { type: Number, default: 0, min: 0 },
    taxAmount: { type: Number, default: 0, min: 0 },
    subtotal: { type: Number, default: 0, min: 0 },
    lineTotal: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true, collection: "posSaleItems" },
);

module.exports = mongoose.model("PosSaleItem", posSaleItemSchema);
