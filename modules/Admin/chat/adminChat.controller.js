const ChatMessage = require("../../../modules/matches/chat/chat.message.model");
const {Match}  = require("../../../modules/matches/swipe/swipe.model");
const Report = require("../../../modules/profile/user.report");
const User = require("../../../modules/auth/auth.model");

exports.getReportedChats = async (req, res) => {
  try {
    const chats = await Report.aggregate([
      {
        $match: {
          type: "chat",
          status: { $in: ["new", "in_progress"] }
        }
      },
      {
        $group: {
          _id: "$matchId",
          reportCount: { $sum: 1 },
          reasons: { $addToSet: "$reason" },
          lastReportedAt: { $max: "$createdAt" }
        }
      },
      {
        $lookup: {
          from: "matches",
          localField: "_id",
          foreignField: "_id",
          as: "match"
        }
      },
      { $sort: { lastReportedAt: -1 } }
    ]);

    return res.json({ success: true, data: chats });
  } catch (err) {
    console.error("Admin getReportedChats error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch reported chats"
    });
  }
};


exports.getChatMessagesForReview = async (req, res) => {
  try {
    const { matchId } = req.params;
    const { limit = 50 } = req.query;
    const match = await Match.findById(matchId).lean();
    if (!match) {
      return res.status(404).json({
        success: false,
        message: "Match not found"
      });
    }

    const messages = await ChatMessage.find({
      matchId,
      isDeletedForEveryone: false
    })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean();

    return res.json({
      success: true,
      data: {
        participants: match.users,
        messages: messages.reverse().map(m => ({
          id: m._id,
          sender: m.sender,
          text: m.text,
          media: m.media || [],
          createdAt: m.createdAt,
          flagged: m.isFlagged || false
        }))
      }
    });
  } catch (err) {
    console.error("Admin getChatMessagesForReview error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch chat messages"
    });
  }
};

// exports.takeChatAction = async (req, res) => {
//   try {
//     const adminId = req.user._id;
//     const { matchId } = req.params;
//     const { action, messageIds = [], userId, reason } = req.body;

//     if (!action || !reason) {
//       return res.status(400).json({
//         success: false,
//         message: "Action and reason are required"
//       });
//     }

//     if (action === "delete_message") {
//       await ChatMessage.updateMany(
//         { _id: { $in: messageIds } },
//         {
//           isDeletedForEveryone: true,
//           text: "",
//           media: []
//         }
//       );
//     }

//     if (action === "warn_user") {
//       await User.findByIdAndUpdate(userId, {
//         $push: {
//           warnings: {
//             reason,
//             warnedBy: adminId,
//             warnedAt: new Date()
//           }
//         }
//       });
//     }

//     if (action === "block_user") {
//       await User.findByIdAndUpdate(userId, {
//         accountStatus: "suspended"
//       });
//     }

//     if (action === "freeze_chat") {
//       await Match.findByIdAndUpdate(matchId, {
//         isFrozen: true
//       });
//     }

//     await Report.updateMany(
//       { matchId, status: { $ne: "resolved" } },
//       {
//         status: "resolved",
//         resolvedBy: adminId,
//         resolvedAt: new Date(),
//         resolution: reason
//       }
//     );

//     return res.json({
//       success: true,
//       message: "Action applied successfully"
//     });
//   } catch (err) {
//     console.error("Admin takeChatAction error:", err);
//     return res.status(500).json({
//       success: false,
//       message: "Failed to apply chat action"
//     });
//   }
// };

// exports.getChatActionHistory = async (req, res) => {
//   try {
//     const { matchId } = req.params;

//     const history = await Report.find({
//       matchId,
//       status: "resolved"
//     })
//       .select("resolvedBy resolvedAt")
//       .lean();

//     return res.json({
//       success: true,
//       data: history
//     });
//   } catch (err) {
//     console.error("Admin getChatActionHistory error:", err);
//     return res.status(500).json({
//       success: false,
//       message: "Failed to fetch chat history"
//     });
//   }
// };

exports.takeChatAction = async (req, res) => {
  try {
    const adminId = req.user._id;
    const { reportId } = req.params;

    const {
      action,
      reason,
      messageIds = [],
      targetUser
    } = req.body;

    if (!action || !reason) {
      return res.status(400).json({
        success: false,
        message: "Action and reason are required"
      });
    }

    const report = await Report.findById(reportId);
    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found"
      });
    }

    if (action === "delete_message" && messageIds.length > 0) {
      await ChatMessage.updateMany(
        { _id: { $in: messageIds } },
        {
          isDeletedForEveryone: true,
          text: "",
          media: []
        }
      );
    }

    if (action === "warn_user" && targetUser) {
      await User.findByIdAndUpdate(targetUser, {
        $push: {
          warnings: {
            reason,
            warnedBy: adminId,
            warnedAt: new Date()
          }
        }
      });
    }

    if (action === "block_user" && targetUser) {
      await User.findByIdAndUpdate(targetUser, {
        accountStatus: "suspended"
      });
    }

    if (action === "freeze_chat" && report.matchId) {
      await Match.findByIdAndUpdate(report.matchId, {
        isFrozen: true
      });
    }


    report.actionAudit.push({
      action,
      reason,
      matchId: report.matchId || null,
      messageIds,
      targetUser: targetUser || null,
      actedBy: adminId
    });

    report.status = "resolved";
    report.resolvedBy = adminId;
    report.resolvedAt = new Date();

    await report.save();

    return res.json({
      success: true,
      message: "Action applied and report resolved successfully"
    });

  } catch (err) {
    console.error("Admin takeChatAction error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to apply action"
    });
  }
};



exports.getChatActionHistory = async (req, res) => {
  try {
    const { reportId } = req.params;

    const report = await Report.findById(reportId)
      .populate("actionAudit.actedBy", "email")
      .populate("actionAudit.targetUser", "email")
      .lean();

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found"
      });
    }

    return res.json({
      success: true,
      data: report.actionAudit.map(a => ({
        action: a.action,
        reason: a.reason,
        matchId: a.matchId,
        messageIds: a.messageIds,
        targetUser: a.targetUser?.email || null,
        actedBy: a.actedBy?.email || "System",
        actedAt: a.actedAt
      }))
    });

  } catch (err) {
    console.error("Admin getChatActionHistory error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch action history"
    });
  }
};
