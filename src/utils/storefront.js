const priceFormatter = new Intl.NumberFormat("en-PK", {
  style: "currency",
  currency: "PKR",
  maximumFractionDigits: 0,
});

export function formatPrice(value) {
  return priceFormatter.format(Number(value || 0));
}

export function getProductImageSources(product) {
  const slug = product?.imageBaseName || String(product?.name || "item")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const customImage = product?.image;
  const localSources = [
    `/products/${slug}.png`,
    `/products/${slug}.jpg`,
    `/products/${slug}.jpeg`,
    `/products/${slug}.webp`,

    
  ];

  return customImage ? [customImage, ...localSources.filter((item) => item !== customImage)] : localSources;
}
