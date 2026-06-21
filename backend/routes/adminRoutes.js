const express = require("express");
const {
  getResourceNames,
  getResourceList,
  createResourceItem,
  updateResourceItem,
  deleteResourceItem,
} = require("../controllers/adminController");
const {
  getInventoryItems,
  updateInventoryItem,
  adjustInventoryStock,
} = require("../controllers/inventoryController");
const {
  getSuppliers,
  createSupplier,
  getPurchases,
  createPurchase,
  deletePurchase,
  getExpenses,
  createExpense,
  getShipments,
  saveShipment,
  getReturns,
  createReturn,
  updateReturnStatus,
  getPosUsers,
  createPosUser,
  updatePosUserStatus,
  deletePosUser,
  getActivityLogs,
  deleteActivityLog,
} = require("../controllers/adminWorkflowController");

const router = express.Router();

router.get("/inventory", getInventoryItems);
router.put("/inventory/:id", updateInventoryItem);
router.patch("/inventory/:id/adjust", adjustInventoryStock);
router.get("/suppliers", getSuppliers);
router.post("/suppliers", createSupplier);
router.get("/purchases", getPurchases);
router.post("/purchases", createPurchase);
router.delete("/purchases/:id", deletePurchase);
router.get("/expenses", getExpenses);
router.post("/expenses", createExpense);
router.get("/shipments", getShipments);
router.post("/shipments", saveShipment);
router.get("/returns", getReturns);
router.post("/returns", createReturn);
router.put("/returns/:id/status", updateReturnStatus);
router.get("/pos-users", getPosUsers);
router.post("/pos-users", createPosUser);
router.patch("/pos-users/:id/status", updatePosUserStatus);
router.delete("/pos-users/:id", deletePosUser);
router.get("/activity-logs", getActivityLogs);
router.delete("/activity-logs/:id", deleteActivityLog);

router.get("/resources", getResourceNames);
router.get("/resources/:resource", getResourceList);
router.post("/resources/:resource", createResourceItem);
router.put("/resources/:resource/:id", updateResourceItem);
router.delete("/resources/:resource/:id", deleteResourceItem);

module.exports = router;
