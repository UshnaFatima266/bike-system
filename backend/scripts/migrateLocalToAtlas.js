require("dotenv").config();
const mongoose = require("mongoose");
const { models } = require("../models");

const LOCAL_URI = process.env.LOCAL_MONGO_URI || "mongodb://127.0.0.1:27017/bikeDB";
const ATLAS_URI = process.env.ATLAS_MONGO_URI;

async function migrateCollection(sourceConnection, targetConnection, model) {
  const collectionName = model.collection.collectionName;
  const sourceModel = sourceConnection.model(model.modelName, model.schema, collectionName);
  const docs = await sourceModel.find().lean();

  if (!docs.length) {
    return { collectionName, migrated: 0 };
  }

  const targetCollection = targetConnection.db.collection(collectionName);
  const existingIds = new Set((await targetCollection.find({}, { projection: { _id: 1 } }).toArray()).map((item) => String(item._id)));
  const docsToInsert = docs.filter((doc) => !existingIds.has(String(doc._id)));

  if (docsToInsert.length) {
    await targetCollection.insertMany(docsToInsert, { ordered: false });
  }

  return { collectionName, migrated: docsToInsert.length };
}

async function runMigration() {
  if (!ATLAS_URI) {
    throw new Error("ATLAS_MONGO_URI is missing in backend/.env");
  }

  const localConnection = await mongoose.createConnection(LOCAL_URI).asPromise();
  const atlasConnection = await mongoose.createConnection(ATLAS_URI).asPromise();

  try {
    const results = [];

    for (const model of Object.values(models)) {
      const migrated = await migrateCollection(localConnection, atlasConnection, model);
      results.push(migrated);
    }

    console.log(JSON.stringify(results, null, 2));
  } finally {
    await localConnection.close();
    await atlasConnection.close();
  }
}

runMigration().catch((error) => {
  console.error("Migration failed", error);
  process.exit(1);
});
