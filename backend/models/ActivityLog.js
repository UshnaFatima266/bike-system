const mongoose = require("mongoose");

const activityLogSchema = new mongoose.Schema(
  {
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    actorName: { type: String, default: "System", trim: true },
    actorRole: { type: String, default: "system", trim: true },
    action: { type: String, required: true, trim: true },
    module: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, collection: "activityLogs" },
);

module.exports = mongoose.model("ActivityLog", activityLogSchema);
