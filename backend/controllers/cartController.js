const Cart = require("../models/Cart");
const CartItem = require("../models/CartItem");
const Product = require("../models/Product");

async function getOrCreateActiveCart(userId) {
  let cart = await Cart.findOne({ userId, status: "active" });

  if (!cart) {
    cart = await Cart.create({ userId, status: "active" });
  }

  return cart;
}

const getCartByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const cart = await getOrCreateActiveCart(userId);
    const items = await CartItem.find({ cartId: cart._id }).populate("productId");

    res.json({
      cart,
      items,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const syncCart = async (req, res) => {
  try {
    const { userId, items } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "User is required." });
    }

    const cart = await getOrCreateActiveCart(userId);
    await CartItem.deleteMany({ cartId: cart._id });

    const preparedItems = [];
    for (const item of items || []) {
      const quantity = Number(item.quantity || 0);
      if (quantity <= 0) {
        continue;
      }

      const product = await Product.findById(item.productId || item.id);
      if (!product) {
        continue;
      }

      preparedItems.push({
        cartId: cart._id,
        productId: product._id,
        quantity,
        price: Number(product.price || 0),
      });
    }

    if (preparedItems.length) {
      await CartItem.insertMany(preparedItems);
    }

    const refreshedItems = await CartItem.find({ cartId: cart._id }).populate("productId");
    res.json({ cart, items: refreshedItems });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const markCartOrdered = async (userId) => {
  if (!userId) {
    return null;
  }

  const cart = await Cart.findOne({ userId, status: "active" });
  if (!cart) {
    return null;
  }

  cart.status = "ordered";
  await cart.save();
  return cart;
};

module.exports = {
  getCartByUser,
  syncCart,
  markCartOrdered,
};
