// eslint-disable-next-line no-unused-vars
const GiveawayCampaign = require("../Admin/giveaways/giveawayCampaign.model");
const Prize = require("../Admin/giveaways/prize.model");
const GiveawayWinHistory = require("../Admin/giveaways/giveawayWinHistory.model");
const GiveawayInfo = require("../Admin/giveaways/giveawayInfo.model");

module.exports.getSpinWheelConfig = async (req, res) => {
  try {
    const userId = req.user._id;

    /**
     * MAJOR BUG FIX:
     * DONT check for 'today' campaign. User might spin the wheel on Saturday.
     * Simply look if this user has any UNCLAIMED win waiting for them!
     */
    const winHistory = await GiveawayWinHistory.findOne({
      userId: userId,
      claimedAt: null
    }).sort({ createdAt: -1 });

    if (!winHistory) {
      // Non-winner (Ya already claimed winner) ko spin nahi dikhega
      return res.json({
        success: false,
        message: "Better luck next time",
        data: {
          available: true,
          showSpin: false
        }
      });
    }

    /**
     * 4️⃣ Prize ka data aur supportive wheel items nikaalo
     */
    const prize = await Prize.findById(winHistory.prizeId);
    const supportItem = await Prize.findOne({ isActive: true });


    let supportiveItems = supportItem ? [...supportItem.supportiveItems] : ["Try Again", "Oops", "Next Time"];

    let wheelItems = prize.supportiveItems.map((item) => ({
      label: item,
    }));

    /**
     * 6️⃣ Random index decide karo
     * (sirf UI ke liye, winner already decided hai)
     */
    const winnerIndex = Math.floor(
      Math.random() * (supportiveItems.length + 1)
    );

    /**
     * 7️⃣ Prize ka spin label us random index par insert karo
     */
    supportiveItems.splice(winnerIndex, 0, prize.spinWheelLabel);

    wheelItems.splice(winnerIndex, 0, {
      label: prize.spinWheelLabel,
    });

    /**
     * 8️⃣ Final response frontend ko bhejo
     */
    return res.json({
      success: true,
      message: "Spin wheel loaded successfully",
      data: {
        available: true,
        showSpin: true,
        winnerIndex,
        items: wheelItems,
        supportiveItems: prize.supportiveItems,
        prize: {
          title: prize.title,
          value: prize.value,
          type: prize.type,
        },
      }
    });
  } catch (error) {
    console.error("Spin wheel API error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load spin wheel",
    });
  }
};

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

    winHistory.deliveryStatus = "PENDING";

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

    // Fetch all win histories for the user
    // Populate prize and campaign details for rich frontend rendering
    const winHistories = await GiveawayWinHistory.find({ userId: userId })
      .populate("prizeId", "title value type description")
      .populate("campaignId", "title date drawStatus")
      .sort({ createdAt: -1 })
      .lean();

    // Format the response securely and cleanly
    const formattedData = winHistories.map(win => {
      // Security Check: Only expose the actual gift card codes if the status is DELIVERED
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

    return res.status(200).json({
      success: true,
      message: "User giveaway history fetched successfully",
      totalWins: winHistories.length,
      data: formattedData
    });
  } catch (error) {
    console.error("Get my giveaways error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch giveaway history"
    });
  }
};
