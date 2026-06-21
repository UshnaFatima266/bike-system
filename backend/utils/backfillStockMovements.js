const Inventory = require("../models/Inventory");
const StockMovement = require("../models/StockMovement");

async function backfillStockMovements() {
  const movementCount = await StockMovement.countDocuments();

  if (movementCount > 0) {
    return { created: 0, skipped: true };
  }

  const inventoryItems = await Inventory.find().lean();

  const records = inventoryItems
    .filter((item) => Number(item.quantityOnHand || 0) > 0)
    .map((item) => ({
      productId: item.productId,
      type: "in",
      quantity: Number(item.quantityOnHand),
      referenceType: "manual",
      referenceId: null,
      notes: "Opening stock snapshot created from inventory.",
    }));

  if (!records.length) {
    return { created: 0, skipped: false };
  }

  await StockMovement.insertMany(records, { ordered: false });
  return { created: records.length, skipped: false };
}

module.exports = { backfillStockMovements };
