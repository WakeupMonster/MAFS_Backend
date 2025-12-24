/* eslint-disable no-unused-vars */
const GiveawayPrize = require("../prize.model");
const GiveawayCampaign = require("../giveawayCampaign.model");
const GiveawayWinHistory = require("../giveawayWinHistory.model");
const notificationService = require("../../notifications/notification.service");
const User = require("../../../modules/auth/auth.model")
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


  
    const prize = await GiveawayCampaign.findById(winHistory.prizeId);
    const user = await User.findById(winHistory.userId);

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



