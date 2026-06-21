const Expense = require("../models/Expense");
const ActivityLog = require("../models/ActivityLog");
const Inventory = require("../models/Inventory");
const Order = require("../models/Order");
const Product = require("../models/Product");
const Purchase = require("../models/Purchase");
const PurchaseItem = require("../models/PurchaseItem");
const Return = require("../models/Return");
const Role = require("../models/Role");
const Shipment = require("../models/Shipment");
const Supplier = require("../models/Supplier");
const User = require("../models/User");
const { hashPassword } = require("../utils/password");
const { logActivity } = require("../utils/activityLogger");
const { validateEmailAddress } = require("../utils/emailVerification");
const { syncInventoryForProduct } = require("../utils/inventorySync");
const { createStockMovement } = require("../utils/stockMovementLog");
const { updateSalesReportForDate } = require("../utils/reporting");

const POS_PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])[A-Za-z0-9]{6,}$/;

async function getAdminActor(userId) {
  if (!userId) {
    return null;
  }

  const user = await User.findById(userId);
  return user?.role === "admin" ? user : null;
}

async function ensureCashierRole() {
  const existingRole = await Role.findOne({ name: "staff" });
  if (existingRole) {
    if (existingRole.description !== "Physical store POS manager") {
      existingRole.description = "Physical store POS manager";
      await existingRole.save();
    }
    return existingRole;
  }

  return Role.create({
    name: "staff",
    description: "Physical store POS manager",
  });
}

const getSuppliers = async (_req, res) => {
  try {
    const suppliers = await Supplier.find().sort({ createdAt: -1 });
    res.json(suppliers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.create(req.body);
    await logActivity({
      action: "created",
      module: "suppliers",
      description: `Supplier ${supplier.name} was added.`,
      metadata: { supplierId: supplier._id },
    });
    res.status(201).json(supplier);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getPurchases = async (_req, res) => {
  try {
    const purchases = await Purchase.find()
      .populate("supplierId")
      .sort({ createdAt: -1 });

    const purchaseIds = purchases.map((purchase) => purchase._id);
    const purchaseItems = await PurchaseItem.find({ purchaseId: { $in: purchaseIds } }).populate("productId");
    const itemsByPurchase = new Map();

    purchaseItems.forEach((item) => {
      const key = String(item.purchaseId);
      const salePrice = Number(item.productId?.price || 0);
      const expectedRevenue = salePrice * Number(item.quantity || 0);
      const expectedProfit = expectedRevenue - Number(item.subtotal || 0);
      const enrichedItem = {
        ...item.toObject(),
        salePrice,
        expectedRevenue,
        expectedProfit,
      };

      if (!itemsByPurchase.has(key)) {
        itemsByPurchase.set(key, []);
      }
      itemsByPurchase.get(key).push(enrichedItem);
    });

    const enrichedPurchases = purchases.map((purchase) => {
      const purchaseItemsForRow = itemsByPurchase.get(String(purchase._id)) || [];
      const totalExpectedRevenue = purchaseItemsForRow.reduce((sum, item) => sum + Number(item.expectedRevenue || 0), 0);
      const totalExpectedProfit = purchaseItemsForRow.reduce((sum, item) => sum + Number(item.expectedProfit || 0), 0);

      return {
        ...purchase.toObject(),
        items: purchaseItemsForRow,
        totalExpectedRevenue,
        totalExpectedProfit,
      };
    });

    res.json(enrichedPurchases);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deletePurchase = async (req, res) => {
  try {
    const { adminId = null } = req.body;

    const purchase = await Purchase.findById(req.params.id);
    if (!purchase) {
      return res.status(404).json({ message: "Purchase not found." });
    }

    const purchaseItems = await PurchaseItem.find({ purchaseId: purchase._id });

    for (const item of purchaseItems) {
      const product = await Product.findById(item.productId);
      if (product) {
        product.stock = Math.max(0, product.stock - item.quantity);
        await product.save();
        await syncInventoryForProduct(product);
        await createStockMovement({
          productId: product._id,
          type: "out",
          quantity: item.quantity,
          referenceType: "purchase-delete",
          referenceId: purchase._id,
          notes: `Purchase deleted, stock reverted.`,
        });
      }
    }

    await PurchaseItem.deleteMany({ purchaseId: purchase._id });
    await Purchase.findByIdAndDelete(purchase._id);

    await updateSalesReportForDate(purchase.purchaseDate);
    const adminActor = await getAdminActor(adminId);
    await logActivity({
      actor: adminActor,
      action: "deleted",
      module: "purchases",
      description: `Purchase from ${purchase.supplierId} for Rs ${purchase.totalAmount} was deleted.`,
      metadata: { purchaseId: purchase._id },
    });

    res.json({ message: "Purchase deleted and stock reverted successfully." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createPurchase = async (req, res) => {
  try {
    const { supplierId, productId, quantity, costPrice, notes = "", status = "received" } = req.body;

    if (!supplierId || !productId || !quantity || !costPrice) {
      return res.status(400).json({ message: "Supplier, product, quantity, and cost price are required." });
    }

    const [supplier, product] = await Promise.all([
      Supplier.findById(supplierId),
      Product.findById(productId),
    ]);

    if (!supplier) {
      return res.status(404).json({ message: "Supplier not found." });
    }

    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }

    const parsedQuantity = Number(quantity);
    const parsedCostPrice = Number(costPrice);
    const subtotal = parsedQuantity * parsedCostPrice;

    const purchase = await Purchase.create({
      supplierId,
      purchaseDate: new Date(),
      totalAmount: subtotal,
      status,
      notes,
    });

    await PurchaseItem.create({
      purchaseId: purchase._id,
      productId,
      quantity: parsedQuantity,
      costPrice: parsedCostPrice,
      subtotal,
    });

    product.stock += parsedQuantity;
    await product.save();
    await syncInventoryForProduct(product);

    await createStockMovement({
      productId: product._id,
      type: "in",
      quantity: parsedQuantity,
      referenceType: "purchase",
      referenceId: purchase._id,
      notes: `Purchase received from ${supplier.name}.`,
    });

    const populatedPurchase = await Purchase.findById(purchase._id).populate("supplierId");
    await updateSalesReportForDate(new Date());
    await logActivity({
      action: "created",
      module: "purchases",
      description: `${parsedQuantity} ${product.name} received from ${supplier.name}.`,
      metadata: { purchaseId: purchase._id, productId: product._id, supplierId: supplier._id, quantity: parsedQuantity, costPrice: parsedCostPrice },
    });
    res.status(201).json(populatedPurchase);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getShipments = async (_req, res) => {
  try {
    const shipments = await Shipment.find()
      .populate("orderId")
      .sort({ createdAt: -1 });
    res.json(shipments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getExpenses = async (_req, res) => {
  try {
    const expenses = await Expense.find().sort({ expenseDate: -1, createdAt: -1 });
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createExpense = async (req, res) => {
  try {
    const { title, category, amount, expenseDate, notes = "" } = req.body;

    if (!title || !category || amount === undefined || amount === null) {
      return res.status(400).json({ message: "Title, category, and amount are required." });
    }

    const expense = await Expense.create({
      title,
      category,
      amount: Number(amount),
      expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
      notes,
    });

    await updateSalesReportForDate(expense.expenseDate);
    await logActivity({
      action: "created",
      module: "expenses",
      description: `${title} expense recorded.`,
      metadata: { expenseId: expense._id, amount: expense.amount, category: expense.category },
    });
    res.status(201).json(expense);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const saveShipment = async (req, res) => {
  try {
    const { orderId, carrier = "", trackingNumber = "", status = "pending" } = req.body;

    if (!orderId) {
      return res.status(400).json({ message: "Order is required." });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }

    const payload = {
      orderId,
      carrier,
      trackingNumber,
      status,
      shippedAt: status === "pending" ? null : new Date(),
      deliveredAt: status === "delivered" ? new Date() : null,
    };

    const shipment = await Shipment.findOneAndUpdate({ orderId }, payload, {
      upsert: true,
      returnDocument: "after",
      setDefaultsOnInsert: true,
    }).populate("orderId");

    await logActivity({
      action: "updated",
      module: "shipments",
      description: `Shipment ${status} for order ${String(order._id).slice(-6).toUpperCase()}.`,
      metadata: { shipmentId: shipment._id, orderId: order._id, status },
    });
    res.json(shipment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getReturns = async (_req, res) => {
  try {
    const returns = await Return.find()
      .populate("orderId")
      .populate("userId")
      .sort({ createdAt: -1 });
    res.json(returns);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createReturn = async (req, res) => {
  try {
    const { orderId, reason } = req.body;

    if (!orderId || !reason) {
      return res.status(400).json({ message: "Order and reason are required." });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }

    const createdReturn = await Return.create({
      orderId,
      userId: order.user,
      reason,
      status: "requested",
    });

    const populatedReturn = await Return.findById(createdReturn._id)
      .populate("orderId")
      .populate("userId");

    res.status(201).json(populatedReturn);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateReturnStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const updatedReturn = await Return.findByIdAndUpdate(req.params.id, { status }, { returnDocument: "after" })
      .populate("orderId")
      .populate("userId");

    if (!updatedReturn) {
      return res.status(404).json({ message: "Return not found." });
    }

    await logActivity({
      action: "updated",
      module: "returns",
      description: `Return request marked ${status}.`,
      metadata: { returnId: updatedReturn._id, status },
    });
    res.json(updatedReturn);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getPosUsers = async (_req, res) => {
  try {
    const users = await User.find({ role: "cashier" })
      .select("-passwordHash")
      .sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createPosUser = async (req, res) => {
  try {
    const { name, email, password, phone = "", adminId = null } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "POS manager name, email, and password are required." });
    }

    if (!POS_PASSWORD_RULE.test(password)) {
      return res.status(400).json({ message: "Password must be at least 6 letters/numbers with one capital and one small letter." });
    }

    const emailCheck = await validateEmailAddress(email);
    if (!emailCheck.ok) {
      return res.status(400).json({ message: emailCheck.message });
    }

    const normalizedEmail = emailCheck.email;
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(409).json({ message: "An account with this email already exists." });
    }

    const [cashierRole, adminActor] = await Promise.all([
      ensureCashierRole(),
      getAdminActor(adminId),
    ]);

    const user = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      passwordHash: hashPassword(password),
      phone,
      roleId: cashierRole._id,
      role: "cashier",
    });

    await logActivity({
      actor: adminActor,
      action: "created",
      module: "posAccounts",
      description: `POS manager ${user.name} was created.`,
      metadata: { userId: user._id },
    });

    const safeUser = await User.findById(user._id).select("-passwordHash");
    res.status(201).json(safeUser);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updatePosUserStatus = async (req, res) => {
  try {
    const { adminId = null } = req.body;
    const user = await User.findOne({ _id: req.params.id, role: "cashier" }).select("-passwordHash");

    if (!user) {
      return res.status(404).json({ message: "POS manager account not found." });
    }

    const adminActor = await getAdminActor(adminId);
    await logActivity({
      actor: adminActor,
      action: "reviewed",
      module: "posAccounts",
      description: `POS manager ${user.name} account was reviewed.`,
      metadata: { userId: user._id },
    });

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getActivityLogs = async (_req, res) => {
  try {
    const logs = await ActivityLog.find().sort({ createdAt: -1 }).limit(80).populate("actorId", "name email role");
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteActivityLog = async (req, res) => {
  try {
    const log = await ActivityLog.findByIdAndDelete(req.params.id);

    if (!log) {
      return res.status(404).json({ message: "Activity log not found." });
    }

    res.json({ message: "Activity log deleted successfully." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deletePosUser = async (req, res) => {
  try {
    const { adminId = null } = req.body;
    const user = await User.findOne({ _id: req.params.id, role: "cashier" });

    if (!user) {
      return res.status(404).json({ message: "POS manager account not found." });
    }

    const adminActor = await getAdminActor(adminId);

    await logActivity({
      actor: adminActor,
      action: "deleted",
      module: "posAccounts",
      description: `POS manager ${user.name} account was deleted.`,
      metadata: { userId: user._id },
    });

    await User.findByIdAndDelete(user._id);

    res.json({ message: "POS manager account deleted successfully." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
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
};
