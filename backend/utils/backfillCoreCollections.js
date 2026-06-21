const Brand = require("../models/Brand");
const Role = require("../models/Role");
const Product = require("../models/Product");

async function backfillRoles() {
  const roleDefinitions = [
    { name: "user", description: "Regular storefront customer" },
    { name: "admin", description: "System administrator" },
    { name: "manager", description: "Operations manager" },
    { name: "staff", description: "Store staff member" },
  ];

  for (const role of roleDefinitions) {
    const existingRole = await Role.findOne({ name: role.name });
    if (existingRole) {
      if (existingRole.description !== role.description) {
        existingRole.description = role.description;
        await existingRole.save();
      }
    } else {
      await Role.create(role);
    }
  }
}

async function backfillBrands() {
  const distinctBrands = (await Product.distinct("brand")).filter(Boolean);

  for (const brandName of distinctBrands) {
    await Brand.findOneAndUpdate(
      { name: brandName },
      { name: brandName, description: `${brandName} parts and accessories` },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    );
  }
}

async function backfillCoreCollections() {
  await Promise.all([backfillRoles(), backfillBrands()]);
}

module.exports = { backfillCoreCollections };
