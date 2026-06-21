const ProductImage = require("../models/ProductImage");
const { inferProductImagePath } = require("./productMediaDefaults");

async function syncPrimaryProductImage(product) {
  if (!product?._id) {
    return null;
  }
  const imageUrl = product.image || inferProductImagePath(product);

  const existing = await ProductImage.findOne({ productId: product._id, isPrimary: true });

  if (!imageUrl) {
    if (existing) {
      await existing.deleteOne();
    }
    return null;
  }

  const payload = {
    productId: product._id,
    imageUrl,
    altText: product.name || "",
    isPrimary: true,
  };

  if (existing) {
    Object.assign(existing, payload);
    return existing.save();
  }

  return ProductImage.create(payload);
}

async function removeProductImages(productId) {
  if (!productId) {
    return null;
  }

  return ProductImage.deleteMany({ productId });
}

module.exports = {
  syncPrimaryProductImage,
  removeProductImages,
};
