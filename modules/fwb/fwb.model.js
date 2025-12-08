const mongoose = require("mongoose");

const FwbSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    discount: { type: String, required: true },
    website: { type: String, required: true },
    code: { type: String, required: true },

    com_logo: { url: String, publicId: String, uploadedAt: Date },
    prod_img: { url: String, publicId: String, uploadedAt: Date },

    expire_time: { type: Date, required: true },

    off_details: {
      description: [{ type: String, required: true }],
      note: { type: String },
    },

    about_des: { type: String },

    is_active: {
      type: Boolean,
      default: true, // active by default
    },

    slug: {
      type: String,
      unique: true,
      set: (v) => v.toLowerCase().replace(/\s+/g, "-"),
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("FWB", FwbSchema);

/**{
  "name": "Wrangler",
  "discount": "extra 20% off",
  "website": "https://wrangler.com",
  "code": "WRA20EX",
  "expire_time": "2025-11-15T23:53:00",
  "off_details": {
    "description": [
      "Offer is applicable only on Selected catalog",
      "Offer is applicable only on Selected catalog"
    ],
    "note": "Offer is applicable only on Selected catalog"
  },
  "about_des": "Wrangler is a one stop destination for all your fashion & lifestyle needs. Shop for the trendiest collection of apparels, accessories, shoes & more on the Wrangler website.",
  "slug": "wrangler"
}
*/
