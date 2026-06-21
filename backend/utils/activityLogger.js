const ActivityLog = require("../models/ActivityLog");

async function logActivity({
  actor = null,
  action,
  module,
  description = "",
  metadata = {},
}) {
  try {
    await ActivityLog.create({
      actorId: actor?._id || actor?.id || null,
      actorName: actor?.name || "System",
      actorRole: actor?.role || "system",
      action,
      module,
      description,
      metadata,
    });
  } catch (error) {
    console.error("Activity log failed:", error.message);
  }
}

module.exports = { logActivity };
