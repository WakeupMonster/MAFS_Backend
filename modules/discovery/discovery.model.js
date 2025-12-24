const mongoose = require("mongoose");

const DiscoverySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    unique: true
  },

  ageRange: {
    min: { type: Number, default: 18 },
    max: { type: Number, default: 60 }
  },

  genderPreference: {
    type: [String], // ["male","female"]
    default: []
  },

  maxDistanceKm: {
    type: Number,
    default: 50
  },

  interests: {
    type: [String],
    default: []
  }

}, { timestamps: true });

module.exports = mongoose.model("DiscoveryPreference", DiscoverySchema);