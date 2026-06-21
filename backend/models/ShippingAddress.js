const mongoose = require("mongoose");

const shippingAddressSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    postalCode: { type: String, default: "", trim: true },
    addressLine: { type: String, required: true, trim: true },
    landmark: { type: String, default: "", trim: true },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true, collection: "shippingAddresses" },
);

module.exports = mongoose.model("ShippingAddress", shippingAddressSchema);
