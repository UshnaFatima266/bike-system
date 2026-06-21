const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    expenseDate: { type: Date, required: true, default: Date.now },
    notes: { type: String, default: "", trim: true },
  },
  { timestamps: true, collection: "expenses" },
);

module.exports = mongoose.model("Expense", expenseSchema);
