// const mongoose = require("mongoose");

// const MasterDataSchema = new mongoose.Schema({
//   category: {
//     type: String,
//     required: true,
//     index: true // Searching fast karne ke liye
//   },
//   label: { type: String, required: true }, // "English 🇺🇸"
//   value: { type: String, required: true }, // "english" (no emoji)
// }, { timestamps: true });

// // Ensure ek category mein duplicate values na ho
// MasterDataSchema.index({ category: 1, value: 1 }, { unique: true });

// module.exports = mongoose.model("MasterData", MasterDataSchema);

const mongoose = require("mongoose");

const MasterDataSchema = new mongoose.Schema({
  category: { type: String, required: true, index: true },
  label: { type: String, required: true },
  value: { type: String, required: true }, // Isse hum "id" ki tarah response mein bhejenge
  subtitle: { type: String, default: null }, // Specifically for Relationship Goals
});

module.exports = mongoose.model("MasterData", MasterDataSchema);
