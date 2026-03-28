// eslint-disable-next-line no-unused-vars
const GiveawayCampaign = require("../Admin/giveaways/giveawayCampaign.model");
const Prize = require("../Admin/giveaways/prize.model");
const GiveawayWinHistory = require("../Admin/giveaways/giveawayWinHistory.model");

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
