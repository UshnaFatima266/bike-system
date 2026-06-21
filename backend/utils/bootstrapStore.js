const Category = require("../models/Category");
const Product = require("../models/Product");
const { syncInventoryForProducts } = require("./inventorySync");
const { syncPrimaryProductImage } = require("./productImageSync");

const starterCategories = [
  { name: "Bikes" },
  { name: "Safety Gear" },
  { name: "Brakes" },
  { name: "Transmission" },
  { name: "Electrical" },
  { name: "Service Parts" },
];

const starterProducts = [
  {
    name: "Mountain Bike",
    brand: "Phoenix",
    price: 150000,
    image: "/products/mountain-bike.png",
    description: "Durable mountain bike designed for trail rides, workshop servicing, and daily performance checks.",
    sku: "BIKE-MTB-001",
    category: "Bikes",
    stock: 8,
    specs: ["All-terrain frame", "Workshop tuned", "Disc-ready build"],
  },
  {
    name: "Helmet",
    brand: "Universal",
    price: 3000,
    image: "/products/helmet.png",
    description: "Protective rider helmet with a clean visor profile and workshop-ready fit for daily use.",
    sku: "SAFE-HELM-002",
    category: "Bikes",
    stock: 20,
    specs: ["Full-face shell", "Comfort lining", "Daily ride protection"],
  },
  {
    name: "Brake Pad",
    brand: "Honda",
    price: 1200,
    image: "/products/brake-pad.png",
    description: "Reliable brake pad built for controlled stopping, reduced noise, and consistent workshop fitment.",
    sku: "BRK-PAD-003",
    category: "Bikes",
    stock: 50,
    specs: ["Heat resistant", "Low dust", "Front wheel fitment"],
  },
  {
    name: "Chain Set",
    brand: "Yamaha",
    price: 3500,
    image: "/products/chain-set.png",
    description: "Heavy-duty chain set that supports smooth power transfer and dependable road performance.",
    sku: "TRN-CHN-004",
    category: "Bikes",
    stock: 15,
    specs: ["Steel sprockets", "Road tested", "Workshop ready"],
  },
  {
    name: "Clutch Plate",
    brand: "Pak Suzuki Motors",
    price: 1800,
    image: "/products/clutch-plate.png",
    description: "Clutch plate assembly engineered for responsive gear engagement and longer wear life.",
    sku: "TRN-CLT-005",
    category: "Bikes",
    stock: 25,
    specs: ["Smooth engagement", "Reliable bite", "Daily rider fitment"],
  },
  {
    name: "Spark Plug",
    brand: "United Auto Industries",
    price: 600,
    image: "/products/spark-plug.png",
    description: "Efficient spark plug for cleaner ignition, stronger starts, and easy service replacement.",
    sku: "ELE-SPK-006",
    category: "Bikes",
    stock: 40,
    specs: ["Fast ignition", "Clean combustion", "Workshop favorite"],
  },
  {
    name: "Battery",
    brand: "Honda",
    price: 5000,
    image: "/products/battery.png",
    description: "Long-life motorcycle battery built for stable starts and dependable electrical output.",
    sku: "ELE-BAT-007",
    category: "Bikes",
    stock: 10,
    specs: ["Stable voltage", "Long cycle life", "Road-ready power"],
  },
  {
    name: "Air Filter",
    brand: "Yamaha",
    price: 900,
    image: "/products/air-filter.png",
    description: "Air filter element that improves intake cleanliness and supports steady engine breathing.",
    sku: "SRV-AIR-008",
    category: "Bikes",
    stock: 20,
    specs: ["Dust capture", "Workshop fit", "Easy replacement"],
  },
  {
    name: "Indicator",
    brand: "Universal",
    price: 350,
    image: "/products/indicator.jpg",
    description: "Clear lens indicator light for safe signaling and reliable visibility on all road conditions.",
    sku: "ELE-IND-009",
    category: "Electrical",
    stock: 35,
    specs: ["Clear lens", "Weather sealed", "Universal fit"],
  },
  {
    name: "Engine Oil",
    brand: "ZIC",
    price: 800,
    image: "/products/engine-oil.png",
    description: "Engine oil for smoother running, better lubrication, and quick routine maintenance.",
    sku: "SRV-OIL-009",
    category: "Bikes",
    stock: 30,
    specs: ["Smooth lubrication", "Service essential", "Workshop stock"],
  },
];

async function bootstrapStore() {
  const [productCount, categoryCount] = await Promise.all([
    Product.countDocuments(),
    Category.countDocuments(),
  ]);

  if (productCount > 0 || categoryCount > 0) {
    return { seeded: false, productCount, categoryCount };
  }

  const createdCategories = await Category.insertMany(starterCategories);
  const categoryMap = new Map(createdCategories.map((category) => [category.name, category._id]));

  const createdProducts = await Product.insertMany(
    starterProducts.map((product) => ({
      ...product,
      category: categoryMap.get(product.category),
    })),
  );

  await syncInventoryForProducts(createdProducts);
  await Promise.all(createdProducts.map((product) => syncPrimaryProductImage(product)));

  return {
    seeded: true,
    productCount: createdProducts.length,
    categoryCount: createdCategories.length,
  };
}

module.exports = { bootstrapStore };
