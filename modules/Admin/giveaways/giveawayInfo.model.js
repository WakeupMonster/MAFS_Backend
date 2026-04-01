const mongoose = require("mongoose");

const giveawayInfoSchema = new mongoose.Schema(
  {
    brands: {
      type: [
        {
          heading: { type: String, required: true },
          subheading: { type: String, required: true },
        },
      ],
      default: [
        { heading: "Cineplex", subheading: "Cineplex" },
        { heading: "Holloywood Movie Gift Card", subheading: "Holloywood Movie Gift Card" },
      ],
    },
    howItWorks: [
      {
        heading: { type: String, required: true },
        subheading: { type: String, required: true },
      },
    ],
    importantInfo: {
      heading: { type: String, default: "Important info" },
      points: { type: [String], default: [] },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("GiveawayInfo", giveawayInfoSchema);
