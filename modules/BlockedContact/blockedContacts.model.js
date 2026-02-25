// const mongoose = require("mongoose");

// const blockedContactSchema = new mongoose.Schema(
//   {
//     userId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       required: true,
//       index: true
//     },

//     blockedPhoneHash: {
//       type: String,
//       required: true,
//       index: true
//     },

//     source: {
//       type: String,
//       enum: ["CONTACT_IMPORT", "MANUAL"],
//       default: "CONTACT_IMPORT"
//     }
//   },
//   { timestamps: true }
// );

// // ek user ek hi phone ko dobara block na kare
// blockedContactSchema.index(
//   { userId: 1, blockedPhoneHash: 1 },
//   { unique: true }
// );

// module.exports = mongoose.model("BlockedContact", blockedContactSchema);



const mongoose = require("mongoose");

const blockedContactSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    // ✅ NEW: Readable phone number (for display)
    blockedPhone: {
      type: String,
      required: true
    },

    // ✅ NEW: Contact name (for display)
    blockedName: {
      type: String,
      default: null
    },

    blockedPhoneHash: {
      type: String,
      required: true,
      index: true
    },

    source: {
      type: String,
      enum: ["CONTACT_IMPORT", "MANUAL"],
      default: "CONTACT_IMPORT"
    }
  },
  { timestamps: true }
);

blockedContactSchema.index(
  { userId: 1, blockedPhoneHash: 1 },
  { unique: true }
);

module.exports = mongoose.model("BlockedContact", blockedContactSchema);