const Expense = require("../models/Expense");
const Order = require("../models/Order");
const OrderItem = require("../models/OrderItem");
const PosSale = require("../models/PosSale");
const PosSaleItem = require("../models/PosSaleItem");
const Product = require("../models/Product");
const Purchase = require("../models/Purchase");
const PurchaseItem = require("../models/PurchaseItem");
const SalesReport = require("../models/SalesReport");

function startOfDay(dateValue = new Date()) {
  const date = new Date(dateValue);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfDay(dateValue = new Date()) {
  const date = startOfDay(dateValue);
  date.setDate(date.getDate() + 1);
  return date;
}

async function updateSalesReportForDate(dateValue = new Date(), extra = {}) {
  const from = startOfDay(dateValue);
  const to = endOfDay(dateValue);

  const [orders, orderItems, posSales, posSaleItems, expenses, purchases, purchaseItems] = await Promise.all([
    Order.find({ createdAt: { $gte: from, $lt: to } }),
    OrderItem.find({ createdAt: { $gte: from, $lt: to } }),
    PosSale.find({ saleDate: { $gte: from, $lt: to } }),
    PosSaleItem.find({ createdAt: { $gte: from, $lt: to } }),
    Expense.find({ expenseDate: { $gte: from, $lt: to } }),
    Purchase.find({ purchaseDate: { $gte: from, $lt: to }, status: { $ne: "cancelled" } }),
    PurchaseItem.find({ createdAt: { $gte: from, $lt: to } }),
  ]);

  const validPurchaseIds = new Set(purchases.map((purchase) => String(purchase._id)));
  const ecommerceRevenue = orders.reduce((sum, order) => sum + Number(order.totalAmount ?? order.totals?.grandTotal ?? 0), 0);
  const posRevenue = posSales.reduce((sum, sale) => sum + Number(sale.totalAmount || 0), 0);
  const totalSales = ecommerceRevenue + posRevenue;
  const totalOrders = orders.length;
  const totalPosSales = posSales.length;
  const totalExpenses = expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  const totalPurchaseCost = purchaseItems
    .filter((item) => validPurchaseIds.has(String(item.purchaseId)))
    .reduce((sum, item) => sum + Number(item.subtotal || 0), 0);
  const grossProfit = totalSales - totalPurchaseCost;
  const netProfit = grossProfit - totalExpenses;
  const cashSales = posSales
    .filter((sale) => sale.paymentMethod === "cash")
    .reduce((sum, sale) => sum + Number(sale.totalAmount || 0), 0);

  const productQuantities = new Map();
  orderItems.forEach((item) => {
    const key = String(item.productId);
    productQuantities.set(key, (productQuantities.get(key) || 0) + Number(item.quantity || 0));
  });
  posSaleItems.forEach((item) => {
    const key = String(item.productId);
    productQuantities.set(key, (productQuantities.get(key) || 0) + Number(item.quantity || 0) - Number(item.quantityReturned || 0));
  });

  let topSellingProductId = null;
  let topQuantity = 0;
  productQuantities.forEach((qty, productId) => {
    if (qty > topQuantity) {
      topQuantity = qty;
      topSellingProductId = productId;
    }
  });

  const currentReport = await SalesReport.findOne({ reportDate: from });

  const openingCash = extra.openingCash ?? currentReport?.openingCash ?? 0;
  const closingCashExpected = openingCash + cashSales;

  const report = await SalesReport.findOneAndUpdate(
    { reportDate: from },
    {
      reportDate: from,
      ecommerceRevenue,
      posRevenue,
      totalSales,
      totalOrders,
      totalPosSales,
      totalExpenses,
      totalPurchaseCost,
      grossProfit,
      netProfit,
      openingCash,
      cashSales,
      closingCashExpected,
      topSellingProductId,
      generatedAt: new Date(),
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  );

  return report;
}

async function getLatestUnitCostMap(productIds = []) {
  const latestCosts = new Map();
  const ids = [...new Set(productIds.map((id) => String(id)).filter(Boolean))];

  if (!ids.length) {
    return latestCosts;
  }

  const purchaseItems = await PurchaseItem.find({ productId: { $in: ids } }).sort({ createdAt: -1 });
  purchaseItems.forEach((item) => {
    const key = String(item.productId);
    if (!latestCosts.has(key)) {
      latestCosts.set(key, Number(item.costPrice || 0));
    }
  });

  return latestCosts;
}

async function refreshProductSoldCount(productId) {
  const key = String(productId);
  const [orderItems, posItems] = await Promise.all([
    OrderItem.find({ productId: key }),
    PosSaleItem.find({ productId: key }),
  ]);

  const orderedQty = orderItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const posQty = posItems.reduce((sum, item) => sum + Number(item.quantity || 0) - Number(item.quantityReturned || 0), 0);

  await Product.findByIdAndUpdate(key, { soldCount: orderedQty + posQty }, { returnDocument: "after" });
}

module.exports = {
  startOfDay,
  endOfDay,
  updateSalesReportForDate,
  getLatestUnitCostMap,
  refreshProductSoldCount,
};
