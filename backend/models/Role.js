const mongoose = require("mongoose");

const roleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, enum: ["user", "admin", "manager", "staff"] },
    description: { type: String, default: "", trim: true },
  },
  { timestamps: true, collection: "roles" },
);

module.exports = mongoose.model("Role", roleSchema);
