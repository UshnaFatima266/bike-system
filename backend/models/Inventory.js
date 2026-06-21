const mongoose = require("mongoose");

const inventorySchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    quantityOnHand: { type: Number, required: true, min: 0 },
    reorderLevel: { type: Number, default: 0, min: 0 },
    warehouseLocation: { type: String, default: "", trim: true },
  },
  { timestamps: true, collection: "inventory" },
);

module.exports = mongoose.model("Inventory", inventorySchema);
