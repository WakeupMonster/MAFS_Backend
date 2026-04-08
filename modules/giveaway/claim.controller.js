// eslint-disable-next-line no-unused-vars
const GiveawayCampaign = require("../Admin/giveaways/giveawayCampaign.model");
const Prize = require("../Admin/giveaways/prize.model");
const GiveawayWinHistory = require("../Admin/giveaways/giveawayWinHistory.model");
const GiveawayInfo = require("../Admin/giveaways/giveawayInfo.model");

module.exports.claimPrize = async (req, res) => {
  try {
    const userId = req.user._id;
    const { claimEmail } = req.body;

    // Email validation (zaroori aur sahi format mein)
    if (!claimEmail || typeof claimEmail !== "string" || !claimEmail.includes("@")) {
      return res.status(400).json({
        success: false,
        message: "A valid email address is required to claim the prize",
      });
    }

    /**
     * MAJOR BUG FIX:
     * DONT check for 'today' campaign. User might claim the prize on Saturday or Sunday.
     * Simply look for the most recent unclaimed win for this user!
     */
    const winHistory = await GiveawayWinHistory.findOne({
      userId: userId,
      claimedAt: null // only unclaimed wins
    }).sort({ createdAt: -1 });

    if (!winHistory) {
      return res.status(404).json({
        success: false,
        message: "No unclaimed prize found or already claimed",
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
     * Claim prize (LOCK)
     */
    winHistory.claimedAt = new Date();
    winHistory.claimEmail = claimEmail.toLowerCase().trim();

    // 🔒 If user has active store sub and won Premium, put in QUEUE
    // if (activeStoreSub && prizeDetails?.type === "FREE_PREMIUM") {
    //   winHistory.deliveryStatus = "QUEUED";
    //   winHistory.queueReason = "User has an active Apple/Google subscription.";
    // } else {
    //   winHistory.deliveryStatus = "PENDING";
    // }

    winHistory.deliveryStatus = "REVEALED";

    await winHistory.save();

    return res.json({
      success: true,
      message: "Prize claimed successfully",
      data: {
        claimedAt: winHistory.claimedAt,
        deliveryStatus: winHistory.deliveryStatus,
        claimEmail: winHistory.claimEmail
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

    // 1️⃣ Fetch all win histories for the user
    // Populate prize and campaign details
    const winHistories = await GiveawayWinHistory.find({ userId: userId })
      .populate("prizeId", "title value type description spinWheelLabel supportiveItems")
      .populate("campaignId", "title date drawStatus")
      .sort({ createdAt: -1 })
      .lean();

    // 2️⃣ Format giveaway history
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

    // 3️⃣ Identify if there's an unclaimed win to provide spin configuration
    // const unclaimedWin = winHistories.find(win => !win.claimedAt);
    const unclaimedWin = winHistories.find(win => win.deliveryStatus === "PENDING" || win.deliveryStatus === "REVEALED");

    let spinConfig = {
      // available: true,
      showSpin: false
    };

    if (unclaimedWin && unclaimedWin.prizeId) {
      const prize = unclaimedWin.prizeId;

      // Fetch supportive wheel items (generic items like "Try Again")
      const supportItem = await Prize.findOne({ isActive: true }).lean();
      let supportiveItems = supportItem ? [...supportItem.supportiveItems] : ["Try Again", "Oops", "Next Time"];

      // Combine with prize-specific items for UI
      let wheelItems = (prize.supportiveItems && prize.supportiveItems.length > 0)
        ? prize.supportiveItems.map(item => ({ label: item }))
        : supportiveItems.map(item => ({ label: item }));

      // Calculate a random winner index (UI only, win is already decided)
      const winnerIndex = Math.floor(Math.random() * (wheelItems.length + 1));

      // Insert the actual win label at the calculated index
      wheelItems.splice(winnerIndex, 0, {
        label: prize.spinWheelLabel || prize.title,
      });

      spinConfig = {
        available: true,
        showSpin: true,
        winnerIndex,
        items: wheelItems,
        supportiveItems: prize.supportiveItems,
        prize: {
          title: prize.title,
          value: prize.value,
          type: prize.type,
        }
      };
    }

    return res.status(200).json({
      success: true,
      message: "Giveaway data fetched successfully",
      totalWins: winHistories.length,
      data: {
        history: formattedHistory,
        spinConfig: spinConfig
      }
    });
  } catch (error) {
    console.error("Get my giveaways error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch giveaway history"
    });
  }
};

