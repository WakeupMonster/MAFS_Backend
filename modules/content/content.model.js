const mongoose = require("mongoose");

const contentSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["faq", "privacy_policy", "terms_conditions"],
      required: true,
      unique: true
    },

    title: String,

    // For Privacy Policy & Terms
    sections: [
      {
        heading: String,
        body: String
      }
    ],

    // For FAQ
    faqs: [
      {
        question: String,
        answer: String
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model("Content", contentSchema);
