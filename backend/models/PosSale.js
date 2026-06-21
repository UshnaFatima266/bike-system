const mongoose = require("mongoose");

const posSaleSchema = new mongoose.Schema(
  {
    saleDate: { type: Date, required: true },
    cashierId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    saleNumber: { type: String, required: true, trim: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    customerName: { type: String, default: "Walk-in Customer", trim: true },
    customerPhone: { type: String, default: "", trim: true },
    subtotal: { type: Number, required: true, min: 0, default: 0 },
    discountAmount: { type: Number, required: true, min: 0, default: 0 },
    taxAmount: { type: Number, required: true, min: 0, default: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    paymentMethod: { type: String, enum: ["cash", "card", "jazzcash", "easypaisa"], default: "cash" },
    status: { type: String, enum: ["completed", "partially_returned", "returned"], default: "completed" },
    itemsCount: { type: Number, default: 0, min: 0 },
    notes: { type: String, default: "", trim: true },
  },
  { timestamps: true, collection: "posSales" },
);

module.exports = mongoose.model("PosSale", posSaleSchema);
