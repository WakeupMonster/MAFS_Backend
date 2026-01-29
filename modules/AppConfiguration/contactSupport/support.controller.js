/* eslint-disable no-unused-vars */
const SupportTicket = require("./supportTicket.model");

module.exports.contactSupport = async (req, res) => {
  try {
    const userId = req.user._id;
    const { category, subject, message } = req.body;

    if (!category || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: "Category, subject and message are required"
      });
    }

    await SupportTicket.create({
      userId,
      category,
      subject,
      message
    });

    return res.json({
      success: true,
      message: "Your request has been submitted to support"
    });

  } catch (err) {
    console.error("Contact support error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to submit support request"
    });
  }
};

module.exports.getAllTickets = async (req, res) => {
  try {
    const tickets = await SupportTicket.find({})
      .select("userId category subject status adminReply createdAt updatedAt")
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      data: tickets
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch tickets"
    });
  }
};


// module.exports.getMyTickets = async (req, res) => {
//   try {
//     const userId = req.user._id;

//     // const tickets = await SupportTicket.find({ userId })
//     //   .select("category subject status adminReply createdAt updatedAt")
//     //   .sort({ createdAt: -1 })
//     //   .lean();

      
//     const tickets = await SupportTicket.find({ userId })
//       .select("status")
//     return res.json({
//       success: true,
//       data: tickets
//     });

//   } catch (err) {
//     return res.status(500).json({
//       success: false,
//       message: "Failed to fetch tickets"
//     });
//   }
// };


module.exports.getMyTicketById = async (req, res) => {
  try {
    const userId = req.user._id;
    const { ticketId } = req.params;

    const ticket = await SupportTicket.findOne({
      _id: ticketId,
      userId
    }).lean();

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found"
      });
    }

    return res.json({
      success: true,
      data: ticket
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch ticket"
    });
  }
};


module.exports.replyToTicket = async (req, res) => {
  try {
    const { ticketId, reply, status } = req.body;

    if (!ticketId || !reply || !status) {
      return res.status(400).json({
        success: false,
        message: "ticketId, reply and status are required"
      });
    }

    const ticket = await SupportTicket.findById(ticketId);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found"
      });
    }

    ticket.adminReply = reply;
    ticket.status = status;
    ticket.repliedAt = new Date();

    await ticket.save();

    return res.json({
      success: true,
      message: "Reply sent successfully"
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to reply to ticket"
    });
  }
};
