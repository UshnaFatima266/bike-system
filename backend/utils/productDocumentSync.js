const Brand = require("../models/Brand");
const Category = require("../models/Category");

async function ensureBrandRecord(name) {
  const normalizedName = String(name || "Universal").trim() || "Universal";
  return Brand.findOneAndUpdate(
    { name: normalizedName },
    { name: normalizedName, description: `${normalizedName} parts and accessories` },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  );
}

async function ensureCategoryRecord(categoryValue) {
  if (categoryValue) {
    const categoryById = await Category.findById(categoryValue);
    if (categoryById) {
      return categoryById;
    }

    if (typeof categoryValue === "string" && !/^[a-f0-9]{24}$/i.test(categoryValue)) {
      const categoryByName = await Category.findOne({ name: categoryValue.trim() });
      if (categoryByName) {
        return categoryByName;
      }
    }
  }

  return Category.findOneAndUpdate(
    { name: "General Parts" },
    { name: "General Parts", description: "Fallback category for workshop and retail parts" },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  );
}

async function prepareProductPayload(payload) {
  const prepared = { ...payload };
  const brandRecord = await ensureBrandRecord(prepared.brand || "Universal");
  const categoryRecord = await ensureCategoryRecord(prepared.category);

  prepared.brand = brandRecord.name;
  prepared.brandId = brandRecord._id;
  prepared.category = categoryRecord._id;
  prepared.categoryId = categoryRecord._id;

  prepared.isActive = prepared.isActive ?? true;
  return prepared;
}

module.exports = {
  ensureBrandRecord,
  ensureCategoryRecord,
  prepareProductPayload,
};
