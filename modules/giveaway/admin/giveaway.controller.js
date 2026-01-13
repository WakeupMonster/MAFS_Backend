/* eslint-disable no-unused-vars */
const GiveawayPrize = require("../prize.model");
const GiveawayCampaign = require("../giveawayCampaign.model");
const GiveawayWinHistory = require("../giveawayWinHistory.model");
const notificationService = require("../../notifications/notification.service");
const User = require("../../../modules/auth/auth.model")
const Prize = require("../prize.model");

// const GiveawayWinHistory = require("../giveawayWinHistory.model");

/**
 * @desc   Create a new giveaway prize
 * @route  POST /api/v1/admin/giveaway/prizes
 * @access ADMIN
 */
exports.createPrize = async (req, res) => {
  try {
    const {
      title,
      type,
      value,
      description,
      spinWheelLabel
    } = req.body;

    /**
     *  Safety check (extra, validation ke upar)
     * Validation fail hui to yahan tak aana hi nahi chahiye,
     * but production me defensive coding zaroori hoti hai
     */
    if (!title || !type || !value || !spinWheelLabel) {
      return res.status(400).json({
        success: false,
        message: "Missing required prize fields"
      });
    }

    /**
     * 🎁 Create prize
     * isActive default true rahega (schema se)
     */
    const prize = await GiveawayPrize.create({
      title,
      type,
      value,
      description,
      spinWheelLabel
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



/**
 * ===============================
 * PRIZE MANAGEMENT
 * ===============================
 */

// GET /admin/giveaway/prizes
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

// PATCH /admin/giveaway/prizes/:id
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

/**
 * ===============================
 * GIVEAWAY CAMPAIGNS
 * ===============================
 */


/**
 * @desc   Create a daily giveaway campaign (Prize Scheduling)
 * @route  POST /api/v1/admin/giveaway/campaigns
 * @access ADMIN
 */
exports.createCampaign = async (req, res) => {
  try {
    const { date, prizeId, supportiveItems } = req.body;

     if (!supportiveItems || supportiveItems.length < 2) {
      return res.status(400).json({
        success: false,
        message: "At least 2 supportive items are required"
      });
    }

    /**
     * ===============================
     * 1️⃣ Normalize date (MOST IMPORTANT)
     * ===============================
     * Giveaway daily hota hai, time matter nahi karta
     * Isliye date ko start of day pe normalize karte hain
     */
    const campaignDate = new Date(date);
    campaignDate.setHours(0, 0, 0, 0);

    /**
     * ===============================
     * 2️⃣ Check: campaign already exists for this date?
     * ===============================
     */
    const existingCampaign = await GiveawayCampaign.findOne({
      date: campaignDate
    });

    if (existingCampaign) {
      return res.status(400).json({
        success: false,
        message: "Giveaway campaign already exists for this date"
      });
    }

    /**
     * ===============================
     * 3️⃣ Check: prize exists & active?
     * ===============================
     */
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

    /**
     * ===============================
     * 4️⃣ Create campaign
     * ===============================
     * drawStatus = PENDING (default)
     * winnerUserId = null
     * drawAt = null
     * isActive = true
     */
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



// GET /admin/giveaway/campaigns

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

// PATCH /admin/giveaway/campaigns/:id
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

/** 
 * ===============================
 * WINNER & RECOVERY
 * ===============================
 */

// GET /admin/giveaway/campaigns/:id/winner
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
        drawStatus: campaign.drawStatus
      }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch winner"
    });
  }
};

// POST /admin/giveaway/campaigns/:id/resend-prize
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

    // Actual delivery logic future me
    // abhi sirf acknowledge

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





/**
 * ==========================================
 * 🚚 MARK GIVEAWAY PRIZE AS DELIVERED (ADMIN)
 * ==========================================
 * 👉 Sirf admin karega
 * 👉 Claim ke baad hi allowed
 * 👉 Audit safe
 */
  

exports.markPrizeAsDelivered = async (req, res) => {
  try {
    const { winHistoryId } = req.body;

    /**
     * 1️⃣ Win history nikaalo
     */
    const winHistory = await GiveawayWinHistory.findById(winHistoryId);

    if (!winHistory) {
      return res.status(404).json({
        success: false,
        message: "Win history not found"
      });
    }

    /**
     * 2️⃣ Check: prize claim hua ya nahi
     */
    if (!winHistory.claimedAt) {
      return res.status(400).json({
        success: false,
        message: "Prize not claimed yet"
      });
    }

    /**
     * 3️⃣ Check: already delivered?
     */
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

    /**
     * ======================================
     * 5️⃣ FREE_PREMIUM DELIVERY LOGIC
     * ======================================
     */
    if (prize.type === "FREE_PREMIUM") {
      const today = new Date();

      // base date decide karo
      const baseDate =
        user.premiumExpiresAt && user.premiumExpiresAt > today
          ? user.premiumExpiresAt
          : today;

      // premium extend karo
      const extendedExpiry = new Date(baseDate);
      extendedExpiry.setDate(
        extendedExpiry.getDate() + prize.durationInDays
      );

      user.premiumExpiresAt = extendedExpiry;
      await user.save();
    }

    /**
     * 4️⃣ Mark as delivered
     */
    winHistory.deliveryStatus = "DELIVERED";
    winHistory.deliveredAt = new Date();
    await winHistory.save();

    /**
     * 5️⃣ Notify user about delivery success
     */
    await notificationService.sendPrizeDeliveredNotification(
      winHistory.userId
    );

//     const user = await User.findById(winHistory.userId).select("email");

// if (user?.email) {
//   await sendPrizeDeliveredEmail(
//     user.email,
//     prize.title
//   );
// }

    /**
     * 6️⃣ Response to admin
     */
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
      message: "Failed to mark prize as delivered"
    });
  }
};




/**
 * ==========================================
 * 📊 GET PENDING GIVEAWAY DELIVERIES (ADMIN)
 * ==========================================
 */
exports.getPendingDeliveries = async (req, res) => {
  try {
    const records = await GiveawayWinHistory.find({
      claimedAt: { $ne: null },
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


/**
 * ==========================================
 * 📦 GET DELIVERED GIVEAWAY PRIZES (ADMIN)
 * ==========================================
 */
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



/**
 * ==========================================
 * 🧾 GET ALL GIVEAWAY CLAIMS (ADMIN)
 * ==========================================
 */
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



exports.claimPrize = async (req, res) => {
  try {
    const userId = req.user._id;

    /**
     * 1️⃣ Aaj ka date (00:00)
     */
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    /**
     * 2️⃣ Completed campaign nikaalo
     */
    const campaign = await GiveawayCampaign.findOne({
      date: today,
      drawStatus: "COMPLETED"
    });

    if (!campaign) {
      return res.status(400).json({
        success: false,
        message: "No giveaway available to claim today"
      });
    }

    /**
     * 3️⃣ Verify: user winner hai ya nahi
     */
    if (campaign.winnerUserId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not the winner of today’s giveaway"
      });
    }

    /**
     * 4️⃣ Win history record nikaalo
     */
    const winHistory = await GiveawayWinHistory.findOne({
      userId,
      campaignId: campaign._id
    });

    if (!winHistory) {
      return res.status(404).json({
        success: false,
        message: "Win record not found"
      });
    }

    /**
     * 5️⃣ Double claim protection
     */
    if (winHistory.claimedAt) {
      return res.status(400).json({
        success: false,
        message: "Prize already claimed"
      });
    }

    /**
     * 6️⃣ Claim prize (LOCK)
     */
    winHistory.claimedAt = new Date();
    winHistory.deliveryStatus = "PENDING"; // default hi hai, clarity ke liye
    await winHistory.save();

    /**
     * 7️⃣ Success response
     */
    return res.status(200).json({
      success: true,
      message: "Prize claimed successfully",
      data: {
        campaignId: campaign._id,
        prizeId: winHistory.prizeId,
        claimedAt: winHistory.claimedAt,
        deliveryStatus: winHistory.deliveryStatus
      }
    });

  } catch (error) {
    console.error("Claim prize error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to claim prize"
    });
  }
};




/**
 * ==========================================
 * 🧾 GIVEAWAY AUDIT REPORT (ADMIN)
 * ==========================================
 */
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



/**
 * 📅 BULK CREATE GIVEAWAY CAMPAIGNS
 * Admin can create daily campaigns using date range
 */





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

      /**
       * 1️⃣ Validate prize
       */
      const prize = await Prize.findById(prizeId);
      if (!prize || !prize.isActive) {
        return res.status(400).json({
          success: false,
          message: `Invalid or inactive prize: ${prizeId}`
        });
      }

      /**
       * 2️⃣ Normalize dates (LOCAL SAFE)
       */
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

      /**
       * 3️⃣ Normalize supportive items ONCE per range
       */
      const normalizedSupportiveItems = Array.isArray(supportiveItems)
        ? supportiveItems.filter(Boolean)
        : [];

      /**
       * 4️⃣ Expand range day-by-day
       */
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

        /**
         * ✅ Push final campaign object
         */
        campaignsToInsert.push({
          date: campaignDate,
          prizeId,
          supportiveItems: normalizedSupportiveItems, // 🔥 FIXED
          isActive,
          drawStatus: "PENDING"
        });
      }
    }

    /**
     * 5️⃣ Bulk insert
     */
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





/**
 * 🚫 Disable Giveaway Campaign
 * Permanent admin action
 */
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



/**
 * ⏸️ Pause Giveaway Campaign
 * Temporary admin action (can be resumed later)
 */
exports.pauseCampaign = async (req, res) => {
  try {
    const { campaignId } = req.params;

    const campaign = await GiveawayCampaign.findById(campaignId);
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