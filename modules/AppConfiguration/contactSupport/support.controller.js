/* eslint-disable no-unused-vars */
const crypto = require("crypto");
const SupportTicket = require("./supportTicket.model");
const { sendEmail } = require("../../auth/auth.utils");


module.exports.contactSupport = async (req, res) => {
  try {
    const userId = req.user._id;
    const { category, message } = req.body;

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
    });

    return res.json({
      success: true,
      message: "Your request has been submitted to support",
      data: {
        ticketId: newTicket.ticketId,
      }
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
        },
      },
    ];

    const [result] = await SupportTicket.aggregate(pipeline);

    // Extract total count from metadata
    const totalItems = result.metadata[0]?.total || 0;
    const totalPages = Math.ceil(totalItems / limitNum);

    return res.json({
      success: true,
      pagination: {
        totalPages,
        total: totalItems,
        page: pageNum,
        limit: limitNum,
      },
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

module.exports.getMyTicketById = async (req, res) => {
  try {
    // const userId = req.user._id;
    const { ticketId } = req.params;

    const ticket = await SupportTicket.findOne({ _id: ticketId }).lean();

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

    ticket.adminReply = reply;
    ticket.status = status;
    ticket.repliedAt = new Date();

    await ticket.save();

    // 📧 SEND EMAIL TO THE USER
    if (ticket.userId && ticket.userId.email) {
      const emailSubject = `Update on your Support Ticket: ${ticket.subject || "MAFS Support"}`;
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; line-height: 1.6;">
          <h2 style="color: #00adef;">Support Ticket Update</h2>
          <p>Hello,</p>
          <p>Your support ticket has been updated to: <strong style="text-transform: capitalize;">${status.replace(/_/g, " ")}</strong></p>
          <p><strong>Admin Reply:</strong></p>
          <blockquote style="background: #f9f9f9; padding: 15px; border-left: 4px solid #00adef; margin: 10px 0;">
            ${reply.replace(/\n/g, "<br/>")}
          </blockquote>
          <br/>
          <p>Thank you for reaching out to us.</p>
          <p>Best regards,<br/><strong>MAFS Support Team</strong></p>
        </div>
      `;
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
