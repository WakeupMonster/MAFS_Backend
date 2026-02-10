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
    const { status, search } = req.query;
    
    // Initial Match (Status Filter)
    let matchQuery = {};
    if (status && status !== "all") {
      matchQuery.status = status;
    }

    const tickets = await SupportTicket.aggregate([
      { $match: matchQuery },
      
      // 1. Join with User Collection
      {
        $lookup: {
          from: "users", // Aapke users collection ka name
          localField: "userId",
          foreignField: "_id",
          as: "userDetails"
        }
      },
      { $unwind: { path: "$userDetails", preserveNullAndEmptyArrays: true } },

      // 2. Join with Profile Collection 
      // (Yahan hum userId match kar rahe hain profile collection ke userId field se)
      {
        $lookup: {
          from: "profiles", // Aapke profiles collection ka name check kar lena (plural hota hai)
          localField: "userId",
          foreignField: "userId",
          as: "profileDetails"
        }
      },
      { $unwind: { path: "$profileDetails", preserveNullAndEmptyArrays: true } },

      // 3. Search Filter (Subject, Nickname, Email par ek saath search)
      {
        $match: search ? {
          $or: [
            { subject: { $regex: search, $options: "i" } },
            { "userDetails.email": { $regex: search, $options: "i" } },
            { "profileDetails.nickname": { $regex: search, $options: "i" } }
          ]
        } : {}
      },

      // 4. Project (Sirf wahi data jo frontend ko chahiye)
      {
        $project: {
          _id: 1,
          subject: 1,
          category: 1,
          status: 1,
          createdAt: 1,
          "user.email": "$userDetails.email",
          "user.phone": "$userDetails.phone",
          "user.nickname": "$profileDetails.nickname",
          "user.avatar": { $arrayElemAt: ["$profileDetails.photos.url", 0] }
        }
      },
      { $sort: { createdAt: -1 } }
    ]);

    return res.json({
      success: true,
      data: tickets
    });

  } catch (err) {
    console.error("Ticket Fetch Error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch tickets",
      error: err.message
    });
  }
};








// module.exports.getAllTickets = async (req, res) => {
//   try {
//     const { status, search } = req.query;
//     let query = {};

//     // 1. Status Filter (open, in_progress, resolved, closed)
//     if (status && status !== "all") {
//       query.status = status;
//     }

//     // 2. Search Filter (Subject ya Category par search karega)
//     if (search) {
//       query.$or = [
//         { subject: { $regex: search, $options: "i" } },
//         { category: { $regex: search, $options: "i" } }
//       ];
//     }

//     const tickets = await SupportTicket.find(query)
//       .populate({
//         path: "userId",
//         select: "email phone profile", // User model se email, phone aur profile ID uthayi
//         populate: {
//           path: "profile", // Ab User ke andar jo profile ID hai use populate kiya
//           select: "nickname photos", // Profile model se nickname aur photo uthayi
//         }
//       })
//       .sort({ createdAt: -1 })
//       .lean();

//     // const tickets = await SupportTicket.find(query)
//     //   .populate("userId", "nickname email phone") // User details saath mein mangwai
//     //   .select("userId category subject status adminReply createdAt updatedAt")
//     //   .sort({ createdAt: -1 })
//     //   .lean();

//     return res.json({
//       success: true,
//       count: tickets.length,
//       data: tickets
//     });

//   } catch (err) {
//     return res.status(500).json({
//       success: false,
//       message: "Failed to fetch tickets",
//       error: err.message
//     });
//   }
// };

// module.exports.getAllTickets = async (req, res) => {
//   try {
//     const tickets = await SupportTicket.find({})
//       .select("userId category subject status adminReply createdAt updatedAt")
//       .sort({ createdAt: -1 })
//       .lean();

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
    // const userId = req.user._id;
    const { ticketId } = req.params;


    const ticket = await SupportTicket.findOne({_id:ticketId}).lean();

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


module.exports.myTicket= async(req,res) => {
   try {
    const userId = req.user._id;
    // const { ticketId } = req.params;


    const ticket = await SupportTicket.findOne({userId}).lean();

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