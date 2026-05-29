const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

async function dumpIndexes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to DB");
    
    const collections = await mongoose.connection.db.listCollections().toArray();
    const indexData = {};
    
    for (const col of collections) {
      const indexes = await mongoose.connection.db.collection(col.name).indexes();
      indexData[col.name] = indexes;
    }
    
    require("fs").writeFileSync("indexes_dump.json", JSON.stringify(indexData, null, 2));
    console.log("Indexes dumped to indexes_dump.json");
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

dumpIndexes();