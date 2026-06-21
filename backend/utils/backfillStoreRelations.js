const Product = require("../models/Product");
const { syncInventoryForProducts } = require("./inventorySync");
const { syncPrimaryProductImage } = require("./productImageSync");

async function backfillStoreRelations() {
  const products = await Product.find();

  if (!products.length) {
    return { productCount: 0 };
  }

  await syncInventoryForProducts(products);
  await Promise.all(products.map((product) => syncPrimaryProductImage(product)));

  return { productCount: products.length };
}

module.exports = { backfillStoreRelations };
