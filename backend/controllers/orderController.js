const Order = require("../models/Order");
const OrderItem = require("../models/OrderItem");
const Payment = require("../models/Payment");
const Product = require("../models/Product");
const Shipment = require("../models/Shipment");
const ShippingAddress = require("../models/ShippingAddress");
const Return = require("../models/Return");
const User = require("../models/User");
const Inventory = require("../models/Inventory");
const Expense = require("../models/Expense");
const Purchase = require("../models/Purchase");
const PurchaseItem = require("../models/PurchaseItem");
const { syncInventoryForProduct, syncInventoryForProducts } = require("../utils/inventorySync");
const { createStockMovement } = require("../utils/stockMovementLog");
const { refreshProductSoldCount, startOfDay, updateSalesReportForDate } = require("../utils/reporting");
const { markCartOrdered } = require("./cartController");

const DELIVERY_FEE = 200;

function normalizePaymentMethod(method) {
  switch (method) {
    case "cash-on-delivery":
      return "cash_on_delivery";
    case "card-on-delivery":
      return "card";
    case "bank-transfer":
      return "bank_transfer";
    default:
      return method || "cash_on_delivery";
  }
}

function normalizeOrderStatus(status) {
  switch (String(status || "").toLowerCase()) {
    case "confirmed":
      return "confirmed";
    case "packed":
      return "packed";
    case "out for delivery":
    case "out-for-delivery":
    case "shipped":
      return "shipped";
    case "delivered":
      return "delivered";
    case "cancelled":
      return "cancelled";
    case "returned":
      return "returned";
    default:
      return "confirmed";
  }
}

const createOrder = async (req, res) => {
  try {
    const {
      userId,
      items,
      customer,
      deliveryPreference = "standard-dispatch",
      paymentMethod = "cash-on-delivery",
    } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "Please log in before placing an order." });
    }

    if (!Array.isArray(items) || !items.length) {
      return res.status(400).json({ message: "Order items are required." });
    }

    if (!customer?.name || !customer?.phone || !customer?.email || !customer?.city || !customer?.address) {
      return res.status(400).json({ message: "Please complete the delivery form before placing your order." });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User account not found." });
    }

    const orderItems = [];
    let subtotal = 0;

    for (const item of items) {
      const quantity = Number(item.quantity || 0);
      const product = await Product.findById(item.id);

      if (!product) {
        return res.status(404).json({ message: `Product not found: ${item.id}` });
      }

      if (quantity <= 0) {
        return res.status(400).json({ message: `Invalid quantity for ${product.name}.` });
      }

      if (product.stock < quantity) {
        return res.status(400).json({ message: `Only ${product.stock} units left for ${product.name}.` });
      }

      product.stock -= quantity;
      await product.save();
      await syncInventoryForProduct(product);

      subtotal += product.price * quantity;
      orderItems.push({
        product: product._id,
        name: product.name,
        price: product.price,
        quantity,
      });
    }

    user.phone = customer.phone;
    user.city = customer.city;
    user.address = customer.address;
    await user.save();

    let shippingAddress = await ShippingAddress.findOne({ userId: user._id, isDefault: true });

    if (!shippingAddress) {
      shippingAddress = new ShippingAddress({
        userId: user._id,
        fullName: customer.name,
        phone: customer.phone,
        city: customer.city,
        postalCode: customer.postalCode || "",
        addressLine: customer.address,
        landmark: customer.landmark || "",
        isDefault: true,
      });
    } else {
      shippingAddress.fullName = customer.name;
      shippingAddress.phone = customer.phone;
      shippingAddress.city = customer.city;
      shippingAddress.postalCode = customer.postalCode || "";
      shippingAddress.addressLine = customer.address;
      shippingAddress.landmark = customer.landmark || "";
      shippingAddress.isDefault = true;
    }

    await shippingAddress.save();

    const grandTotal = subtotal + DELIVERY_FEE;
    const paymentStatus = paymentMethod === "cash-on-delivery" ? "pending" : "paid";

    const order = await Order.create({
      user: user._id,
      userId: user._id,
      shippingAddressId: shippingAddress._id,
      orderDate: new Date(),
      items: orderItems,
      subtotal,
      shippingFee: DELIVERY_FEE,
      totalAmount: grandTotal,
      totals: {
        subtotal,
        delivery: DELIVERY_FEE,
        grandTotal,
      },
      deliveryPreference,
      paymentMethod,
      customer: {
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        city: customer.city,
        postalCode: customer.postalCode || "",
        landmark: customer.landmark || "",
        address: customer.address,
        notes: customer.notes || "",
      },
      status: "confirmed",
      paymentStatus,
    });

    await OrderItem.insertMany(
      orderItems.map((item) => ({
        orderId: order._id,
        productId: item.product,
        quantity: item.quantity,
        unitPrice: item.price,
        subtotal: item.price * item.quantity,
      })),
    );

    await Payment.create({
      orderId: order._id,
      amount: grandTotal,
      method: normalizePaymentMethod(paymentMethod),
      status: paymentStatus,
      transactionRef: "",
      paidAt: paymentMethod === "cash-on-delivery" ? null : new Date(),
    });

    await Shipment.findOneAndUpdate(
      { orderId: order._id },
      {
        orderId: order._id,
        carrier: deliveryPreference === "pickup-today" ? "Store pickup" : "Standard courier",
        trackingNumber: "",
        status: "pending",
        shippedAt: null,
        deliveredAt: null,
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    );

    await Promise.all(
      orderItems.map((item) =>
        createStockMovement({
          productId: item.product,
          type: "out",
          quantity: item.quantity,
          referenceType: "sale",
          referenceId: order._id,
          notes: `Stock reduced for order ${order._id}.`,
        }),
      ),
    );

    await Promise.all(orderItems.map((item) => refreshProductSoldCount(item.product)));
    await updateSalesReportForDate(new Date());

    await markCartOrdered(user._id);

    const refreshedProducts = await Product.find().populate("category");
    const userOrders = await Order.find({ user: user._id }).sort({ createdAt: -1 });

    res.status(201).json({
      message: "Order placed successfully.",
      order,
      orders: userOrders,
      products: refreshedProducts,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getOrdersByUser = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.params.userId }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAllOrders = async (_req, res) => {
  try {
    const orders = await Order.find().populate("user").sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const status = normalizeOrderStatus(req.body.status);

    if (!status) {
      return res.status(400).json({ message: "Order status is required." });
    }

    const order = await Order.findByIdAndUpdate(req.params.id, { status }, { returnDocument: "after" }).populate("user");

    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getReturnsByUser = async (req, res) => {
  try {
    const returns = await Return.find({ userId: req.params.userId })
      .populate("orderId")
      .sort({ createdAt: -1 });
    res.json(returns);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createReturnForOrder = async (req, res) => {
  try {
    const { userId, reason, items } = req.body;

    if (!userId || !reason) {
      return res.status(400).json({ message: "User and return reason are required." });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }

    if (String(order.userId || order.user) !== String(userId)) {
      return res.status(403).json({ message: "You can only request returns for your own orders." });
    }

    if (!Array.isArray(items) || !items.length) {
      return res.status(400).json({ message: "Select at least one item to return." });
    }

    const existingReturns = await Return.find({
      orderId: order._id,
      status: { $ne: "rejected" },
    });

    const alreadyReturnedByProduct = new Map();
    existingReturns.forEach((returnRecord) => {
      (returnRecord.items || []).forEach((item) => {
        const key = String(item.productId);
        alreadyReturnedByProduct.set(key, (alreadyReturnedByProduct.get(key) || 0) + Number(item.quantity || 0));
      });
    });

    const normalizedReturnItems = [];

    for (const requestedItem of items) {
      const orderItem = order.items.find((item) => String(item.product || item.productId) === String(requestedItem.productId));
      const quantity = Number(requestedItem.quantity || 0);
      const alreadyReturned = alreadyReturnedByProduct.get(String(requestedItem.productId)) || 0;
      const remainingQuantity = Number(orderItem?.quantity || 0) - alreadyReturned;

      if (!orderItem) {
        return res.status(400).json({ message: "Return item does not belong to this order." });
      }

      if (quantity < 1 || quantity > remainingQuantity) {
        return res.status(400).json({ message: `Return quantity for ${orderItem.name} must be between 1 and ${remainingQuantity}.` });
      }

      normalizedReturnItems.push({
        productId: orderItem.product || orderItem.productId,
        name: orderItem.name,
        quantity,
      });
    }

    const createdReturn = await Return.create({
      orderId: order._id,
      userId,
      items: normalizedReturnItems,
      reason,
      status: "requested",
    });

    for (const item of normalizedReturnItems) {
      const product = await Product.findById(item.productId);
      if (!product) {
        continue;
      }

      product.stock += Number(item.quantity || 0);
      await product.save();
      await syncInventoryForProduct(product);
      await createStockMovement({
        productId: product._id,
        type: "return",
        quantity: Number(item.quantity || 0),
        referenceType: "return",
        referenceId: createdReturn._id,
        notes: `Stock restored for return request ${createdReturn._id}.`,
      });
    }

    const totalOrderedByProduct = new Map();
    order.items.forEach((item) => {
      const key = String(item.product || item.productId);
      totalOrderedByProduct.set(key, (totalOrderedByProduct.get(key) || 0) + Number(item.quantity || 0));
    });

    normalizedReturnItems.forEach((item) => {
      const key = String(item.productId);
      alreadyReturnedByProduct.set(key, (alreadyReturnedByProduct.get(key) || 0) + Number(item.quantity || 0));
    });

    const fullyReturned = Array.from(totalOrderedByProduct.entries()).every(
      ([productId, orderedQuantity]) => (alreadyReturnedByProduct.get(productId) || 0) >= orderedQuantity,
    );

    if (fullyReturned) {
      order.status = "returned";
      await order.save();
    }

    const populatedReturn = await Return.findById(createdReturn._id)
      .populate("orderId")
      .populate("userId");

    res.status(201).json(populatedReturn);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAdminOverview = async (_req, res) => {
  try {
    const [products, categories, orders] = await Promise.all([
      Product.find().populate("category"),
      require("../models/Category").find(),
      Order.find().sort({ createdAt: -1 }).limit(10).populate("user"),
    ]);

    await syncInventoryForProducts(products);

    const inventory = await Inventory.find()
      .populate({
        path: "productId",
        populate: { path: "category" },
      })
      .sort({ updatedAt: -1 });

    const now = new Date();
    const start = startOfDay(now);
    const [allOrders, expenses, purchases, purchaseItems] = await Promise.all([
      Order.find(),
      Expense.find(),
      Purchase.find(),
      PurchaseItem.find().populate("productId"),
    ]);

    const totalRevenue = allOrders.reduce((sum, order) => sum + Number(order.totalAmount ?? order.totals?.grandTotal ?? 0), 0);
    const todayRevenue = allOrders
      .filter((order) => new Date(order.createdAt) >= start)
      .reduce((sum, order) => sum + Number(order.totalAmount ?? order.totals?.grandTotal ?? 0), 0);
    const validPurchases = new Set(
      purchases.filter((purchase) => purchase.status !== "cancelled").map((purchase) => String(purchase._id)),
    );
    const totalPurchaseCost = purchaseItems
      .filter((item) => validPurchases.has(String(item.purchaseId)))
      .reduce((sum, item) => sum + Number(item.subtotal || 0), 0);
    const totalExpenses = expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
    const todayExpenses = expenses
      .filter((expense) => new Date(expense.expenseDate || expense.createdAt) >= start)
      .reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
    const grossProfit = totalRevenue - totalPurchaseCost;
    const netProfit = grossProfit - totalExpenses;
    const todayNetProfit = todayRevenue - todayExpenses;
    const lowStockProducts = products.filter((product) => Number(product.stock || 0) <= 5);

    res.json({
      metrics: {
        totalRevenue,
        todayRevenue,
        totalPurchaseCost,
        totalExpenses,
        todayExpenses,
        grossProfit,
        netProfit,
        todayNetProfit,
        totalOrders: allOrders.length,
        totalProducts: products.length,
        totalCategories: categories.length,
        lowStockCount: lowStockProducts.length,
      },
      recentOrders: orders,
      lowStockProducts,
      products,
      inventory,
      categories,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createOrder,
  getOrdersByUser,
  getAllOrders,
  updateOrderStatus,
  getReturnsByUser,
  createReturnForOrder,
  getAdminOverview,
  DELIVERY_FEE,
};
