const mongoose = require("mongoose");

const InterestSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, unique: true },
    value: {
      type: String,
      required: true,
      set: (v) => v.toLowerCase().replace(/\s+/g, "-"), // auto-slug
    },
  },
  { timestamps: true }
);

const LanguageSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, unique: true, trim: true },
    value: { type: String, required: true, unique: true, trim: true },
  },
  { timestamps: true }
);

const ReligionSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, unique: true },
    value: { type: String, unique: true },
  },
  { timestamps: true }
);

ReligionSchema.pre("save", function (next) {
  if (!this.value) {
    this.value = this.label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-") // remove symbols
      .replace(/^-+|-+$/g, ""); // trim hyphens
  }
  next();
});

// Correct Export
const Interest = mongoose.model("Interest", InterestSchema);
const Language = mongoose.model("Language", LanguageSchema);
const Religion = mongoose.model("Religion", ReligionSchema);

module.exports = { Interest, Language, Religion };
