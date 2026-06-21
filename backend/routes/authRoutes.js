const express = require("express");
const {
  registerUser,
  loginUser,
  loginPosUser,
  getUserProfile,
} = require("../controllers/authController");

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/pos-login", loginPosUser);
router.get("/users/:id", getUserProfile);

module.exports = router;
