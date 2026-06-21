const mongoose = require("mongoose");

const salesReportSchema = new mongoose.Schema(
  {
    reportDate: { type: Date, required: true },
    ecommerceRevenue: { type: Number, default: 0, min: 0 },
    posRevenue: { type: Number, default: 0, min: 0 },
    totalSales: { type: Number, required: true, min: 0 },
    totalOrders: { type: Number, required: true, min: 0 },
    totalPosSales: { type: Number, default: 0, min: 0 },
    totalExpenses: { type: Number, default: 0, min: 0 },
    totalPurchaseCost: { type: Number, default: 0, min: 0 },
    grossProfit: { type: Number, default: 0 },
    netProfit: { type: Number, default: 0 },
    openingCash: { type: Number, default: 0, min: 0 },
    cashSales: { type: Number, default: 0, min: 0 },
    closingCashExpected: { type: Number, default: 0 },
    topSellingProductId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", default: null },
    generatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true, collection: "salesReports" },
);

module.exports = mongoose.model("SalesReport", salesReportSchema);
