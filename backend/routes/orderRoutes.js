const express = require("express");
const {
  createOrder,
  getOrdersByUser,
  getAllOrders,
  updateOrderStatus,
  getReturnsByUser,
  createReturnForOrder,
  getAdminOverview,
} = require("../controllers/orderController");

const router = express.Router();

router.post("/", createOrder);
router.get("/", getAllOrders);
router.get("/admin/overview", getAdminOverview);
router.get("/user/:userId", getOrdersByUser);
router.get("/user/:userId/returns", getReturnsByUser);
router.post("/:id/returns", createReturnForOrder);
router.put("/:id/status", updateOrderStatus);

module.exports = router;
