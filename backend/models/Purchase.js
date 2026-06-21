const mongoose = require("mongoose");

const purchaseSchema = new mongoose.Schema(
  {
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier", required: true },
    purchaseDate: { type: Date, required: true },
    totalAmount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ["pending", "received", "cancelled"], default: "pending" },
    notes: { type: String, default: "", trim: true },
  },
  { timestamps: true, collection: "purchases" },
);

module.exports = mongoose.model("Purchase", purchaseSchema);
