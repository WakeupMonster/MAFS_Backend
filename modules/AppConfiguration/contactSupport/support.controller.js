/* eslint-disable no-unused-vars */
const crypto = require("crypto");
const SupportTicket = require("./supportTicket.model");
const { sendEmail } = require("../../auth/auth.utils");
const { default: mongoose } = require("mongoose");
const { uploadStream } = require("../../upload/cloudinary.service");
const { supportTicketReplyEmailTemplate } = require("../../../common/utils/supportTicketReplyEmailTemplate");

module.exports.contactSupport = async (req, res) => {
  try {
    const userId = req.user._id;
    const { category, message, appVersion, appBuild, platform } = req.body;

    if (!category || !message) {
      return res.status(400).json({
        success: false,
        message: "Category and message are required",
      });
    }

    const ticketId = `TKT-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

    const newTicket = await SupportTicket.create({
      ticketId,
      userId,
      category,
      message,
      appVersion,
      appBuild,
      platform,
    });

    return res.json({
      success: true,
      message: "Your request has been submitted to support",
      data: {
        ticketId: newTicket.ticketId,
      },
    });
  } catch (err) {
    console.error("Contact support error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to submit support request",
    });
  }
};

// module.exports.contactSupport = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const { reason, description } = req.body;

//     if (!reason || !description) {
//       return res.status(400).json({
//         success: false,
//         message: "Reason and description are required",
//       });
//     }

//     const ticketId = `TKT-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

//     const newTicket = await SupportTicket.create({
//       ticketId,
//       userId,
//       reason,
//       description,
//     });

//     return res.json({
//       success: true,
//       message: "Your request has been submitted to support",
//       data: {
//         ticketId: newTicket.ticketId,
//       }
//     });
//   } catch (err) {
//     console.error("Contact support error:", err);
//     return res.status(500).json({
//       success: false,
//       message: "Failed to submit support request",
//     });
//   }
// };

module.exports.getAllTickets = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 10 } = req.query;

    // 1. Sanitize Pagination Params
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
    const skip = (pageNum - 1) * limitNum;

    // 2. Initial Match (Status Filter)
    let matchQuery = {};
    if (status && status !== "") {
      matchQuery.status = status;
    }

    // 3. Search Query Logic
    let searchFilter = {};
    if (search?.trim()) {
      const safeSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = { $regex: safeSearch, $options: "i" };

      searchFilter = {
        $or: [
          { ticketId: regex },
          { subject: regex },
          { reason: regex },
          { "userDetails.email": regex },
          { "userDetails.phone": regex },
          { "profileDetails.nickname": regex },
        ],
      };
    }

    const pipeline = [
      { $match: matchQuery },

      // Join with User Collection
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      { $unwind: { path: "$userDetails", preserveNullAndEmptyArrays: true } },
      // Join with Profile Collection
      {
        $lookup: {
          from: "profiles",
          localField: "userId",
          foreignField: "userId",
          as: "profileDetails",
        },
      },
      {
        $unwind: { path: "$profileDetails", preserveNullAndEmptyArrays: true },
      },

      // 3. Apply the Search Filter (Now includes Subject + Joined fields)
      ...(Object.keys(searchFilter).length > 0
        ? [{ $match: searchFilter }]
        : []),

      // 4. Facet for Metadata and Data
      // {
      //   $facet: {
      //     metadata: [{ $count: "total" }],
      //     data: [
      //       { $sort: { createdAt: -1 } },
      //       { $skip: skip },
      //       { $limit: limitNum },
      //       {
      //         $project: {
      //           _id: 1,
      //           subject: 1,
      //           category: 1,
      //           status: 1,
      //           createdAt: 1,
      //           user: {
      //             email: "$userDetails.email",
      //             phone: "$userDetails.phone",
      //             nickname: "$profileDetails.nickname",
      //             avatar: { $arrayElemAt: ["$profileDetails.photos.url", 0] },
      //           },
      //         },
      //       },
      //     ],
      //   },
      // },

      {
        $facet: {
          metadata: [{ $count: "total" }],
          data: [
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limitNum },
            {
              $project: {
                _id: 1,
                ticketId: 1,
                subject: 1,
                category: 1,
                reason: 1,
                description: 1,
                status: 1,
                createdAt: 1,
                user: {
                  email: "$userDetails.email",
                  phone: "$userDetails.phone",
                  nickname: "$profileDetails.nickname",
                  // Note: Make sure photos.url exists in your profile schema
                  avatar: { $arrayElemAt: ["$profileDetails.photos.url", 0] },
                },
              },
            },
          ],
          kpiStats: [
            {
              $group: {
                _id: null,
                totalTickets: { $sum: 1 },
                openTickets: {
                  $sum: { $cond: [{ $eq: ["$status", "open"] }, 1, 0] },
                },
                inProgressTickets: {
                  $sum: { $cond: [{ $eq: ["$status", "in_progress"] }, 1, 0] },
                },
                resolvedTickets: {
                  $sum: { $cond: [{ $eq: ["$status", "resolved"] }, 1, 0] },
                },
                closedTickets: {
                  $sum: { $cond: [{ $eq: ["$status", "closed"] }, 1, 0] },
                },
              },
            },
          ],
        },
      },
    ];

    const [result] = await SupportTicket.aggregate(pipeline);

    // Extract total count from metadata
    const totalItems = result.metadata[0]?.total || 0;
    const totalPages = Math.ceil(totalItems / limitNum);
    const stats = result.kpiStats[0] || {
      totalTickets: 0,
      openTickets: 0,
      inProgressTickets: 0,
      resolvedTickets: 0,
      closedTickets: 0,
    };

    const kpiStats = {
      totalTickets: stats.totalTickets,
      openTickets: stats.openTickets,
      inProgressTickets: stats.inProgressTickets,
      resolvedTickets: stats.resolvedTickets,
      closedTickets: stats.closedTickets,
    };

    return res.json({
      success: true,
      pagination: {
        totalPages,
        total: totalItems,
        page: pageNum,
        limit: limitNum,
      },
      kpiStats,
      data: result.data,
    });
  } catch (err) {
    console.error("Ticket Fetch Error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch tickets",
      error: err.message,
    });
  }
};

// module.exports.getMyTicketById = async (req, res) => {
//   try {
//     // const userId = req.user._id;
//     const { ticketId } = req.params;

//     const ticket = await SupportTicket.findOne({ _id: ticketId }).lean();

//     if (!ticket) {
//       return res.status(404).json({
//         success: false,
//         message: "Ticket not found",
//       });
//     }

//     return res.json({
//       success: true,
//       data: ticket,
//     });
//   } catch (err) {
//     return res.status(500).json({
//       success: false,
//       message: "Failed to fetch ticket",
//     });
//   }
// };

module.exports.getMyTicketById = async (req, res) => {
  try {
    const { ticketId } = req.params;

    // Validation: Ensure the ID is a valid MongoDB ObjectId before querying
    if (!mongoose.Types.ObjectId.isValid(ticketId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Ticket ID format",
      });
    }

    const pipeline = [
      { $match: { _id: new mongoose.Types.ObjectId(ticketId) } },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      { $unwind: { path: "$userDetails", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "profiles",
          localField: "userId",
          foreignField: "userId",
          as: "profileDetails",
        },
      },
      {
        $unwind: { path: "$profileDetails", preserveNullAndEmptyArrays: true },
      },
      {
        $project: {
          _id: 1,
          ticketId: 1,
          subject: 1,
          category: 1,
          message: 1,
          status: 1,
          attachments: 1,
          adminReply: 1,
          repliedAt: 1,
          createdAt: 1,
          user: {
            userId: "$userDetails._id",
            email: "$userDetails.email",
            phone: "$userDetails.phone",
            nickname: "$profileDetails.nickname",
            avatar: { $arrayElemAt: ["$profileDetails.photos.url", 0] },
          },
        },
      },
    ];

    const tickets = await SupportTicket.aggregate(pipeline);

    if (!tickets || tickets.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    return res.json({
      success: true,
      data: tickets[0],
    });
  } catch (err) {
    console.error("Aggregation Error:", err); // Log this to see the actual error in console
    return res.status(500).json({
      success: false,
      message: "Failed to fetch ticket",
      error: err.message, // Temporary for debugging
    });
  }
};

// module.exports.replyToTicket = async (req, res) => {
//   try {
//     const { ticketId, reply, status } = req.body;

//     if (!ticketId || !reply || !status) {
//       return res.status(400).json({
//         success: false,
//         message: "ticketId, reply and status are required",
//       });
//     }

//     const ticket = await SupportTicket.findById(ticketId);

//     if (!ticket) {
//       return res.status(404).json({
//         success: false,
//         message: "Ticket not found",
//       });
//     }

//     ticket.adminReply = reply;
//     ticket.status = status;
//     ticket.repliedAt = new Date();

//     await ticket.save();

//     return res.json({
//       success: true,
//       message: "Reply sent successfully",
//     });
//   } catch (err) {
//     return res.status(500).json({
//       success: false,
//       message: "Failed to reply to ticket",
//     });
//   }
// };
module.exports.replyToTicket = async (req, res) => {
  try {
    const { ticketId, reply, status } = req.body;
    const files = req.files;

    if (!ticketId || !reply || !status) {
      return res.status(400).json({
        success: false,
        message: "ticketId, reply and status are required",
      });
    }

    const ticket = await SupportTicket.findById(ticketId).populate(
      "userId",
      "email",
    );

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    // 1. Handle File Uploads
    if (files && files.length > 0) {
      const uploadPromises = files.map((file) =>
        uploadStream(file.buffer, {
          folder: `mafs/support/replies/${ticketId}`,
        }),
      );
      const uploadResults = await Promise.all(uploadPromises);
      const attachments = uploadResults.map((result) => ({
        url: result.secure_url,
        publicId: result.public_id,
      }));
      ticket.adminAttachments = attachments;
    }

    ticket.adminReply = reply;
    ticket.status = status;
    ticket.repliedAt = new Date();

    await ticket.save();

    // 📧 SEND EMAIL TO THE USER
    if (ticket.userId && ticket.userId.email) {
      const emailSubject = `Update on your Support Ticket: ${ticket.subject || "MAFS Support"}`;

      // Build attachments HTML if any
      let attachmentsHtml = "";
      if (ticket.adminAttachments && ticket.adminAttachments.length > 0) {
        attachmentsHtml = `
          <div style="margin-top: 20px; border-top: 1px solid #eee; padding-top: 15px;">
            <p style="font-size: 13px; font-weight: bold; color: #666; margin-bottom: 8px;">ATTACHMENTS:</p>
            ${ticket.adminAttachments
            .map(
              (file, idx) => `
              <a href="${file.url}" target="_blank" style="display: inline-block; margin-right: 10px; padding: 5px 12px; background: #f0f4f8; border-radius: 6px; text-decoration: none; color: #00adef; font-size: 12px; font-weight: bold;">
                View Attachment ${idx + 1}
              </a>
            `,
            )
            .join("")}
          </div>
        `;
      }

      const emailHtml = supportTicketReplyEmailTemplate({
        status,
        reply,
        attachmentsHtml,
      });
      try {
        await sendEmail(ticket.userId.email, emailSubject, emailHtml);
      } catch (emailErr) {
        console.error("Email sending failed for ticket reply:", emailErr);
      }
    }

    return res.json({
      success: true,
      message: "Reply sent successfully",
    });
  } catch (err) {
    console.error("Reply Error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to reply to ticket",
    });
  }
};

module.exports.myTicket = async (req, res) => {
  try {
    const userId = req.user._id;
    // const { ticketId } = req.params;

    const ticket = await SupportTicket.findOne({ userId }).lean();

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    return res.json({
      success: true,
      data: ticket,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch ticket",
    });
  }
};

module.exports.deleteTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(ticketId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Ticket ID format",
      });
    }

    const ticket = await SupportTicket.findByIdAndDelete(ticketId);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    return res.json({
      success: true,
      message: "Ticket deleted successfully",
    });
  } catch (err) {
    console.error("Delete Ticket Error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to delete ticket",
    });
  }
};
