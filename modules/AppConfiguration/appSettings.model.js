const mongoose = require("mongoose");

const AppSettingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true
      // example: "social_links"
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("AppSettings", AppSettingsSchema);