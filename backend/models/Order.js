const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    shippingAddressId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ShippingAddress",
      required: true,
    },
    orderDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    items: {
      type: [orderItemSchema],
      default: [],
    },
    subtotal: {
      type: Number,
      required: true,
      default: 0,
    },
    shippingFee: {
      type: Number,
      required: true,
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    totals: {
      subtotal: { type: Number, required: true },
      delivery: { type: Number, required: true },
      grandTotal: { type: Number, required: true },
    },
    deliveryPreference: {
      type: String,
      default: "standard-dispatch",
    },
    paymentMethod: {
      type: String,
      default: "cash-on-delivery",
    },
    customer: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      email: { type: String, required: true },
      city: { type: String, required: true },
      postalCode: { type: String, default: "" },
      landmark: { type: String, default: "" },
      address: { type: String, required: true },
      notes: { type: String, default: "" },
    },
    status: {
      type: String,
      enum: ["confirmed", "packed", "shipped", "delivered", "cancelled", "returned"],
      default: "confirmed",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
  },
  { timestamps: true, collection: "orders" },
);

module.exports = mongoose.model("Order", orderSchema);
