const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
{
  name: {
    type: String,
    required: true
  },
  brand: {
    type: String,
    default: "Universal",
    trim: true,
  },
  brandId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Brand",
    default: null,
  },
  price: {
    type: Number,
    required: true
  },
  image: {
    type: String,
    default: "",
    trim: true,
  },
  description: {
    type: String,
    default: "",
    trim: true,
  },
  sku: {
    type: String,
    default: "",
    trim: true,
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    required: true
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    default: null,
  },
  stock: {
    type: Number,
    default: 0
  },
  soldCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  discountPercent: {
    type: Number,
    default: 0,
    min: 0,
    max: 90,
  },
  isDealActive: {
    type: Boolean,
    default: false,
  },
  dealTitle: {
    type: String,
    default: "",
    trim: true,
  },
  dealEndsAt: {
    type: Date,
    default: null,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  specs: {
    type: [String],
    default: [],
  }
},
{ timestamps: true, collection: "products" }
);

module.exports = mongoose.model("Product", productSchema);
