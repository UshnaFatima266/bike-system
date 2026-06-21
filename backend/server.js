const express = require("express");
const cors = require("cors");
require("dotenv").config({ quiet: true });
const connectDB = require("./config/db");
const { initializeCollections } = require("./models");
const { bootstrapStore } = require("./utils/bootstrapStore");
const { backfillStoreRelations } = require("./utils/backfillStoreRelations");
const { backfillCoreCollections } = require("./utils/backfillCoreCollections");
const { backfillStockMovements } = require("./utils/backfillStockMovements");
const { backfillProductReferences } = require("./utils/backfillProductReferences");
const { syncCatalogAssignments } = require("./utils/syncCatalogAssignments");

const app = express();

app.use(cors());
app.use(express.json());
app.get("/", (req, res) => {
  res.json({
    message: "🚀 Bike System API is running",
    status: "OK"
  });
});

const productRoutes = require("./routes/productRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const authRoutes = require("./routes/authRoutes");
const orderRoutes = require("./routes/orderRoutes");
const adminRoutes = require("./routes/adminRoutes");
const cartRoutes = require("./routes/cartRoutes");
const posRoutes = require("./routes/posRoutes");

app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/pos", posRoutes);

const startServer = async () => {
  try {
    await connectDB();
    await initializeCollections();
    const bootstrapResult = await bootstrapStore();
    if (bootstrapResult.seeded) {
      console.log(
        `Starter catalogue seeded: ${bootstrapResult.productCount} products and ${bootstrapResult.categoryCount} categories.`,
      );
    }
    await backfillStoreRelations();
    await backfillCoreCollections();
    const productReferenceResult = await backfillProductReferences();
    if (productReferenceResult.updated) {
      console.log(`Product reference fields repaired for ${productReferenceResult.updated} products.`);
    }
    const catalogAssignmentResult = await syncCatalogAssignments();
    if (catalogAssignmentResult.updated) {
      console.log(`Catalog assignments synced for ${catalogAssignmentResult.updated} products.`);
    }
    const stockMovementResult = await backfillStockMovements();
    if (stockMovementResult.created) {
      console.log(`Stock movement history initialized with ${stockMovementResult.created} opening records.`);
    }
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server", error);
    process.exit(1);
  }
};

startServer();
