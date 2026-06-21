const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ["active", "ordered", "abandoned"], default: "active" },
  },
  { timestamps: true, collection: "cart" },
);

module.exports = mongoose.model("Cart", cartSchema);
