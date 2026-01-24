const GiveawayCampaign = require("../giveawayCampaign.model");
const Prize = require("../prize.model");


exports.getSpinWheelConfig = async (req, res) => {
  try {
    const userId = req.user._id;

    /**
     * 1️⃣ Aaj ki date normalize karo
     * (taaki date comparison exact ho)
     */
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    /**
     * 2️⃣ Aaj ka COMPLETED campaign nikaalo
     */
    const campaign = await GiveawayCampaign.findOne({
      date: today,
      isActive: true,
      drawStatus: "COMPLETED"
    });

    // Agar aaj koi campaign hi nahi
    if (!campaign) {
      return res.json({
        available: false,
        showSpin: false,
        reason: "NO_CAMPAIGN_TODAY"
      });
    }

    /**
     * 3️⃣ Check karo: ye user winner hai ya nahi
     */
    if (
      !campaign.winnerUserId ||
      campaign.winnerUserId.toString() !== userId.toString()
    ) {
      // Non-winner ko spin nahi dikhega
      return res.json({
        available: true,
        showSpin: false,
        message: "Better luck next time"
      });
    }

    /**
     * 4️⃣ Prize ka data nikaalo
     */
    const prize = await Prize.findById(campaign.prizeId);

    /**
     * 5️⃣ Campaign ke supportive items lo
     * (ye admin ne set kiye hote hain)
     */
    let supportiveItems = [...campaign.supportiveItems];

    /**
     * 6️⃣ Random index decide karo
     * (sirf UI ke liye, winner already decided hai)
     */
    const winnerIndex = Math.floor(
      Math.random() * (supportiveItems.length + 1)
    );

    /**
     * 7️⃣ Prize ka spin label
     * us random index par insert karo
     */
    supportiveItems.splice(
      winnerIndex,
      0,
      prize.spinWheelLabel
    );

    /**
     * 8️⃣ Final response frontend ko bhejo
     */
    return res.json({
      available: true,
      showSpin: true,

      // Spin wheel ke saare labels
      items: supportiveItems.map(label => ({ label })),

      // Frontend isi index par wheel rokega
      winnerIndex,

      // Win screen ke liye prize info
      prize: {
        title: prize.title,
        value: prize.value,
        type: prize.type
      }
    });

  } catch (error) {
    console.error("Spin wheel API error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load spin wheel"
    });
  }
};


const GiveawayWinHistory = require("../giveawayWinHistory.model");



exports.claimPrize = async (req, res) => {
  try {
    const userId = req.user._id;

  
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const campaign = await GiveawayCampaign.findOne({
      date: today,
      drawStatus: "COMPLETED"
    });

    if (!campaign) {
      return res.status(400).json({
        success: false,
        message: "No active giveaway today"
      });
    }

  
    if (campaign.winnerUserId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not the winner"
      });
    }

    /**
     * Win history nikaalo
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
     * 4Double claim protection
     */
    if (winHistory.claimedAt) {
      return res.status(400).json({
        success: false,
        message: "Prize already claimed"
      });
    }

    /**
     * Claim prize (LOCK)
     */
    winHistory.claimedAt = new Date();
    winHistory.deliveryStatus = "PENDING";
    await winHistory.save();

    return res.json({
      success: true,
      message: "Prize claimed successfully",
      data: {
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