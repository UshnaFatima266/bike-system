const mongoose = require("mongoose");

const purchaseItemSchema = new mongoose.Schema(
  {
    purchaseId: { type: mongoose.Schema.Types.ObjectId, ref: "Purchase", required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    quantity: { type: Number, required: true, min: 1 },
    costPrice: { type: Number, required: true, min: 0 },
    subtotal: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true, collection: "purchaseItems" },
);

module.exports = mongoose.model("PurchaseItem", purchaseItemSchema);
