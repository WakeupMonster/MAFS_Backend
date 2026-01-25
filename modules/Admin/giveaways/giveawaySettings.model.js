const mongoose = require("mongoose");

const giveawaySettingsSchema = new mongoose.Schema({
  yearlyWinLimitPerUser: {
    type: Number,
    default: 2,
    min: 1
  },
  updatedByAdmin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }
}, { timestamps: true });

module.exports = mongoose.model(
  "GiveawaySettings",
  giveawaySettingsSchema
);
