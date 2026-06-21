const Inventory = require("../models/Inventory");
const Product = require("../models/Product");
const { syncInventoryForProduct } = require("../utils/inventorySync");
const { createStockMovement } = require("../utils/stockMovementLog");

const getInventoryItems = async (_req, res) => {
  try {
    const inventory = await Inventory.find()
      .populate({
        path: "productId",
        populate: { path: "category" },
      })
      .sort({ updatedAt: -1 });

    res.json(inventory);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateInventoryItem = async (req, res) => {
  try {
    const inventoryItem = await Inventory.findById(req.params.id).populate("productId");

    if (!inventoryItem) {
      return res.status(404).json({ message: "Inventory record not found." });
    }

    const quantityOnHand = Number(req.body.quantityOnHand);
    const reorderLevel = Number(req.body.reorderLevel);
    const warehouseLocation = String(req.body.warehouseLocation || "").trim();

    if (Number.isNaN(quantityOnHand) || quantityOnHand < 0) {
      return res.status(400).json({ message: "Quantity on hand must be a valid non-negative number." });
    }

    if (Number.isNaN(reorderLevel) || reorderLevel < 0) {
      return res.status(400).json({ message: "Reorder level must be a valid non-negative number." });
    }

    inventoryItem.quantityOnHand = quantityOnHand;
    inventoryItem.reorderLevel = reorderLevel;
    inventoryItem.warehouseLocation = warehouseLocation;
    await inventoryItem.save();

    await Product.findByIdAndUpdate(inventoryItem.productId._id, { stock: quantityOnHand });
    const refreshedProduct = await Product.findById(inventoryItem.productId._id);
    await syncInventoryForProduct(refreshedProduct, {
      reorderLevel,
      warehouseLocation,
    });
    const stockDifference = quantityOnHand - Number(inventoryItem.productId.stock || 0);
    if (stockDifference !== 0) {
      await createStockMovement({
        productId: inventoryItem.productId._id,
        type: stockDifference > 0 ? "in" : "adjustment",
        quantity: Math.abs(stockDifference),
        referenceType: "manual",
        notes: "Stock updated from admin inventory form.",
      });
    }

    const refreshedInventory = await Inventory.findById(inventoryItem._id).populate({
      path: "productId",
      populate: { path: "category" },
    });

    res.json(refreshedInventory);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const adjustInventoryStock = async (req, res) => {
  try {
    const inventoryItem = await Inventory.findById(req.params.id).populate("productId");

    if (!inventoryItem) {
      return res.status(404).json({ message: "Inventory record not found." });
    }

    const adjustment = Number(req.body.adjustment);

    if (Number.isNaN(adjustment) || adjustment === 0) {
      return res.status(400).json({ message: "Adjustment must be a non-zero number." });
    }

    const nextQuantity = inventoryItem.quantityOnHand + adjustment;
    if (nextQuantity < 0) {
      return res.status(400).json({ message: "Stock cannot go below zero." });
    }

    inventoryItem.quantityOnHand = nextQuantity;
    await inventoryItem.save();

    await Product.findByIdAndUpdate(inventoryItem.productId._id, { stock: nextQuantity });
    const refreshedProduct = await Product.findById(inventoryItem.productId._id);
    await syncInventoryForProduct(refreshedProduct, {
      reorderLevel: inventoryItem.reorderLevel,
      warehouseLocation: inventoryItem.warehouseLocation,
    });
    await createStockMovement({
      productId: inventoryItem.productId._id,
      type: adjustment > 0 ? "in" : "adjustment",
      quantity: Math.abs(adjustment),
      referenceType: "manual",
      notes: "Quick stock adjustment from admin dashboard.",
    });

    const refreshedInventory = await Inventory.findById(inventoryItem._id).populate({
      path: "productId",
      populate: { path: "category" },
    });

    res.json(refreshedInventory);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getInventoryItems,
  updateInventoryItem,
  adjustInventoryStock,
};
