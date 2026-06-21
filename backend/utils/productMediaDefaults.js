function slugify(value) {
  return String(value ?? "item")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function inferProductImagePath(product) {
  if (!product?.name) {
    return "";
  }

  return `/products/${slugify(product.name)}.png`;
}

async function ensureProductImagePath(product) {
  if (!product) {
    return null;
  }

  if (product.image) {
    return product;
  }

  product.image = inferProductImagePath(product);
  await product.save();
  return product;
}

module.exports = {
  inferProductImagePath,
  ensureProductImagePath,
};
