const User = require("../models/User");
const Role = require("../models/Role");
const { hashPassword, verifyPassword } = require("../utils/password");
const { normalizeEmail } = require("../utils/emailVerification");

const DEFAULT_ADMIN_EMAIL = process.env.ADMIN_EMAIL || "Hammad123@gmail.com";
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin786";
const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])[A-Za-z0-9]{6,}$/;

function sanitizeUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    city: user.city,
    address: user.address,
    role: user.role || "user",
    createdAt: user.createdAt,
  };
}

async function ensureRole(name, description) {
  const existingRole = await Role.findOne({ name });
  if (existingRole) {
    if (description && existingRole.description !== description) {
      existingRole.description = description;
      await existingRole.save();
    }
    return existingRole;
  }

  return Role.create({ name, description });
}

const registerUser = async (req, res) => {
  try {
    const { name, email, password, phone, city, address } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required." });
    }

    if (!PASSWORD_RULE.test(password)) {
      return res.status(400).json({
        message: "Weak password. Use at least 6 letters or numbers with at least 1 capital letter and 1 small letter. Numbers are optional.",
      });
    }

    const normalizedEmail = normalizeEmail(email);
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(409).json({ message: "An account with this email already exists." });
    }

    const userRole = await ensureRole("user", "Regular storefront customer");
    const user = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      passwordHash: hashPassword(password),
      phone: phone || "",
      city: city || "",
      address: address || "",
      roleId: userRole._id,
      role: "user",
    });

    res.status(201).json({ user: sanitizeUser(user) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const normalizedEmail = normalizeEmail(email);

    if (normalizedEmail === DEFAULT_ADMIN_EMAIL.toLowerCase() && password === DEFAULT_ADMIN_PASSWORD) {
      const adminRole = await ensureRole("admin", "System administrator");

      let adminUser = await User.findOne({ email: normalizedEmail });

      if (!adminUser) {
        adminUser = await User.create({
          name: "System Admin",
          email: normalizedEmail,
          passwordHash: hashPassword(password),
          roleId: adminRole._id,
          role: "admin",
        });
      } else if (adminUser.role !== "admin" || !adminUser.roleId) {
        adminUser.role = "admin";
        adminUser.roleId = adminRole._id;
        await adminUser.save();
      }

      return res.json({ user: sanitizeUser(adminUser) });
    }

    const user = await User.findOne({ email: normalizedEmail });

    if (!user || !verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    if (user.role === "cashier") {
      return res.status(403).json({ message: "POS manager accounts must use the POS login screen." });
    }

    if (!user.roleId) {
      const roleRecord = await ensureRole(user.role || "user", user.role === "admin" ? "System administrator" : "Regular storefront customer");
      user.roleId = roleRecord._id;
      await user.save();
    }

    return res.json({ user: sanitizeUser(user) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const loginPosUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "POS email and password are required." });
    }

    const normalizedEmail = normalizeEmail(email);
    const user = await User.findOne({ email: normalizedEmail });

    if (!user || user.role !== "cashier" || !verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ message: "Invalid POS manager credentials." });
    }

    if (!user.roleId) {
      const cashierRole = await ensureRole("staff", "Physical store POS manager");
      user.roleId = cashierRole._id;
    }

    return res.json({ user: sanitizeUser(user) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    res.json({ user: sanitizeUser(user) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { registerUser, loginUser, loginPosUser, getUserProfile };
