const mongoose = require("mongoose");

const supplierSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, default: "", trim: true },
    address: { type: String, default: "", trim: true },
    city: { type: String, default: "", trim: true },
  },
  { timestamps: true, collection: "suppliers" },
);

module.exports = mongoose.model("Supplier", supplierSchema);
