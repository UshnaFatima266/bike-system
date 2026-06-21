const Inventory = require("../models/Inventory");

const DEFAULT_REORDER_LEVEL = 5;

async function syncInventoryForProduct(product, overrides = {}) {
  if (!product?._id) {
    return null;
  }

  const existing = await Inventory.findOne({ productId: product._id });

  const inventoryData = {
    productId: product._id,
    quantityOnHand: Number(product.stock || 0),
    reorderLevel: overrides.reorderLevel ?? existing?.reorderLevel ?? DEFAULT_REORDER_LEVEL,
    warehouseLocation: overrides.warehouseLocation ?? existing?.warehouseLocation ?? "Main warehouse",
  };

  if (existing) {
    Object.assign(existing, inventoryData);
    return existing.save();
  }

  return Inventory.create(inventoryData);
}

async function syncInventoryForProducts(products = []) {
  return Promise.all(products.map((product) => syncInventoryForProduct(product)));
}

async function removeInventoryForProduct(productId) {
  if (!productId) {
    return null;
  }

  return Inventory.findOneAndDelete({ productId });
}

module.exports = {
  syncInventoryForProduct,
  syncInventoryForProducts,
  removeInventoryForProduct,
  DEFAULT_REORDER_LEVEL,
};
