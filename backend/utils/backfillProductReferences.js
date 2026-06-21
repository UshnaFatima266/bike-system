const Product = require("../models/Product");
const { prepareProductPayload } = require("./productDocumentSync");

async function backfillProductReferences() {
  const products = await Product.find();
  let updated = 0;

  for (const product of products) {
    if (product.brandId && product.categoryId && typeof product.isActive === "boolean") {
      continue;
    }

    const payload = await prepareProductPayload({
      brand: product.brand,
      category: product.category,
      isActive: product.isActive,
    });

    product.brand = payload.brand;
    product.brandId = payload.brandId;
    product.category = payload.category;
    product.categoryId = payload.categoryId;
    product.isActive = payload.isActive;
    await product.save();
    updated += 1;
  }

  return { updated };
}

module.exports = { backfillProductReferences };
