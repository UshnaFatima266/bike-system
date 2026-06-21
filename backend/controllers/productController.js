const Product = require("../models/Product");
const Order = require("../models/Order");
const { syncInventoryForProduct, removeInventoryForProduct } = require("../utils/inventorySync");
const { syncPrimaryProductImage, removeProductImages } = require("../utils/productImageSync");
const { createStockMovement } = require("../utils/stockMovementLog");
const { prepareProductPayload } = require("../utils/productDocumentSync");

const createProduct = async (req, res) => {
  try {
    const payload = await prepareProductPayload(req.body);
    const product = await Product.create(payload);
    await syncInventoryForProduct(product);
    await syncPrimaryProductImage(product);
    if (Number(product.stock || 0) > 0) {
      await createStockMovement({
        productId: product._id,
        type: "in",
        quantity: Number(product.stock),
        referenceType: "manual",
        notes: "Initial stock created from admin product form.",
      });
    }
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getProducts = async (req, res) => {
  try {
    const [products, orders] = await Promise.all([
      Product.find().populate("category"),
      Order.find().select("items"),
    ]);

    const soldCountByProductId = new Map();

    for (const order of orders) {
      for (const item of order.items || []) {
        const key = String(item.product);
        soldCountByProductId.set(key, (soldCountByProductId.get(key) || 0) + Number(item.quantity || 0));
      }
    }

    res.json(
      products.map((product) => {
        const productObject = product.toObject();
        const dealEndsAt = productObject.dealEndsAt ? new Date(productObject.dealEndsAt) : null;
        if (productObject.isDealActive && dealEndsAt && dealEndsAt < new Date()) {
          productObject.isDealActive = false;
        }
        productObject.soldCount = soldCountByProductId.get(String(product._id)) || 0;
        return productObject;
      }),
    );
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate("category");

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateProduct = async (req, res) => {
  try {
    const previousProduct = await Product.findById(req.params.id);
    const payload = await prepareProductPayload(req.body);
    const product = await Product.findByIdAndUpdate(req.params.id, payload, {
      returnDocument: "after",
      runValidators: true,
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    await syncInventoryForProduct(product);
    await syncPrimaryProductImage(product);

    const previousStock = Number(previousProduct?.stock || 0);
    const nextStock = Number(product.stock || 0);
    const stockDifference = nextStock - previousStock;

    if (stockDifference !== 0) {
      await createStockMovement({
        productId: product._id,
        type: stockDifference > 0 ? "in" : "adjustment",
        quantity: Math.abs(stockDifference),
        referenceType: "manual",
        notes: "Stock updated from admin product editor.",
      });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    await removeInventoryForProduct(product._id);
    await removeProductImages(product._id);
    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const purchaseProducts = async (req, res) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items) || !items.length) {
      return res.status(400).json({ message: "Purchase items are required" });
    }

    const purchasedProducts = [];

    for (const item of items) {
      const quantity = Number(item.quantity || 0);
      const product = await Product.findById(item.id);

      if (!product) {
        return res.status(404).json({ message: `Product not found: ${item.id}` });
      }

      if (quantity <= 0) {
        return res.status(400).json({ message: `Invalid quantity for ${product.name}` });
      }

      if (product.stock < quantity) {
        return res.status(400).json({ message: `Not enough stock for ${product.name}` });
      }

      product.stock -= quantity;
      await product.save();
      await syncInventoryForProduct(product);
      await createStockMovement({
        productId: product._id,
        type: "out",
        quantity,
        referenceType: "sale",
        notes: "Stock reduced after checkout purchase.",
      });
      purchasedProducts.push(product);
    }

    const refreshedProducts = await Product.find().populate("category");
    res.json({ message: "Purchase completed", products: refreshedProducts, purchasedProducts });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  purchaseProducts,
};
