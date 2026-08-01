// eslint-disable-next-line no-unused-vars
const GiveawayCampaign = require("../Admin/giveaways/giveawayCampaign.model");
const Prize = require("../Admin/giveaways/prize.model");
const GiveawayWinHistory = require("../Admin/giveaways/giveawayWinHistory.model");
const GiveawayInfo = require("../Admin/giveaways/giveawayInfo.model");

module.exports.claimPrize = async (req, res) => {
  try {
    const userId = req.user._id;
    const { claimEmail, winHistoryId } = req.body;

    if (!winHistoryId) {
      return res.status(400).json({
        success: false,
        message: "Win ID (winHistoryId) is required to claim the prize",
      });
    }

    // Email validation (zaroori aur sahi format mein)
    if (!claimEmail || typeof claimEmail !== "string" || !claimEmail.includes("@")) {
      return res.status(400).json({
        success: false,
        message: "A valid email address is required to claim the prize",
      });
    }

    /**
     * MAJOR BUG FIX:
     * Fetch the specific win history record by ID and ensure it belongs to the user
     * and is not already claimed.
     */
    const query = {
      _id: winHistoryId,
      userId: userId,
      claimedAt: null // only unclaimed wins
    };

    // 🛠️ [TESTING MODE] Allow test user to bypass the 'claimedAt: null' check to claim repeatedly
    const TESTING_USER_ID = process.env.GIVEAWAY_TEST_USER_ID;
    if (TESTING_USER_ID && userId.toString() === TESTING_USER_ID) {
      delete query.claimedAt;
    }

    const winHistory = await GiveawayWinHistory.findOne(query);

    if (!winHistory) {
      return res.status(404).json({
        success: false,
        message: "No unclaimed prize found with the provided ID for this user",
      });
    }

    /**
     * Check if user has an active store subscription (Apple/Google)
     */
    const Subscription = require("../../modules/subscription/models/Subscription");
    const Prize = require("../../modules/Admin/giveaways/prize.model");

    const activeStoreSub = await Subscription.findOne({
      userId: userId,
      platform: { $in: ["ios", "android"] },
      status: { $in: ["ACTIVE", "CANCELLED"] },
      autoRenew: true,
      expiresAt: { $gt: new Date() }
    }).lean();

    const prizeDetails = await Prize.findById(winHistory.prizeId).select("type").lean();

    /**
     * Claim prize (LOCK) — atomic conditional update instead of a separate
     * findOne + save. `query` still requires `claimedAt: null` (unless the
     * test-user bypass removed it above), so if two requests race for the
     * same win, only the first update can match and succeed; the loser gets
     * `updated === null` back instead of silently overwriting the claim.
     */
    // 🔒 If user has active store sub and won Premium, put in QUEUE
    // if (activeStoreSub && prizeDetails?.type === "FREE_PREMIUM") {
    //   deliveryStatus = "QUEUED";
    //   queueReason = "User has an active Apple/Google subscription.";
    // } else {
    //   deliveryStatus = "PENDING";
    // }

    const updated = await GiveawayWinHistory.findOneAndUpdate(
      query,
      {
        $set: {
          claimedAt: new Date(),
          claimEmail: claimEmail.toLowerCase().trim(),
          deliveryStatus: "REVEALED",
        },
      },
      { new: true }
    );

    if (!updated) {
      return res.status(409).json({
        success: false,
        message: "This prize has already been claimed",
      });
    }

    return res.json({
      success: true,
      message: "Prize claimed successfully",
      data: {
        claimedAt: updated.claimedAt,
        deliveryStatus: updated.deliveryStatus,
        claimEmail: updated.claimEmail
      },
    });
  } catch (error) {
    console.error("Claim prize error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to claim prize",
    });
  }
};


module.exports.getGiveawayInfo = async (req, res) => {
  try {
    let info = await GiveawayInfo.findOne();
    if (!info) {
      // Create with default values if not exists
      info = await GiveawayInfo.create({});
    }

    const responseData = {
      brands: info.brands?.map(item => ({
        heading: item.heading,
        subheading: item.subheading
      })) || [],
      howItWorks: info.howItWorks.map(item => ({
        heading: item.heading,
        subheading: item.subheading
      })),
      importantInfo: {
        heading: info.importantInfo?.heading,
        points: info.importantInfo?.points || []
      }
    };

    return res.status(200).json({
      success: true,
      message: "Giveaway info fetched successfully",
      data: responseData
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

module.exports.updateGiveawayInfo = async (req, res) => {
  try {
    const { brands, howItWorks, importantInfo } = req.body;
    let info = await GiveawayInfo.findOne();

    if (!info) {
      info = new GiveawayInfo({});
    }

    if (brands !== undefined) info.brands = brands;
    if (howItWorks !== undefined) info.howItWorks = howItWorks;
    if (importantInfo !== undefined) info.importantInfo = importantInfo;

    await info.save();

    const responseData = {
      brands: info.brands?.map(item => ({
        heading: item.heading,
        subheading: item.subheading
      })) || [],
      howItWorks: info.howItWorks.map(item => ({
        heading: item.heading,
        subheading: item.subheading
      })),
      importantInfo: {
        heading: info.importantInfo?.heading,
        points: info.importantInfo?.points || []
      }
    };

    return res.status(200).json({
      success: true,
      message: "Giveaway info updated successfully",
      data: responseData
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

/**
 * @desc    Get the logged-in user's giveaway history (Wins, claimed status, and prizes)
 * @route   GET /api/v1/user/spinwheel/my-giveaway
 */
module.exports.getMyGiveaways = async (req, res) => {
  try {
    const userId = req.user._id;
    const page = req.query.page ? parseInt(req.query.page) : null;
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;

    // 1️⃣ Always fetch unclaimed/pending wins for spinConfig (lightweight query)
    const unclaimedWin = await GiveawayWinHistory.findOne({
      userId,
      deliveryStatus: { $in: ["PENDING", "REVEALED"] }
    })
      .populate("prizeId", "title value type description spinWheelLabel supportiveItems")
      .lean();

    // 2️⃣ Build history query
    let winHistories;
    let total = 0;

    if (page !== null) {
      // Paginated path
      const skip = (page - 1) * limit;
      [total, winHistories] = await Promise.all([
        GiveawayWinHistory.countDocuments({ userId }),
        GiveawayWinHistory.find({ userId })
          .populate("prizeId", "title value type description spinWheelLabel supportiveItems")
          .populate("campaignId", "title date drawStatus")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean()
      ]);
    } else {
      // Legacy path (no pagination — existing frontend won't break)
      winHistories = await GiveawayWinHistory.find({ userId })
        .populate("prizeId", "title value type description spinWheelLabel supportiveItems")
        .populate("campaignId", "title date drawStatus")
        .sort({ createdAt: -1 })
        .lean();
      total = winHistories.length;
    }

    // 3️⃣ Format giveaway history
    const formattedHistory = winHistories.map(win => {
      const isDelivered = win.deliveryStatus === "DELIVERED";

      return {
        id: win._id,
        wonAt: win.wonAt || win.createdAt,
        claimedAt: win.claimedAt,
        claimEmail: win.claimEmail,
        deliveryStatus: win.deliveryStatus,
        couponCode: isDelivered ? win.couponCode : null,
        giftCardExpiryDate: isDelivered ? win.giftCardExpiryDate : null,
        deliveredAt: win.deliveredAt,

        prize: win.prizeId ? {
          title: win.prizeId.title,
          value: win.prizeId.value,
          type: win.prizeId.type,
          description: win.prizeId.description
        } : null,

        campaign: win.campaignId ? {
          title: win.campaignId.title,
          date: win.campaignId.date,
          drawStatus: win.campaignId.drawStatus
        } : null
      };
    });

    // 4️⃣ Spin config from the dedicated unclaimed query
    let spinConfig = {
      showSpin: false
    };

    if (unclaimedWin && unclaimedWin.prizeId) {
      const prize = unclaimedWin.prizeId;

      // 🎯 Fix: Wheel MUST have exactly 6 options (1 winner + 5 supporting prizes)
      const DEFAULT_SUPPORTIVE = ["Better Luck Next Time", "Try Again", "Almost Had It", "Keep Spinning", "So Close!"];

      let supportiveItems = (prize.supportiveItems && prize.supportiveItems.length > 0)
        ? [...prize.supportiveItems]
        : DEFAULT_SUPPORTIVE;

      // Ensure we have exactly 5 supportive items (slice if more, pad if less)
      if (supportiveItems.length > 5) {
        supportiveItems = supportiveItems.slice(0, 5);
      } else while (supportiveItems.length < 5) {
        supportiveItems.push(DEFAULT_SUPPORTIVE[supportiveItems.length % DEFAULT_SUPPORTIVE.length]);
      }

      // Map to label format
      let wheelItems = supportiveItems.map(item => ({ label: item }));

      // Calculate a random winner index (0 to 5)
      const winnerIndex = Math.floor(Math.random() * 6);

      // Insert the actual win label at the winner index
      wheelItems.splice(winnerIndex, 0, {
        label: prize.spinWheelLabel || prize.title,
      });
      spinConfig = {
        available: true,
        showSpin: true,
        winnerIndex,
        items: wheelItems,
        prize: {
          title: prize.title,
          value: prize.value,
          type: prize.type,
        }
      };
    }

    const response = {
      success: true,
      message: "Giveaway data fetched successfully",
      totalWins: total,
      data: {
        history: formattedHistory,
        spinConfig: spinConfig
      }
    };

    // Add pagination metadata only when paginated
    if (page !== null) {
      response.pagination = {
        totalItems: total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };
    }

    return res.status(200).json(response);
  } catch (error) {
    console.error("Get my giveaways error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch giveaway history"
    });
  }
};

