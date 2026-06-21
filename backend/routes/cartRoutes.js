const express = require("express");
const { getCartByUser, syncCart } = require("../controllers/cartController");

const router = express.Router();

router.get("/:userId", getCartByUser);
router.put("/", syncCart);

module.exports = router;
