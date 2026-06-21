const mongoose = require("mongoose");

const models = {
  ActivityLog: require("./ActivityLog"),
  AuthVerification: require("./AuthVerification"),
  Brand: require("./Brand"),
  Cart: require("./Cart"),
  CartItem: require("./CartItem"),
  User: require("./User"),
  Expense: require("./Expense"),
  Supplier: require("./Supplier"),
  StockMovement: require("./StockMovement"),
  ShippingAddress: require("./ShippingAddress"),
  Shipment: require("./Shipment"),
  SalesReport: require("./SalesReport"),
  Role: require("./Role"),
  Return: require("./Return"),
  Purchase: require("./Purchase"),
  PurchaseItem: require("./PurchaseItem"),
  Product: require("./Product"),
  ProductImage: require("./ProductImage"),
  PosSale: require("./PosSale"),
  PosSaleItem: require("./PosSaleItem"),
  Payment: require("./Payment"),
  Order: require("./Order"),
  OrderItem: require("./OrderItem"),
  Inventory: require("./Inventory"),
  Category: require("./Category"),
};

async function initializeCollections() {
  const existingCollections = await mongoose.connection.db.listCollections().toArray();
  const existingNames = new Set(existingCollections.map((collection) => collection.name));

  for (const model of Object.values(models)) {
    const collectionName = model.collection.collectionName;
    if (!existingNames.has(collectionName)) {
      await model.createCollection();
    }
  }
}

module.exports = { models, initializeCollections };
