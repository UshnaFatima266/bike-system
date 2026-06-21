const StockMovement = require("../models/StockMovement");

async function createStockMovement({
  productId,
  type,
  quantity,
  referenceType = "manual",
  referenceId = null,
  notes = "",
}) {
  if (!productId || !quantity || quantity <= 0) {
    return null;
  }

  return StockMovement.create({
    productId,
    type,
    quantity,
    referenceType,
    referenceId,
    notes,
  });
}

module.exports = { createStockMovement };
