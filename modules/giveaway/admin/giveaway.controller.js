/* eslint-disable no-unused-vars */
const GiveawayPrize = require("../prize.model");
const GiveawayCampaign = require("../giveawayCampaign.model");
const GiveawayWinHistory = require("../giveawayWinHistory.model");
const notificationService = require("../../notifications/notification.service");
const User = require("../../../modules/auth/auth.model")
const Prize = require("../prize.model");
const utils = require("../../auth/auth.utils")

exports.createPrize = async (req, res) => {
  try {
    const {
      title,
      type,
      value,
      description,
      spinWheelLabel,
      supportiveItems
    } = req.body;

     if (!supportiveItems || supportiveItems.length < 2) {
      return res.status(400).json({
        success: false,
        message: "At least 2 supportive items are required"
      });
    }


    if (!title || !type || !value || !spinWheelLabel) {
      return res.status(400).json({
        success: false,
        message: "Missing required prize fields"
      });
    }

    const prize = await GiveawayPrize.create({
      title,
      type,
      value,
      description,
      spinWheelLabel,
      supportiveItems
    });

    return res.status(201).json({
      success: true,
      message: "Prize created successfully",
      data: prize
    });

  } catch (error) {
    console.error("Create Prize Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create prize"
    });
  }
};

exports.getAllPrizes = async (req, res) => {
  try {
    const prizes = await GiveawayPrize.find().sort({ createdAt: -1 });

    return res.json({
      success: true,
      data: prizes
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch prizes"
    });
  }
};

exports.updatePrize = async (req, res) => {
  try {
    const { id } = req.params;

    const prize = await GiveawayPrize.findByIdAndUpdate(
      id,
      req.body,
      { new: true }
    );

    if (!prize) {
      return res.status(404).json({
        success: false,
        message: "Prize not found"
      });
    }

    return res.json({
      success: true,
      message: "Prize updated successfully",
      data: prize
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to update prize"
    });
  }
};

exports.createCampaign = async (req, res) => {
  try {
    const { date, prizeId, supportiveItems } = req.body;

     if (!supportiveItems || supportiveItems.length < 2) {
      return res.status(400).json({
        success: false,
        message: "At least 2 supportive items are required"
      });
    }

  
    const campaignDate = new Date(date);
    campaignDate.setHours(0, 0, 0, 0);


    const existingCampaign = await GiveawayCampaign.findOne({
      date: campaignDate
    });

    if (existingCampaign) {
      return res.status(400).json({
        success: false,
        message: "Giveaway campaign already exists for this date"
      });
    }


    const prize = await GiveawayPrize.findOne({
      _id: prizeId,
      isActive: true
    });

    if (!prize) {
      return res.status(400).json({
        success: false,
        message: "Invalid or inactive prize"
      });
    }

    const campaign = await GiveawayCampaign.create({
      date: campaignDate,
      prizeId: prize._id,
      supportiveItems
    });

    return res.status(201).json({
      success: true,
      message: "Giveaway campaign created successfully",
      data: {
        id: campaign._id,
        date: campaign.date,
        prize: {
          id: prize._id,
          title: prize.title,
          type: prize.type,
          value: prize.value
        },
        drawStatus: campaign.drawStatus,
        isActive: campaign.isActive
      }
    });

  } catch (error) {
    console.error("Create Campaign Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create giveaway campaign"
    });
  }
};

exports.getAllCampaigns = async (req, res) => {
  try {
    const campaigns = await GiveawayCampaign
      .find()
      .populate("prizeId")
      .populate("winnerUserId", "email phone")
      .sort({ date: -1 });

    return res.json({
      success: true,
      data: campaigns
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch campaigns"
    });
  }
};

exports.updateCampaign = async (req, res) => {
  try {
    const { id } = req.params;

    const campaign = await GiveawayCampaign.findById(id);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Campaign not found"
      });
    }

    if (campaign.drawStatus === "COMPLETED") {
      return res.status(400).json({
        success: false,
        message: "Completed campaign cannot be updated"
      });
    }

    Object.assign(campaign, req.body);
    await campaign.save();

    return res.json({
      success: true,
      message: "Campaign updated successfully",
      data: campaign
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to update campaign"
    });
  }
};

exports.getWinner = async (req, res) => {
  try {
    const { id } = req.params;

    const campaign = await GiveawayCampaign
      .findById(id)
      .populate("winnerUserId", "email phone")
      .populate("prizeId");

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Campaign not found"
      });
    }

    return res.json({
      success: true,
      data: {
        campaignId: campaign._id,
        date: campaign.date,
        prize: campaign.prizeId,
        winner: campaign.winnerUserId,
        drawStatus: campaign.drawStatus,
         drawAt: campaign.drawAt || null
      }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch winner"
    });
  }
};

exports.resendPrize = async (req, res) => {
  try {
    const { id } = req.params;
    const campaign = await GiveawayCampaign.findById(id);
    if (!campaign || !campaign.winnerUserId) {
      return res.status(400).json({
        success: false,
        message: "Winner not found for this campaign"
      });
    }
    
    return res.json({
      success: true,
      message: "Prize resend triggered successfully"
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to resend prize"
    });
  }
};

exports.markPrizeAsDelivered = async (req, res) => {
  try {
    const { winHistoryId } = req.body;

    const winHistory = await GiveawayWinHistory.findById(winHistoryId);

    if (!winHistory) {
      return res.status(404).json({
        success: false,
        message: "Win history not found"
      });
    }


    if (!winHistory.claimedAt) {
      return res.status(400).json({
        success: false,
        message: "Prize not claimed yet"
      });
    }

    if (winHistory.deliveryStatus === "DELIVERED") {
      return res.status(400).json({
        success: false,
        message: "Prize already delivered"
      });
    }
  
    const prize = await GiveawayCampaign.findById(winHistory.campaignId);
    const user = await User.findById(winHistory.userId);

    console.log(prize,"prize")
    console.log("user",user)

    if (!prize || !user) {
      return res.status(400).json({ success: false, message: "Prize or User not found" });
    }

    if (prize.type === "FREE_PREMIUM") {
      const today = new Date();

      const baseDate =
        user.premiumExpiresAt && user.premiumExpiresAt > today
          ? user.premiumExpiresAt
          : today;

      const extendedExpiry = new Date(baseDate);
      extendedExpiry.setDate(
        extendedExpiry.getDate() + prize.durationInDays
      );

      user.premiumExpiresAt = extendedExpiry;
      await user.save();
    }

    winHistory.deliveryStatus = "DELIVERED";
    winHistory.deliveredAt = new Date();
    await winHistory.save();

    await notificationService.sendPrizeDeliveredNotification(
      winHistory.userId
    );

await utils.sendEmail(
  user.email,
  "🎉 Your Prize has been Delivered",
  `
    <h2>Congratulations 🎉</h2>
    <p>Your prize <b>${prize.title}</b> has been successfully delivered.</p>
    <p>Thank you for participating!</p>
  `
);

  
    return res.json({
      success: true,
      message: "Prize marked as delivered",
      data: {
        deliveredAt: winHistory.deliveredAt
      }
    });

  } catch (error) {
    console.error("Delivery API error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to mark prize as delivered",
      error : error.message
    });
  }
};



exports.getPendingDeliveries = async (req, res) => {
  try {
    const records = await GiveawayWinHistory.find({
      deliveryStatus: "PENDING"
    })
      .populate("userId", "phone email")
      .populate("campaignId", "date")
      .populate("prizeId", "title value")
      .sort({ claimedAt: -1 });
    res.json({
      success: true,
      count: records.length,
      data: records
    });
  } catch (error) {
    console.error("Pending deliveries error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch pending deliveries"
    });
  }
};

exports.getDeliveredPrizes = async (req, res) => {
  try {
    const records = await GiveawayWinHistory.find({
      deliveryStatus: "DELIVERED"
    })
      .populate("userId", "phone email")
      .populate("campaignId", "date")
      .populate("prizeId", "title value")
      .sort({ deliveredAt: -1 });

    res.json({
      success: true,
      count: records.length,
      data: records
    });
  } catch (error) {
    console.error("Delivered prizes error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch delivered prizes"
    });
  }
};


exports.getAllClaims = async (req, res) => {
  try {
    const records = await GiveawayWinHistory.find()
      .populate("userId", "phone email")
      .populate("campaignId", "date")
      .populate("prizeId", "title value")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: records.length,
      data: records
    });
  } catch (error) {
    console.error("Claims list error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch claims"
    });
  }
};

exports.getGiveawayAuditReport = async (req, res) => {
  try {
    const filter = {};

    if (req.query.from && req.query.to) {
      filter.createdAt = {
        $gte: new Date(req.query.from),
        $lte: new Date(req.query.to)
      };
    }

    const records = await GiveawayWinHistory.find(filter)
      .populate("userId", "phone email")
      .populate("campaignId", "date")
      .populate("prizeId", "title value")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      totalRecords: records.length,
      data: records
    });
  } catch (error) {
    console.error("Audit report error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate audit report"
    });
  }
};

exports.bulkCreateCampaignByRanges = async (req, res) => {
  try {
    const { ranges, isActive = true } = req.body;

    if (!Array.isArray(ranges) || ranges.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Ranges array is required"
      });
    }

    // 🔒 Today (local midnight)
    const now = new Date();
    const today = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

    const campaignsToInsert = [];
    const skippedDates = [];

    for (const range of ranges) {
      const {
        startDate,
        endDate,
        prizeId,
        supportiveItems
      } = range;

    
      const prize = await Prize.findById(prizeId);
      if (!prize || !prize.isActive) {
        return res.status(400).json({
          success: false,
          message: `Invalid or inactive prize: ${prizeId}`
        });
      }

      const [sy, sm, sd] = startDate.split("-").map(Number);
      const [ey, em, ed] = endDate.split("-").map(Number);

      const start = new Date(sy, sm - 1, sd);
      const end = new Date(ey, em - 1, ed);

      if (start > end) {
        return res.status(400).json({
          success: false,
          message: "Start date cannot be after end date"
        });
      }

     
      const normalizedSupportiveItems = Array.isArray(supportiveItems)
        ? supportiveItems.filter(Boolean)
        : [];

   
      for (
        let d = new Date(start);
        d <= end;
        d.setDate(d.getDate() + 1)
      ) {
        const campaignDate = new Date(
          d.getFullYear(),
          d.getMonth(),
          d.getDate()
        );

        // ❌ Skip past dates
        if (campaignDate < today) {
          skippedDates.push({
            date: campaignDate,
            reason: "Past date"
          });
          continue;
        }

        // ❌ Skip if campaign already exists
        const exists = await GiveawayCampaign.findOne({
          date: campaignDate
        }).lean();

        if (exists) {
          skippedDates.push({
            date: campaignDate,
            reason: "Campaign already exists"
          });
          continue;
        }

     
        campaignsToInsert.push({
          date: campaignDate,
          prizeId,
          supportiveItems: normalizedSupportiveItems, // 🔥 FIXED
          isActive,
          drawStatus: "PENDING"
        });
      }
    }


    if (campaignsToInsert.length > 0) {
      await GiveawayCampaign.insertMany(campaignsToInsert);
    }

    return res.status(201).json({
      success: true,
      message: "Range-based campaigns processed successfully",
      summary: {
        created: campaignsToInsert.length,
        skipped: skippedDates.length
      },
      skippedDates
    });

  } catch (error) {
    console.error("bulkCreateCampaignByRanges error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to bulk create campaigns"
    });
  }
};


exports.disableCampaign = async (req, res) => {
  try {
    const { id } = req.params;

    const campaign = await GiveawayCampaign.findById(id);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Campaign not found"
      });
    }

    // Already disabled
    if (!campaign.isActive) {
      return res.status(400).json({
        success: false,
        message: "Campaign is already disabled"
      });
    }

    campaign.isActive = false;
    campaign.failureReason = "Disabled by admin";
    await campaign.save();

    return res.json({
      success: true,
      message: "Campaign disabled successfully"
    });

  } catch (error) {
    console.error("Disable campaign error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to disable campaign"
    });
  }
};

exports.pauseCampaign = async (req, res) => {
  try {
    const { campaignId } = req.params;
    console.log(campaignId,"campaignId")
    const campaign = await GiveawayCampaign.findById(campaignId);
    console.log(campaign.isActive,"active")
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Campaign not found"
      });
    }

    if (!campaign.isActive) {
      return res.status(400).json({
        success: false,
        message: "Campaign is already paused"
      });
    }

    campaign.isActive = false;
    campaign.failureReason = "Paused by admin";
    await campaign.save();
    console.log(campaign.isActive,"afteractive")

    return res.json({
      success: true,
      message: "Campaign paused successfully"
    });

  } catch (error) {
    console.error("Pause campaign error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to pause campaign"
    });
  }
};

exports.deletePrize = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Find and delete the prize
    const prize = await Prize.findByIdAndDelete(id);
    
    if (!prize) {
      return res.status(404).json({
        success: false,
        message: 'Prize not found'
      });
    }

    // Log the deletion
    // await GiveawayAudit.create({
    //   action: 'DELETE_PRIZE',
    //   admin: req.user._id,
    //   targetId: id,
    //   details: {
    //     prizeName: prize.name,
    //     prizeId: prize._id
    //   }
    // });

    res.status(200).json({
      success: true,
      message: 'Prize deleted successfully',
      data: { id }
    });

  } catch (error) {
    console.error('Delete Prize Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete prize',
      error: error.message
    });
  }
};


exports.deleteCampaign = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if there are any winners for this campaign
    const hasWinners = await GiveawayWinHistory.exists({ 
      campaignId: id,
      wonAt: { $exists: true } // Ensure wonAt is present
    });

    if (hasWinners) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete campaign with existing winners',
        code: 'CAMPAIGN_HAS_WINNERS'
      });
    }

    // Also check if there are any pending claims
    const hasPendingClaims = await GiveawayWinHistory.exists({ 
      campaignId: id,
      claimedAt: null, // Not claimed yet
      wonAt: { $exists: true } // But has won
    });

    if (hasPendingClaims) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete campaign with pending claims',
        code: 'CAMPAIGN_HAS_PENDING_CLAIMS'
      });
    }

    // Find and delete the campaign
    const campaign = await GiveawayCampaign.findByIdAndDelete(id);
    
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    // Log the deletion
    // await GiveawayAudit.create({
    //   action: 'DELETE_CAMPAIGN',
    //   admin: req.user._id,
    //   targetId: id,
    //   details: {
    //     campaignName: campaign.name,
    //     campaignId: campaign._id
    //   }
    // });

    res.status(200).json({
      success: true,
      message: 'Campaign deleted successfully',
      data: { id }
    });

  } catch (error) {
    console.error('Delete Campaign Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete campaign',
      error: error.message
    });
  }
};






/**
 * 📅 RANGE BASED BULK CREATE GIVEAWAY CAMPAIGNS
 * Admin can define multiple date ranges with different prizes
 */
// exports.bulkCreateCampaignByRanges = async (req, res) => {
//   try {
//     const { ranges, isActive = true } = req.body;

//     if (!Array.isArray(ranges) || ranges.length === 0) {
//       return res.status(400).json({
//         success: false,
//         message: "Ranges array is required"
//       });
//     }

//     /**
//      * 1️⃣ Normalize & validate ranges
//      */
//     const normalizedRanges = ranges.map((r) => {
//       const start = new Date(r.startDate);
//       const end = new Date(r.endDate);

//       start.setHours(0, 0, 0, 0);
//       end.setHours(0, 0, 0, 0);

//       if (start > end) {
//         throw new Error("Start date cannot be after end date");
//       }

//       return {
//         startDate: start,
//         endDate: end,
//         prizeId: r.prizeId
//       };
//     });

//     /**
//      * 2️⃣ Overlapping range detection
//      */
//     const sortedRanges = [...normalizedRanges].sort(
//       (a, b) => a.startDate - b.startDate
//     );

//     for (let i = 1; i < sortedRanges.length; i++) {
//       if (sortedRanges[i].startDate <= sortedRanges[i - 1].endDate) {
//         return res.status(400).json({
//           success: false,
//           message: "Overlapping date ranges are not allowed"
//         });
//       }
//     }

//     /**
//      * 3️⃣ Validate all prizes
//      */
//     const prizeIds = [...new Set(normalizedRanges.map(r => r.prizeId))];
//     const prizes = await Prize.find({ _id: { $in: prizeIds }, isActive: true });

//     if (prizes.length !== prizeIds.length) {
//       return res.status(400).json({
//         success: false,
//         message: "One or more prizes are invalid or inactive"
//       });
//     }

//     // const today = new Date();
//     // today.setHours(0, 0, 0, 0);

//     const now = new Date();
// const today = new Date(
//   now.getFullYear(),
//   now.getMonth(),
//   now.getDate()
// );


//     const campaignsToInsert = [];
//     const skippedDates = [];

//     /**
//      * 4️⃣ Expand ranges into daily campaigns
//      */
//     for (const range of normalizedRanges) {
//       for (
//         let date = new Date(range.startDate);
//         date <= range.endDate;
//         date.setDate(date.getDate() + 1)
//       ) {
//         const campaignDate = new Date(date);

//         // ❌ Skip past dates
//         if (campaignDate < today) {
//           skippedDates.push({
//             date: campaignDate,
//             reason: "Past date"
//           });
//           continue;
//         }

//         // ❌ Skip if campaign already exists
//         const existing = await GiveawayCampaign.findOne({
//           date: campaignDate
//         });

//         if (existing) {
//           skippedDates.push({
//             date: campaignDate,
//             reason: "Campaign already exists"
//           });
//           continue;
//         }

//         campaignsToInsert.push({
//           date: campaignDate,
//           prizeId: range.prizeId,
//            supportiveItems: Array.isArray(range.supportiveItems)
//             ? range.supportiveItems
//             : [],
//           isActive,
//           drawStatus: "PENDING"
//         });
//       }
//     }

//     /**
//      * 5️⃣ Insert campaigns
//      */
//     if (campaignsToInsert.length > 0) {
//       await GiveawayCampaign.insertMany(campaignsToInsert);
//     }

//     /**
//      * 6️⃣ Response
//      */
//     return res.status(201).json({
//       success: true,
//       message: "Range-based campaigns processed successfully",
//       summary: {
//         created: campaignsToInsert.length,
//         skipped: skippedDates.length
//       },
//       skippedDates
//     });

//   } catch (error) {
//     console.error("Range bulk campaign error:", error);
//     return res.status(500).json({
//       success: false,
//       message: error.message || "Failed to bulk create campaigns"
//     });
//   }
// };






// {
//   "ranges": [
//     {
//       "startDate": "2025-12-01",
//       "endDate": "2025-12-05",
//       "prizeId": "PRIZE_ID_1"
//     },
//     {
//       "startDate": "2025-12-06",
//       "endDate": "2025-12-11",
//       "prizeId": "PRIZE_ID_2"
//     },
//     {
//       "startDate": "2025-12-12",
//       "endDate": "2025-12-15",
//       "prizeId": "PRIZE_ID_3"
//     }
//   ],
//   "isActive": true
// }










// exports.bulkCreateCampaign = async (req, res) => {
//   try {
//     const { startDate, endDate, prizeId, isActive = true } = req.body;

//     /**
//      * 1️⃣ Prize validation
//      */
//     const prize = await Prize.findById(prizeId);
//     if (!prize || !prize.isActive) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid or inactive prize"
//       });
//     }

//     /**
//      * 2️⃣ Date validation
//      */
//     const start = new Date(startDate);
//     const end = new Date(endDate);
//     start.setHours(0, 0, 0, 0);
//     end.setHours(0, 0, 0, 0);

//     if (start > end) {
//       return res.status(400).json({
//         success: false,
//         message: "Start date cannot be after end date"
//       });
//     }

//     const today = new Date();
//     today.setHours(0, 0, 0, 0);

//     /**
//      * 3️⃣ Loop through date range
//      */
//     const campaignsToInsert = [];
//     const skippedDates = [];

//     for (
//       let date = new Date(start);
//       date <= end;
//       date.setDate(date.getDate() + 1)
//     ) {
//       const campaignDate = new Date(date);

//       // ❌ Past dates skip
//       if (campaignDate < today) {
//         skippedDates.push({
//           date: campaignDate,
//           reason: "Past date"
//         });
//         continue;
//       }

//       // ❌ Already exists?
//       const existingCampaign = await GiveawayCampaign.findOne({
//         date: campaignDate
//       });

//       if (existingCampaign) {
//         skippedDates.push({
//           date: campaignDate,
//           reason: "Campaign already exists"
//         });
//         continue;
//       }

//       // ✅ Ready to create
//       campaignsToInsert.push({
//         date: campaignDate,
//         prizeId,
//         isActive,
//         drawStatus: "PENDING"
//       });
//     }

//     /**
//      * 4️⃣ Insert campaigns
//      */
//     if (campaignsToInsert.length > 0) {
//       await GiveawayCampaign.insertMany(campaignsToInsert);
//     }

//     /**
//      * 5️⃣ Response
//      */
//     return res.status(201).json({
//       success: true,
//       message: "Bulk campaigns processed",
//       summary: {
//         created: campaignsToInsert.length,
//         skipped: skippedDates.length
//       },
//       skippedDates
//     });

//   } catch (error) {
//     console.error("Bulk create campaign error:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Failed to bulk create campaigns"
//     });
//   }
// };