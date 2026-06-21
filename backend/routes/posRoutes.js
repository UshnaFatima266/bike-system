const express = require("express");
const {
  getPosBootstrap,
  searchPosProducts,
  createPosSale,
  getPosSales,
  returnPosSaleItems,
  getPosReports,
  updateDailyRegister,
} = require("../controllers/posController");

const router = express.Router();

router.get("/bootstrap", getPosBootstrap);
router.get("/products/search", searchPosProducts);
router.get("/sales", getPosSales);
router.get("/reports", getPosReports);
router.post("/sales", createPosSale);
router.post("/sales/:id/return", returnPosSaleItems);
router.patch("/reports/register", updateDailyRegister);

module.exports = router;
