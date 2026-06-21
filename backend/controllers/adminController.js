const { models } = require("../models");

const resourceMap = {
  brands: models.Brand,
  cart: models.Cart,
  cartItems: models.CartItem,
  users: models.User,
  expenses: models.Expense,
  suppliers: models.Supplier,
  stockMovements: models.StockMovement,
  shippingAddresses: models.ShippingAddress,
  shipments: models.Shipment,
  salesReports: models.SalesReport,
  roles: models.Role,
  returns: models.Return,
  purchases: models.Purchase,
  purchaseItems: models.PurchaseItem,
  products: models.Product,
  productImages: models.ProductImage,
  posSales: models.PosSale,
  posSaleItems: models.PosSaleItem,
  payments: models.Payment,
  orders: models.Order,
  orderItems: models.OrderItem,
  inventory: models.Inventory,
  categories: models.Category,
};

function getResourceModel(resource) {
  return resourceMap[resource];
}

function normalizeDocument(document) {
  if (!document) {
    return null;
  }

  const item = document.toObject ? document.toObject() : document;
  return {
    ...item,
    id: String(item._id),
  };
}

const getResourceList = async (req, res) => {
  try {
    const Model = getResourceModel(req.params.resource);

    if (!Model) {
      return res.status(404).json({ message: "Resource not found." });
    }

    const items = await Model.find().sort({ createdAt: -1 }).limit(100);
    res.json(items.map(normalizeDocument));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createResourceItem = async (req, res) => {
  try {
    const Model = getResourceModel(req.params.resource);

    if (!Model) {
      return res.status(404).json({ message: "Resource not found." });
    }

    const item = await Model.create(req.body);
    res.status(201).json(normalizeDocument(item));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateResourceItem = async (req, res) => {
  try {
    const Model = getResourceModel(req.params.resource);

    if (!Model) {
      return res.status(404).json({ message: "Resource not found." });
    }

    const item = await Model.findByIdAndUpdate(req.params.id, req.body, { returnDocument: "after", runValidators: true });

    if (!item) {
      return res.status(404).json({ message: "Document not found." });
    }

    res.json(normalizeDocument(item));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteResourceItem = async (req, res) => {
  try {
    const Model = getResourceModel(req.params.resource);

    if (!Model) {
      return res.status(404).json({ message: "Resource not found." });
    }

    const item = await Model.findByIdAndDelete(req.params.id);

    if (!item) {
      return res.status(404).json({ message: "Document not found." });
    }

    res.json({ message: "Document deleted successfully." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getResourceNames = async (_req, res) => {
  res.json(Object.keys(resourceMap));
};

module.exports = {
  getResourceNames,
  getResourceList,
  createResourceItem,
  updateResourceItem,
  deleteResourceItem,
};
