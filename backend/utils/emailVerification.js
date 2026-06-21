const crypto = require("crypto");
const dns = require("dns").promises;
const nodemailer = require("nodemailer");
const AuthVerification = require("../models/AuthVerification");
const { hashPassword, verifyPassword } = require("./password");

const EMAIL_RULE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const OTP_TTL_MINUTES = Number(process.env.OTP_TTL_MINUTES || 10);

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

async function validateEmailAddress(email) {
  const normalizedEmail = normalizeEmail(email);

  if (!EMAIL_RULE.test(normalizedEmail)) {
    return { ok: false, message: "Enter a valid email address." };
  }

  const domain = normalizedEmail.split("@")[1];

  if (process.env.SKIP_EMAIL_DOMAIN_CHECK === "true") {
    return { ok: true, email: normalizedEmail };
  }

  try {
    const mxRecords = await dns.resolveMx(domain);
    if (!mxRecords.length) {
      return { ok: false, message: "This email domain cannot receive mail." };
    }
  } catch {
    return { ok: false, message: "This email domain could not be verified. Use a real email address." };
  }

  return { ok: true, email: normalizedEmail };
}

function generateOtp() {
  return String(crypto.randomInt(100000, 999999));
}

function getMailTransport() {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

async function sendOtpEmail({ email, otp, purpose }) {
  const transport = getMailTransport();

  if (!transport) {
    throw new Error("Email service is not configured. Add SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS in backend .env.");
  }

  const subject = purpose === "register" ? "BikeX Parts account verification" : "BikeX Parts verification code";

  try {
    await transport.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject,
      text: `Your BikeX Parts verification code is ${otp}. It expires in ${OTP_TTL_MINUTES} minutes.`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.5;color:#0f172a">
          <h2>BikeX Parts verification</h2>
          <p>Use this code to verify your email:</p>
          <p style="font-size:28px;font-weight:700;letter-spacing:6px">${otp}</p>
          <p>This code expires in ${OTP_TTL_MINUTES} minutes.</p>
        </div>
      `,
    });
  } catch (error) {
    if (String(error?.message || "").includes("535")) {
      throw new Error("OTP email could not be sent because Gmail rejected the sender login. Use a Google App Password in SMTP_PASS, not the normal Gmail password.");
    }

    throw new Error(`OTP email could not be sent: ${error.message}`);
  }
}

async function createEmailOtp({ email, purpose, userId = null, payload = {} }) {
  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await AuthVerification.deleteMany({ email, purpose, verifiedAt: null });
  const verification = await AuthVerification.create({
    email,
    purpose,
    otpHash: hashPassword(otp),
    userId,
    payload,
    expiresAt,
  });

  await sendOtpEmail({ email, otp, purpose });

  return {
    verificationId: verification._id,
    expiresAt,
  };
}

async function verifyEmailOtp({ verificationId, otp, purpose }) {
  const verification = await AuthVerification.findById(verificationId);

  if (!verification || verification.purpose !== purpose || verification.verifiedAt) {
    return { ok: false, message: "Invalid or expired verification request." };
  }

  if (verification.expiresAt < new Date()) {
    return { ok: false, message: "OTP expired. Request a new code." };
  }

  if (verification.attempts >= 5) {
    return { ok: false, message: "Too many incorrect OTP attempts. Request a new code." };
  }

  if (!verifyPassword(String(otp || "").trim(), verification.otpHash)) {
    verification.attempts += 1;
    await verification.save();
    return { ok: false, message: "Incorrect OTP code." };
  }

  verification.verifiedAt = new Date();
  await verification.save();
  return { ok: true, verification };
}

module.exports = {
  validateEmailAddress,
  createEmailOtp,
  verifyEmailOtp,
  normalizeEmail,
};
