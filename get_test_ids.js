require('dotenv').config();
const mongoose = require('mongoose');

async function getIds() {
  try {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    await mongoose.connect(uri);
    
    // Using native driver collection to avoid model schema dependencies
    const profiles = await mongoose.connection.db.collection('profiles')
      .find({}, { projection: { userId: 1 } })
      .limit(10)
      .toArray();
      
    console.log("--- COPY THESE IDS ---");
    console.log(JSON.stringify(profiles.map(p => p.userId.toString()), null, 2));
    
    process.exit(0);
  } catch (err) {
    console.error("Error fetching IDs:", err);
    process.exit(1);
  }
}

getIds();
