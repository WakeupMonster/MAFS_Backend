const mongoose = require("mongoose");

const InterestSchema = new mongoose.Schema(
  { label: { type: String, required: true, unique: true } },
  { timestamps: true }
);

const LanguageSchema = new mongoose.Schema(
  { label: { type: String, required: true, unique: true } },
  { timestamps: true }
);

const ReligionSchema = new mongoose.Schema(
  { label: { type: String, required: true, unique: true } },
  { timestamps: true }
);

// Correct Export
const Interest = mongoose.model("Interest", InterestSchema);
const Language = mongoose.model("Language", LanguageSchema);
const Religion = mongoose.model("Religion", ReligionSchema);

module.exports = { Interest, Language, Religion };