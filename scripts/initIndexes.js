// // src/scripts/initIndexes.js
// require("dotenv").config();
// const mongoose = require("mongoose");

// (async () => {
//   try {
//     await mongoose.connect(process.env.MONGODB_URI);

//     const db = mongoose.connection.db;

//     console.log("Creating MongoDB indexes...");

//     // PROFILES COLLECTION
//     // await db.collection("profiles").createIndex(
//     //   { "location.coordinates": "2dsphere" },
//     //   { name: "profiles_location_2dsphere" }
//     // );

//     await db.collection("profiles").createIndex(
//       { isDiscoverable: 1, gender: 1 },
//       { name: "profiles_discoverable_gender" }
//     );

//     // USERS COLLECTION
//     await db.collection("users").createIndex(
//       { phone: 1 },
//       { name: "users_phone" }
//     );

//     await db.collection("users").createIndex(
//       { email: 1 },
//       { sparse: true, name: "users_email" }
//     );

//     await db.collection("users").createIndex(
//       { "refreshTokens.expiresAt": 1 },
//       { name: "users_refreshTokens_expiresAt" }
//     );

//     // SWIPES COLLECTION
//     await db.collection("swipes").createIndex(
//       { swiperId: 1, targetId: 1 },
//       { unique: true, name: "swipes_unique_swipe" }
//     );

//     await db.collection("swipes").createIndex(
//       { swiperId: 1 },
//       { name: "swipes_swiperId" }
//     );

//     // MATCHES COLLECTION
//     await db.collection("matches").createIndex(
//       { users: 1 },
//       { name: "matches_users" }
//     );

//     console.log("All indexes created successfully.");
//     process.exit(0);

//   } catch (err) {
//     console.error("Index error:", err);
//     process.exit(1);
//   }
// })();



require("dotenv").config();
const mongoose = require("mongoose");

async function safeCreateIndex(collection, field, options = {}) {
  try {
    await collection.createIndex(field, options);
    console.log(`Index created: ${options.name || JSON.stringify(field)}`);
  } catch (err) {
    // Ignore already existing indexes
    if (err.code === 85 || err.codeName === "IndexOptionsConflict") {
      console.log(`Index already exists, skipping: ${options.name}`);
    } else if (err.code === 11000) {
      console.log(`Duplicate index exists, skipping: ${options.name}`);
    } else {
      console.error("Index creation error:", err);
    }
  }
}

(async () => {
  try {
    if (!process.env.MONGODB_URI) throw new Error("MONGO_URI missing in .env");

    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;
    console.log("MongoDB connected. Creating indexes...");

    const profiles = db.collection("profiles");
    const users = db.collection("users");
    const swipes = db.collection("swipes");
    const matches = db.collection("matches");

    // ---- PROFILE INDEXES ----

    // 2dsphere index (Mongoose already created, so just skip if exists)
    await safeCreateIndex(
      profiles,
      { "location.coordinates": "2dsphere" },
      { name: "location_2dsphere" }
    );

    await safeCreateIndex(
      profiles,
      { isDiscoverable: 1, gender: 1 },
      { name: "discoverable_gender" }
    );

    // ---- USER INDEXES ----

    await safeCreateIndex(users, { phone: 1 }, { name: "phone_index" });

    await safeCreateIndex(
      users,
      { email: 1 },
      { sparse: true, name: "email_sparse_index" }
    );

    await safeCreateIndex(
      users,
      { "refreshTokens.expiresAt": 1 },
      { name: "refresh_expiry_index" }
    );

    // ---- SWIPES INDEXES ----

    await safeCreateIndex(
      swipes,
      { swiperId: 1, targetId: 1 },
      { unique: true, name: "unique_swipe" }
    );

    await safeCreateIndex(
      swipes,
      { swiperId: 1 },
      { name: "swipes_swiperId" }
    );

    // ---- MATCHES INDEX ----

    await safeCreateIndex(matches, { users: 1 }, { name: "matches_users" });

    console.log("All indexes created safely.");
    process.exit(0);

  } catch (err) {
    console.error("Index error:", err);
    process.exit(1);
  }
})();
