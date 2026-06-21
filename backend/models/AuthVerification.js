const mongoose = require("mongoose");

const authVerificationSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    purpose: { type: String, required: true, enum: ["register", "login", "pos-login"] },
    otpHash: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    verifiedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: "authVerifications" },
);

module.exports = mongoose.model("AuthVerification", authVerificationSchema);
