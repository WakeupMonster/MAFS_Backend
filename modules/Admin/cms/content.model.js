// models/faq.model.js
const mongoose = require("mongoose");

// const contentSchema = new mongoose.Schema(
//   {
//     type: {
//       type: String,
//       enum: ["faq", "privacy_policy", "terms_conditions"],
//       required: true,
//       unique: true,
//     },

//     title: String,

//     // For Privacy Policy & Terms
//     sections: [
//       {
//         heading: String,
//         body: String,
//       },
//     ],

//     // For FAQ
//     faqs: [
//       {
//         question: String,
//         answer: String,
//       },
//     ],
//   },
//   { timestamps: true }
// );

// module.exports = mongoose.model("Content", contentSchema);

const faqSchema = new mongoose.Schema(
  {
    question: { type: String, required: true, trim: true },
    answer: { type: String, required: true, trim: true },
    category: {
      type: String,
      required: true,
      enum: [
        "general",
        "account",
        "dating",
        "subscriptions",
        "troubleshooting",
        "security_privacy",
        "safety_reporting",
        "other",
      ],
      default: "general",
      index: true, // 🚀 important for filtering
    },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const sectionSchema = new mongoose.Schema({
  order: { type: Number, required: true },
  heading: { type: String, required: true },
  paragraph: { type: String },
  list: [{ type: String }],
});

// const privacyPolicySchema = new mongoose.Schema(
//   {
//     title: { type: String, default: "Privacy & Policy" },
//     sections: { type: [sectionSchema], default: [] },
//   },
//   { timestamps: true }
// );

const privacyPolicySchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    // status: {
    //   type: String,
    //   enum: ["Publish", "Draft", "Unpublish"],
    //   default: "Publish",
    // },
    description: { type: String, required: true }, // Stores the full HTML string
  },
  { timestamps: true }
);

const termsSchema = new mongoose.Schema(
  {
    title: { type: String, default: "Terms And Conditions" },
    // sections: { type: [sectionSchema], default: [] },
    description: { type: String, required: true }, // Stores the full HTML string
  },
  { timestamps: true }
);

faqSchema.index({ category: 1, order: 1, _id: 1 });
const Faq = mongoose.model("Faq", faqSchema);
const PrivacyPolicy = mongoose.model("PrivacyPolicy", privacyPolicySchema);
const TermsConditions = mongoose.model("TermsConditions", termsSchema);

module.exports = { Faq, PrivacyPolicy, TermsConditions };
