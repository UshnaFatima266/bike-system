const mongoose = require("mongoose");

const brandSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    logo: { type: String, default: "", trim: true },
  },
  { timestamps: true, collection: "brands" },
);

module.exports = mongoose.model("Brand", brandSchema);
