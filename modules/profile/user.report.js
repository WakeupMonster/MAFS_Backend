// const mongoose = require("mongoose");

// const ReportSchema = new mongoose.Schema({
//   reporterId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
//   reportedId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
//   reason: { type: String, required: true }, // Figma mein report popup ka reason
//   description: { type: String, default: "" },
//   status: {
//   type: String,
//   enum: ["new", "in_progress", "resolved"],
//   default: "new",
//   index: true
// },
//   createdAt: { type: Date, default: Date.now }
// });
// module.exports = mongoose.model("Report", ReportSchema);  


const mongoose = require("mongoose");

const ReportSchema = new mongoose.Schema(
  {
    reporterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    reportedId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    reason: {
      type: String,
      required: true
    },

    description: {
      type: String,
      default: ""
    },

    status: {
      type: String,
      enum: ["new", "in_progress", "resolved"],
      default: "new",
      index: true
    },

    severity: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium"
    },

    handledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null
    },

    replyHistory: [
      {
        message: String,
        repliedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User"
        },
        repliedAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    resolvedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Report", ReportSchema);