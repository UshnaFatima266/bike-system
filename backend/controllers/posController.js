const Category = require("../models/Category");
const Expense = require("../models/Expense");
const PosSale = require("../models/PosSale");
const PosSaleItem = require("../models/PosSaleItem");
const Product = require("../models/Product");
const SalesReport = require("../models/SalesReport");
const User = require("../models/User");
const { logActivity } = require("../utils/activityLogger");
const { syncInventoryForProduct } = require("../utils/inventorySync");
const { updateSalesReportForDate, getLatestUnitCostMap, refreshProductSoldCount, startOfDay } = require("../utils/reporting");
const { createStockMovement } = require("../utils/stockMovementLog");

const POS_PAYMENT_METHODS = ["cash", "card", "jazzcash", "easypaisa"];

async function getActor(userId) {
  if (!userId) {
    return null;
  }

  const user = await User.findById(userId);
  if (!user || !["admin", "cashier"].includes(user.role)) {
    return null;
  }

  return user;
}

function buildSaleNumber() {
  return `POS-${Date.now().toString().slice(-8)}`;
}

function normalizeMoney(value) {
  return Math.max(Number(value || 0), 0);
}

async function attachSaleItems(sales = []) {
  const saleIds = sales.map((sale) => sale._id);
  const items = await PosSaleItem.find({ posSaleId: { $in: saleIds } }).sort({ createdAt: 1 });
  const itemsBySaleId = items.reduce((map, item) => {
    const key = String(item.posSaleId);
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key).push(item);
    return map;
  }, new Map());

  return sales.map((sale) => ({
    ...sale.toObject(),
    items: itemsBySaleId.get(String(sale._id)) || [],
  }));
}

const getPosBootstrap = async (req, res) => {
  try {
    const actor = await getActor(req.query.userId);
    if (!actor) {
      return res.status(403).json({ message: "Admin or cashier access is required for POS." });
    }

    const [products, categories, customers, recentSales, todayReport] = await Promise.all([
      Product.find({ isActive: { $ne: false } }).populate("category").sort({ updatedAt: -1 }).limit(120),
      Category.find().sort({ name: 1 }),
      User.find({ role: "user" }).select("name email phone city").sort({ createdAt: -1 }).limit(50),
      PosSale.find().sort({ createdAt: -1 }).limit(10).populate("cashierId customerId"),
      SalesReport.findOne({ reportDate: startOfDay(new Date()) }),
    ]);

    const recentSalesWithItems = await attachSaleItems(recentSales);

    res.json({
      actor: { id: actor._id, name: actor.name, role: actor.role },
      products,
      categories,
      customers,
      recentSales: recentSalesWithItems,
      todayReport,
      paymentMethods: POS_PAYMENT_METHODS,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const searchPosProducts = async (req, res) => {
  try {
    const actor = await getActor(req.query.userId);
    if (!actor) {
      return res.status(403).json({ message: "Admin or cashier access is required for POS." });
    }

    const { search = "", category = "", brand = "" } = req.query;
    const filters = { isActive: { $ne: false } };

    if (category) {
      filters.$or = [{ category }, { categoryId: category }];
    }
    if (brand) {
      filters.brand = new RegExp(`^${String(brand).trim()}`, "i");
    }
    if (search) {
      const regex = new RegExp(String(search).trim(), "i");
      filters.$and = [
        ...(filters.$and || []),
        {
          $or: [
            { name: regex },
            { brand: regex },
            { sku: regex },
            { description: regex },
          ],
        },
      ];
    }

    const products = await Product.find(filters).populate("category").sort({ name: 1 }).limit(120);
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createPosSale = async (req, res) => {
  try {
    const {
      userId,
      customerId = null,
      customerName = "Walk-in Customer",
      customerPhone = "",
      items = [],
      paymentMethod = "cash",
      subtotal = 0,
      discountAmount = 0,
      taxAmount = 0,
      totalAmount = 0,
      notes = "",
    } = req.body;

    const actor = await getActor(userId);
    if (!actor) {
      return res.status(403).json({ message: "Admin or cashier access is required for POS." });
    }

    if (!Array.isArray(items) || !items.length) {
      return res.status(400).json({ message: "Add at least one product to the POS cart." });
    }

    if (!POS_PAYMENT_METHODS.includes(paymentMethod)) {
      return res.status(400).json({ message: "Invalid payment method." });
    }

    const productIds = items.map((item) => item.productId);
    const latestUnitCosts = await getLatestUnitCostMap(productIds);
    const saleItems = [];

    for (const rawItem of items) {
      const quantity = Number(rawItem.quantity || 0);
      const product = await Product.findById(rawItem.productId).populate("category");

      if (!product) {
        return res.status(404).json({ message: "POS product not found." });
      }

      if (quantity < 1) {
        return res.status(400).json({ message: `Invalid quantity for ${product.name}.` });
      }

      if (Number(product.stock || 0) < quantity) {
        return res.status(400).json({ message: `${product.name} only has ${product.stock} units left.` });
      }

      const unitPrice = normalizeMoney(rawItem.unitPrice || product.price);
      const itemDiscount = normalizeMoney(rawItem.discountAmount);
      const itemTax = normalizeMoney(rawItem.taxAmount);
      const lineSubtotal = unitPrice * quantity;
      const lineTotal = Math.max(lineSubtotal - itemDiscount + itemTax, 0);
      const unitCost = normalizeMoney(latestUnitCosts.get(String(product._id)));

      saleItems.push({
        product,
        payload: {
          productId: product._id,
          name: product.name,
          sku: product.sku || "",
          brand: product.brand || "",
          categoryName: product.category?.name || "",
          quantity,
          quantityReturned: 0,
          unitCost,
          unitPrice,
          discountAmount: itemDiscount,
          taxAmount: itemTax,
          subtotal: lineSubtotal,
          lineTotal,
        },
      });
    }

    const posSale = await PosSale.create({
      saleDate: new Date(),
      saleNumber: buildSaleNumber(),
      cashierId: actor._id,
      customerId: customerId || null,
      customerName: customerName || "Walk-in Customer",
      customerPhone,
      subtotal: normalizeMoney(subtotal) || saleItems.reduce((sum, item) => sum + item.payload.subtotal, 0),
      discountAmount: normalizeMoney(discountAmount),
      taxAmount: normalizeMoney(taxAmount),
      totalAmount: normalizeMoney(totalAmount) || saleItems.reduce((sum, item) => sum + item.payload.lineTotal, 0),
      paymentMethod,
      status: "completed",
      itemsCount: saleItems.reduce((sum, item) => sum + item.payload.quantity, 0),
      notes,
    });

    await PosSaleItem.insertMany(
      saleItems.map((item) => ({
        posSaleId: posSale._id,
        ...item.payload,
      })),
    );

    for (const item of saleItems) {
      item.product.stock -= item.payload.quantity;
      await item.product.save();
      await syncInventoryForProduct(item.product);
      await createStockMovement({
        productId: item.product._id,
        type: "out",
        quantity: item.payload.quantity,
        referenceType: "sale",
        referenceId: posSale._id,
        notes: `POS sale ${posSale.saleNumber} completed.`,
      });
      await refreshProductSoldCount(item.product._id);
    }

    const report = await updateSalesReportForDate(new Date());
    await logActivity({
      actor,
      action: "completed",
      module: "posSales",
      description: `POS sale ${posSale.saleNumber} completed for ${normalizeMoney(totalAmount) || posSale.totalAmount}.`,
      metadata: { saleId: posSale._id, saleNumber: posSale.saleNumber, totalAmount: posSale.totalAmount, itemsCount: posSale.itemsCount },
    });
    const refreshedProducts = await Product.find({ isActive: { $ne: false } }).populate("category").sort({ updatedAt: -1 }).limit(120);
    const fullSale = await PosSale.findById(posSale._id).populate("cashierId customerId");
    const fullItems = await PosSaleItem.find({ posSaleId: posSale._id });

    res.status(201).json({
      sale: fullSale,
      items: fullItems,
      products: refreshedProducts,
      report,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getPosSales = async (req, res) => {
  try {
    const actor = await getActor(req.query.userId);
    if (!actor) {
      return res.status(403).json({ message: "Admin or cashier access is required for POS." });
    }

    const sales = await PosSale.find().sort({ createdAt: -1 }).limit(50).populate("cashierId customerId");
    res.json(await attachSaleItems(sales));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const returnPosSaleItems = async (req, res) => {
  try {
    const actor = await getActor(req.body.userId);
    if (!actor) {
      return res.status(403).json({ message: "Admin or cashier access is required for POS." });
    }

    const { items = [], reason = "POS return" } = req.body;
    if (!Array.isArray(items) || !items.length) {
      return res.status(400).json({ message: "Select at least one POS item to return." });
    }

    const sale = await PosSale.findById(req.params.id);
    if (!sale) {
      return res.status(404).json({ message: "POS sale not found." });
    }

    const saleItems = await PosSaleItem.find({ posSaleId: sale._id });
    let totalReturnedValue = 0;
    let allReturned = true;

    for (const requestedItem of items) {
      const saleItem = saleItems.find((item) => String(item._id) === String(requestedItem.saleItemId));
      if (!saleItem) {
        return res.status(400).json({ message: "POS return item not found in the sale." });
      }

      const quantity = Number(requestedItem.quantity || 0);
      const remaining = Number(saleItem.quantity || 0) - Number(saleItem.quantityReturned || 0);
      if (quantity < 1 || quantity > remaining) {
        return res.status(400).json({ message: `Return quantity for ${saleItem.name} must be between 1 and ${remaining}.` });
      }

      saleItem.quantityReturned += quantity;
      await saleItem.save();
      totalReturnedValue += (Number(saleItem.lineTotal || 0) / Number(saleItem.quantity || 1)) * quantity;

      const product = await Product.findById(saleItem.productId).populate("category");
      if (product) {
        product.stock += quantity;
        await product.save();
        await syncInventoryForProduct(product);
        await createStockMovement({
          productId: product._id,
          type: "return",
          quantity,
          referenceType: "return",
          referenceId: sale._id,
          notes: `${reason} for POS sale ${sale.saleNumber}.`,
        });
        await refreshProductSoldCount(product._id);
      }
    }

    sale.totalAmount = Math.max(Number(sale.totalAmount || 0) - totalReturnedValue, 0);
    sale.itemsCount = saleItems.reduce((sum, item) => sum + Math.max(Number(item.quantity || 0) - Number(item.quantityReturned || 0), 0), 0);

    for (const saleItem of saleItems) {
      if (Number(saleItem.quantityReturned || 0) < Number(saleItem.quantity || 0)) {
        allReturned = false;
        break;
      }
    }

    sale.status = allReturned ? "returned" : "partially_returned";
    await sale.save();

    const report = await updateSalesReportForDate(new Date());
    await logActivity({
      actor,
      action: "returned",
      module: "posReturns",
      description: `POS return processed for ${sale.saleNumber}.`,
      metadata: { saleId: sale._id, saleNumber: sale.saleNumber, returnedValue: totalReturnedValue },
    });
    res.json({ sale, report });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getPosReports = async (req, res) => {
  try {
    const actor = await getActor(req.query.userId);
    if (!actor) {
      return res.status(403).json({ message: "Admin or cashier access is required for POS." });
    }

    const [recentReports, recentSales, recentExpenses] = await Promise.all([
      SalesReport.find().sort({ reportDate: -1 }).limit(14).populate("topSellingProductId"),
      PosSale.find().sort({ createdAt: -1 }).limit(20).populate("cashierId customerId"),
      Expense.find().sort({ expenseDate: -1 }).limit(20),
    ]);

    const recentSalesWithItems = await attachSaleItems(recentSales);

    res.json({
      reports: recentReports,
      recentSales: recentSalesWithItems,
      recentExpenses,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateDailyRegister = async (req, res) => {
  try {
    const actor = await getActor(req.body.userId);
    if (!actor || actor.role !== "admin") {
      return res.status(403).json({ message: "Only admin can update the daily cash register." });
    }

    const report = await updateSalesReportForDate(req.body.reportDate || new Date(), {
      openingCash: normalizeMoney(req.body.openingCash),
    });

    res.json(report);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getPosBootstrap,
  searchPosProducts,
  createPosSale,
  getPosSales,
  returnPosSaleItems,
  getPosReports,
  updateDailyRegister,
};
