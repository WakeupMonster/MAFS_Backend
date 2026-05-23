const dns = require('dns');
try { dns.setServers(['8.8.8.8']); } catch (e) {}

const mongoose = require('mongoose');
require('dotenv').config();

async function addIndexes() {
  const uri = process.env.MONGODB_URI;
  await mongoose.connect(uri);

  const Profile = require('../modules/profile/profile.model');
  const Swipe = require('../modules/matches/swipe/swipe.model');
  const { Match } = require('../modules/matches/swipe/swipe.model');

  console.log("Creating Profile indexes...");
  await Profile.collection.createIndex({ "discovery.globalVisibility": 1, "verification.status": 1, "isMandatoryComplete": 1 });
  await Profile.collection.createIndex({ location: "2dsphere" });

  console.log("Creating Swipe indexes...");
  await Swipe.collection.createIndex({ swiperId: 1, targetId: 1 }, { unique: true });
  await Swipe.collection.createIndex({ targetId: 1, action: 1 });

  console.log("Creating Match indexes...");
  await Match.collection.createIndex({ users: 1 });

  console.log("✅ All indexes created successfully!");
  await mongoose.disconnect();
}

addIndexes().catch(e => {
  console.error("Error creating indexes:", e);
  process.exit(1);
});
