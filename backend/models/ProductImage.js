const mongoose = require("mongoose");

const productImageSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    imageUrl: { type: String, required: true, trim: true },
    altText: { type: String, default: "", trim: true },
    isPrimary: { type: Boolean, default: false },
  },
  { timestamps: true, collection: "productImages" },
);

module.exports = mongoose.model("ProductImage", productImageSchema);
