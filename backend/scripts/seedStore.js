require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const { initializeCollections } = require("../models");
const { bootstrapStore } = require("../utils/bootstrapStore");

async function seedStore() {
  try {
    await connectDB();
    await initializeCollections();
    const result = await bootstrapStore();

    if (result.seeded) {
      console.log(`Seeded ${result.productCount} products and ${result.categoryCount} categories.`);
    } else {
      console.log(
        `Seed skipped because data already exists. Current counts: ${result.productCount} products, ${result.categoryCount} categories.`,
      );
    }
  } catch (error) {
    console.error("Failed to seed store", error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

seedStore();
