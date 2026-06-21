const Category = require("../models/Category");
const Product = require("../models/Product");
const { ensureBrandRecord } = require("./productDocumentSync");

const brandByProductName = {
  "Mountain Bike": "Phoenix",
  Helmet: "Universal",
  "Brake Pad": "Honda",
  "Chain Set": "Yamaha",
  "Clutch Plate": "Pak Suzuki Motors",
  "Spark Plug": "United Auto Industries",
  Battery: "Honda",
  "Air Filter": "Yamaha",
  "Engine Oil": "ZIC",
};

async function syncCatalogAssignments() {
  const bikesCategory = await Category.findOneAndUpdate(
    { name: "Bikes" },
    { name: "Bikes" },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  );

  const products = await Product.find();
  let updated = 0;

  for (const product of products) {
    if (!brandByProductName[product.name]) {
      continue;
    }

    const targetBrandName = brandByProductName[product.name] || product.brand || "Universal";
    const brandRecord = await ensureBrandRecord(targetBrandName);
    const needsUpdate =
      String(product.category || "") !== String(bikesCategory._id) ||
      String(product.categoryId || "") !== String(bikesCategory._id) ||
      product.brand !== brandRecord.name ||
      String(product.brandId || "") !== String(brandRecord._id);

    if (!needsUpdate) {
      continue;
    }

    product.category = bikesCategory._id;
    product.categoryId = bikesCategory._id;
    product.brand = brandRecord.name;
    product.brandId = brandRecord._id;
    await product.save();
    updated += 1;
  }

  return { updated, bikesCategoryId: bikesCategory._id };
}

module.exports = { syncCatalogAssignments };
