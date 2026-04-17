/* eslint-disable no-unused-vars */
const GiveawayCampaign = require("./giveawayCampaign.model");
const GiveawayWinHistory = require("./giveawayWinHistory.model");
const notificationService = require("../../notifications/notification.service");
const User = require("../../../modules/auth/auth.model");
const Prize = require("./prize.model");
const utils = require("../../auth/auth.utils");
const Profile = require("../../profile/profile.model"); // adjust path

const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");
dayjs.extend(utc);
dayjs.extend(timezone);

const CURRENT_TZ = process.env.GIVEAWAY_TIMEZONE || "Australia/Sydney";

// ═══════════════════════════════════════════
// 🛡️ HELPER: Weekly Boundary Calculator
// Calculates the Monday 00:00 → Sunday 23:59 boundaries for any given date.
// Used by createCampaign & bulkCreate to enforce "1 campaign per week" rule.
// ═══════════════════════════════════════════
function getWeekBoundaries(dateInput) {
  const d = dayjs(dateInput).tz(CURRENT_TZ).startOf("day");
  const dayOfWeek = d.day(); // 0=Sun, 1=Mon, ..., 6=Sat
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = d.add(mondayOffset, "day").startOf("day").toDate();
  const weekEnd = d.add(mondayOffset + 6, "day").endOf("day").toDate();
  return { weekStart, weekEnd };
}

module.exports.getAllPrizes = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || "";
    const type = req.query.type || "";

    // 1. Build Match Stage (Filtering)
    const matchStage = {};
    if (type && type !== "ALL") {
      matchStage.type = type;
    }
    if (search) {
      matchStage.title = { $regex: search, $options: "i" };
    }

    // 2. Execute Aggregation
    const result = await Prize.aggregate([
      { $match: matchStage },
      {
        $facet: {
          // Metadata: Count total documents matching the filters
          metadata: [{ $count: "total" }],
          // Data: Apply sorting and pagination
          data: [
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limit },
          ],
        },
      },
    ]);

    // 3. Extract results from Facet
    const prizes = result[0].data;
    const totalPrizes = result[0].metadata[0]?.total || 0;
    const totalPages = Math.ceil(totalPrizes / limit);

    return res.status(200).json({
      success: true,
      pagination: {
        totalPrizes,
        page,
        limit,
        totalPages,
      },
      data: prizes,
    });
  } catch (err) {
    console.error("Fetch Prizes Error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch prizes",
      error: err.message,
    });
  }
};

module.exports.createPrize = async (req, res) => {
  try {
    let { title, type, value, description, spinWheelLabel, supportiveItems, } =
      req.body;

    if (!supportiveItems || supportiveItems.length < 2) {
      return res.status(400).json({ success: false, message: "At least 2 supportive items are required" });
    }

    if (!title || !type || !spinWheelLabel) {
      return res.status(400).json({ success: false, message: "Missing required prize fields" });
    }

    if (type === "GIFT_CARD" && !value) {
      return res.status(400).json({ success: false, message: "value is required for GIFT_CARD" });
    }

    let productId = null;

    // SMART PRODUCT SYNCHRONIZATION
    // if (type === "FREE_PREMIUM") {
    //   if (!planType || !durationInDays) {
    //     return res.status(400).json({ success: false, message: "planType and durationInDays are required for FREE_PREMIUM prizes" });
    //   }

    //   const Product = require("../../subscription/models_v3/Product");
    //   // 👉 NAYA: Frontend sirf "1_MONTH" bhejega, backend chuppe se productId pata laga lega
    //   const productInfo = await Product.findOne({ planType: planType, isActive: true });

    //   if (!productInfo) {
    //     return res.status(404).json({ success: false, message: "Selected Plan Type Not Found in Database" });
    //   }

    //   productId = productInfo._id;

    //   // Since your product price format is "$29.99", extract only the number 29.99
    //   value = parseFloat(productInfo.displayPrice.replace(/[^0-9.]/g, '')) || 0;

    //   // 🔥 Note: durationInDays aap wala hi rahega (Admin ka diya hua 10 din, 12 din etc)
    //   // Original product table ka durationDays chhuenge bhi nahi!
    // }

    const prize = await Prize.create({
      title,
      type,
      value: value || 0,
      description,
      spinWheelLabel,
      supportiveItems,
      // durationInDays: type === "FREE_PREMIUM" ? durationInDays : null,
      // planType: type === "FREE_PREMIUM" ? planType : null,
      // productId: type === "FREE_PREMIUM" ? productId : null,
    });

    return res.status(201).json({
      success: true,
      message: "Prize created successfully",
      data: prize,
    });
  } catch (error) {
    console.error("Create Prize Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create prize",
    });
  }
};

module.exports.updatePrize = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Destructure only the allowed fields from req.body
    const {
      title,
      type,
      value,
      spinWheelLabel,
      supportiveItems,
      description,
      durationInDays,
      planType,
      isActive,
    } = req.body;

    // 2. Perform the update with validation
    const prize = await Prize.findByIdAndUpdate(
      id,
      {
        $set: {
          title,
          type,
          value,
          spinWheelLabel,
          supportiveItems,
          description,
          durationInDays,
          planType,
          isActive,
        },
      },
      {
        new: true, // Return the updated document
        runValidators: true, // ✅ Ensure enum and required checks are run on update
      }
    );

    if (!prize) {
      return res.status(404).json({
        success: false,
        message: "Prize not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Prize updated successfully",
      data: prize,
    });
  } catch (err) {
    console.error("Update Prize Error:", err);
    return res.status(500).json({
      success: false,
      message:
        err.name === "ValidationError" ? err.message : "Failed to update prize",
    });
  }
};

/**
 * @desc    Delete a prize by ID
 * @route   DELETE /api/v1/admin/giveaway/prizes/:id
 * @access  Private/Admin
 */
module.exports.deletePrize = async (req, res, next) => {
  try {
    const { id } = req.params;

    // 1. Check if the prize is currently linked to any campaigns
    const linkedCampaign = await GiveawayCampaign.findOne({ prizeId: id });

    if (linkedCampaign) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot delete prize. It is currently assigned to one or more campaigns.",
      });
    }

    // 2. Perform the deletion
    const prize = await Prize.findByIdAndDelete(id);

    if (!prize) {
      return res.status(404).json({
        success: false,
        message: "Prize not found",
      });
    }

    // 3. Success Response
    res.status(200).json({
      success: true,
      message: "Prize deleted successfully",
      data: { id },
    });
  } catch (error) {
    console.error("Delete Prize Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete prize",
      error: error.message,
    });
  }
};

module.exports.createCampaign = async (req, res) => {
  try {
    const { title, date, prizeId } = req.body;

    // 🔒 Strictly parse date string as Midnight in target timezone (AEST)
    const campaignDate = dayjs.tz(date, CURRENT_TZ).startOf("day");
    const campaignDateQuery = campaignDate.toDate();

    // ═══════════════════════════════════════════
    // 🛡️ EDGE CASE 1: Weekly Boundary Guard
    // Ek week (Monday 00:00 → Sunday 23:59) mein sirf ek hi campaign ban sakta hai.
    // Purana logic sirf exact date check karta tha, jisse ek week mein Mon + Wed + Fri
    // teenon pe campaign ban sakta tha → multiple winners → galat push notifications.
    // Ab hum full week range check karte hain.
    // ═══════════════════════════════════════════
    const { weekStart, weekEnd } = getWeekBoundaries(campaignDateQuery);

    const existingWeekCampaign = await GiveawayCampaign.findOne({
      date: { $gte: weekStart, $lte: weekEnd },
    });

    if (existingWeekCampaign) {
      const existingDateStr = dayjs(existingWeekCampaign.date).tz(CURRENT_TZ).format("dddd, DD MMM YYYY");
      return res.status(400).json({
        success: false,
        message: `A campaign already exists for this week (${existingDateStr}). Only one campaign per week is allowed.`,
      });
    }

    // ═══════════════════════════════════════════
    // 🛡️ EDGE CASE 2: Friday Time Lock (Race Condition Guard)
    // Agar aaj Friday hai aur cron execution window (5:50 PM - 6:10 PM AEST)
    // ke andar hai, toh current week ke liye campaign create karna block kar do
    // taaki worker aur admin ka conflict (race condition) na ho.
    // ═══════════════════════════════════════════
    const nowTZ = dayjs().tz(CURRENT_TZ);
    const { weekStart: currentWeekStart, weekEnd: currentWeekEnd } = getWeekBoundaries(nowTZ.toDate());
    const isCurrentWeek = campaignDateQuery >= currentWeekStart && campaignDateQuery <= currentWeekEnd;

    if (isCurrentWeek && nowTZ.day() === 5) {
      const nowTimeInMinutes = nowTZ.hour() * 60 + nowTZ.minute();
      // 5:50 PM = 1070 minutes, 6:10 PM = 1090 minutes
      if (nowTimeInMinutes >= 1070 && nowTimeInMinutes <= 1090) {
        return res.status(400).json({
          success: false,
          message: "Draw is currently in progress. Please try again after 6:10 PM AEST or create for next week.",
        });
      }
    }

    // [COMMENTED OUT] Old exact-date duplicate check
    // Replaced by weekly boundary check above. Old logic allowed multiple
    // campaigns in the same week on different dates which caused multiple winners.
    // const existingCampaign = await GiveawayCampaign.findOne({
    //   date: campaignDateQuery,
    // });
    // if (existingCampaign) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Giveaway campaign already exists for this date",
    //   });
    // }

    const prize = await Prize.findOne({
      _id: prizeId,
      isActive: true,
    });

    if (!prize) {
      return res.status(400).json({
        success: false,
        message: "Invalid or inactive prize",
      });
    }

    const campaign = await GiveawayCampaign.create({
      title,
      date: campaignDateQuery,
      prizeId: prize._id,
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
          value: prize.value,
        },
        drawStatus: campaign.drawStatus,
        isActive: campaign.isActive,
      },
    });
  } catch (error) {
    console.error("Create Campaign Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create giveaway campaign",
    });
  }
};


exports.getAllCampaigns = async (req, res) => {
  try {
    // 1. Pagination Setup
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || "";
    const drawStatus = req.query.drawStatus || "";
    const isActive = req.query.isActive;

    // 2. Initial Match (Static filters)
    // const matchFilter = {};
    // if (drawStatus) matchFilter.drawStatus = drawStatus;
    // if (isActive !== undefined) matchFilter.isActive = isActive === "true";

    // Inside your getAllCampaigns controller
    const matchFilter = {};

    if (drawStatus === "ACTIVE") {
      // Active: Not drawn yet AND admin has it enabled
      matchFilter.drawStatus = "PENDING";
      matchFilter.isActive = true;
    } else if (drawStatus === "DISABLED") {
      // Disabled: Admin has manually toggled it off
      matchFilter.isActive = false;
    } else if (drawStatus === "COMPLETED") {
      // Completed: Draw is finished
      matchFilter.drawStatus = "COMPLETED";
    }

    const pipeline = [];

    // Filter early to improve performance
    if (Object.keys(matchFilter).length > 0) {
      pipeline.push({ $match: matchFilter });
    }

    // 3. Joins (Lookup)
    pipeline.push(
      {
        $lookup: {
          from: "giveawayprizes",
          localField: "prizeId",
          foreignField: "_id",
          as: "prize",
        },
      },
      { $unwind: { path: "$prize", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "users",
          localField: "winnerUserId",
          foreignField: "_id",
          as: "winner",
        },
      },
      { $unwind: { path: "$winner", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "profiles",
          localField: "winner._id",
          foreignField: "userId",
          as: "winnerProfile",
        },
      },
      { $unwind: { path: "$winnerProfile", preserveNullAndEmptyArrays: true } }
    );

    // 4. Server-side Search (Flexible across Campaign, Prize, and Winner details)
    if (search?.trim()) {
      const regex = new RegExp(
        search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "i"
      );
      pipeline.push({
        $match: {
          $or: [
            { title: regex },                  // Search by Campaign Title
            { "prize.title": regex },          // Search by Prize Title
            { "prize.spinWheelLabel": regex }, // Search by Spin Wheel Label
            { "winner.email": regex },         // Search by Winner Email
            { "winner.phone": regex },         // Search by Winner Phone
            { "winner.profile.nickname": regex }, // [NAYA]: Search by Winner Nickname
          ],
        },
      });
    }

    // 5. Execution with Facet (Pagination & Optimized Projection)
    pipeline.push({
      $facet: {
        metadata: [{ $count: "total" }],
        data: [
          { $sort: { createdAt: -1 } },
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              title: 1,
              date: 1,
              drawStatus: 1,
              isActive: 1,
              createdAt: 1,
              prize: 1,
              winner: {
                _id: "$winner._id",
                email: "$winner.email",
                phone: "$winner.phone",
                nickname: "$winnerProfile.nickname",
                gender: "$winnerProfile.gender",
                location: {
                  city: "$winnerProfile.location.city",
                  country: "$winnerProfile.location.country",
                },
              },
            },
          },
        ],
      },
    });

    const [result] = await GiveawayCampaign.aggregate(pipeline);

    const total = result.metadata[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    return res.status(200).json({
      success: true,
      pagination: {
        totalItems: total,
        page,
        limit,
        totalPages,
      },
      data: result.data,
    });
  } catch (err) {
    console.error(">>> Get All Campaigns Error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch campaigns",
    });
  }
};

module.exports.updateCampaign = async (req, res) => {
  try {
    const { id } = req.params;

    const campaign = await GiveawayCampaign.findById(id);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Campaign not found",
      });
    }

    if (campaign.drawStatus === "COMPLETED") {
      return res.status(400).json({
        success: false,
        message: "Completed campaign cannot be updated",
      });
    }

    Object.assign(campaign, req.body);
    await campaign.save();

    return res.json({
      success: true,
      message: "Campaign updated successfully",
      data: campaign,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to update campaign",
    });
  }
};

// exports.getWinners = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const campaign = await GiveawayCampaign.findById(id)
//       .populate("winnerUserId", "email phone")
//       .populate("prizeId");

//     if (!campaign) {
//       return res.status(404).json({
//         success: false,
//         message: "Campaign not found",
//       });
//     }

//     return res.json({
//       success: true,
//       data: {
//         campaignId: campaign._id,
//         date: campaign.date,
//         prize: campaign.prizeId,
//         winner: campaign.winnerUserId,
//         drawStatus: campaign.drawStatus,
//         drawAt: campaign.drawAt || null,
//       },
//     });
//   } catch (err) {
//     return res.status(500).json({
//       success: false,
//       message: "Failed to fetch winner",
//     });
//   }
// };

exports.getAllWinners = async (req, res) => {
  try {
    // 1. Pagination Setup
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || "";
    const status = req.query.status || "";

    // 1. Initial Match (Index-friendly)
    const initialMatch = {};
    if (status) initialMatch.drawStatus = status;

    // 2. Base Pipeline for Joins and Search
    const pipeline = [
      { $match: initialMatch },
      {
        $lookup: {
          from: "giveawayprizes",
          localField: "prizeId",
          foreignField: "_id",
          as: "prize",
        },
      },
      { $unwind: { path: "$prize", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "users",
          localField: "winnerUserId",
          foreignField: "_id",
          as: "winner",
        },
      },
      { $unwind: { path: "$winner", preserveNullAndEmptyArrays: true } },
    ];

    // 3. Global Search Filter
    if (search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i");
      pipeline.push({
        $match: {
          $or: [
            { title: searchRegex },             // Search by Campaign Title
            { "prize.title": searchRegex },     // Search by Prize Title
            { "winner.phone": searchRegex },     // Search by Winner Phone
            { "winner.email": searchRegex },     // Search by Winner Email
            { "winner.profile.nickname": searchRegex }, // [NAYA]: Search by Winner Nickname
          ],
        },
      });
    }

    // 4. Multi-Facet execution (No $sort stage here as requested)
    const results = await GiveawayCampaign.aggregate([
      ...pipeline,
      {
        $facet: {
          metadata: [{ $count: "total" }],
          stats: [
            {
              $group: {
                _id: null,
                totalCampaigns: { $sum: 1 },
                completed: {
                  $sum: {
                    $cond: [{ $eq: ["$drawStatus", "COMPLETED"] }, 1, 0],
                  },
                },
                pending: {
                  $sum: { $cond: [{ $eq: ["$drawStatus", "PENDING"] }, 1, 0] },
                },
                withWinner: {
                  $sum: {
                    $cond: [{ $ifNull: ["$winnerUserId", false] }, 1, 0],
                  },
                },
              },
            },
          ],
          data: [
            { $skip: skip },
            { $limit: limit },
            {
              $project: {
                _id: 1,
                date: 1,
                drawStatus: 1,
                drawAt: 1,
                prize: {
                  _id: "$prize._id",
                  title: "$prize.title",
                  type: "$prize.type",
                  value: "$prize.value",
                  spinWheelLabel: "$prize.spinWheelLabel",
                },
                winner: {
                  $cond: {
                    if: { $gt: ["$winner._id", null] },
                    then: {
                      _id: "$winner._id",
                      phone: "$winner.phone",
                      email: "$winner.email",
                      nickname: "$winner.nickname",
                    },
                    else: null,
                  },
                },
              },
            },
          ],
        },
      },
    ]);

    // Format Response
    const total = results[0].metadata[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);
    const statsKPI = results[0].stats[0] || {
      totalCampaigns: 0,
      completed: 0,
      pending: 0,
      withWinner: 0,
    };
    const data = results[0].data;

    return res.json({
      success: true,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
      statsKPI,
      data,
    });
  } catch (err) {
    console.error("getAllWinners error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch winners" });
  }
};

module.exports.resendPrize = async (req, res) => {
  try {
    const { id } = req.params;
    const campaign = await GiveawayCampaign.findById(id);
    if (!campaign || !campaign.winnerUserId) {
      return res.status(400).json({
        success: false,
        message: "Winner not found for this campaign",
      });
    }

    return res.json({
      success: true,
      message: "Prize resend triggered successfully",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to resend prize",
    });
  }
};
module.exports.markPrizeAsDelivered = async (req, res) => {
  try {
    const { winHistoryId, couponCode, actualDeliveredValue, emailTemplate, giftCardExpiryDate } = req.body;

    const winHistory = await GiveawayWinHistory.findById(winHistoryId);

    if (!winHistory) {
      return res.status(404).json({
        success: false,
        message: "Win history not found",
      });
    }

    if (!winHistory.claimedAt) {
      return res.status(400).json({
        success: false,
        message: "Prize not claimed yet",
      });
    }

    if (winHistory.deliveryStatus === "DELIVERED") {
      return res.status(400).json({
        success: false,
        message: "Prize already delivered",
      });
    }
    // 1. DONT mistake Campaign for Prize! Use the correct Prize ID.
    // const campaign = await GiveawayCampaign.findById(winHistory.campaignId);
    const prize = await Prize.findById(winHistory.prizeId);
    const user = await User.findById(winHistory.userId);

    if (!prize || !user) {
      return res
        .status(400)
        .json({ success: false, message: "Prize or User not found" });
    }

    // 🔒 Edge Case 4: GIFT_CARD ke liye voucher code mandatory hai
    if (prize.type === "GIFT_CARD" && !couponCode) {
      return res.status(400).json({
        success: false,
        message: "Gift Card code (coupenCode) is required for GIFT_CARD prizes.",
      });
    }

    console.log(prize.title, "prize title")


    winHistory.deliveryStatus = "DELIVERED";
    winHistory.deliveredAt = new Date();

    if (actualDeliveredValue) winHistory.actualDeliveredValue = actualDeliveredValue;
    if (couponCode) winHistory.couponCode = couponCode.trim();
    if (giftCardExpiryDate) winHistory.giftCardExpiryDate = giftCardExpiryDate

    await winHistory.save();

    await notificationService.sendPrizeDeliveredNotification(winHistory.userId);

    // 2. Safe Email Sending (Use Claim Email if provided, fallback to user email)
    const emailToSend = winHistory.claimEmail || user.email;
    let emailSent = false;

    if (emailToSend) {
      try {
        let emailSubject = "🎉 Your Prize has been Delivered";
        let emailBody = "";
        if (prize.type === "GIFT_CARD") {
          const giftCode = couponCode || "Please contact support for your code.";
          const expiryDate = giftCardExpiryDate
            ? new Date(giftCardExpiryDate).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })
            : null;

          const brandAqua = "#00d9d6";
          const logoUrl = "https://res.cloudinary.com/dew7qscdq/image/upload/v1775202656/mustardLogo2_zn7b5v.png"; // Changed to .png for Email Client Compatibility

          if (emailTemplate) {
            // 🚀 New Dynamic Profile-Themed Email Payload
            emailSubject = emailTemplate.subject || "🎉 Congratulations! Your Prize Awaits";

            let stepsHtml = "";
            if (Array.isArray(emailTemplate.steps) && emailTemplate.steps.length > 0) {
              stepsHtml = `
                  <div style="margin: 25px 0; padding: 20px; background-color: #f8fafc; border-radius: 12px; border-left: 4px solid ${brandAqua};">
                    <h3 style="margin-top: 0; color: #1e293b; font-size: 16px; font-weight: 600;">How to redeem:</h3>
                    <ol style="margin: 0; padding-left: 20px; color: #475569; font-size: 14px; line-height: 1.8;">
                      ${emailTemplate.steps.map(step => `<li style="padding-left: 8px; margin-bottom: 6px;">${step}</li>`).join('')}
                    </ol>
                  </div>
                `;
            }

            emailBody = `
                <!DOCTYPE html>
                <html>
                <head>
                  <meta charset="utf-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <title>${emailSubject}</title>
                </head>
                <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9;">
                  
                  <!-- Main Wrapper -->
                  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 40px 20px;">
                    <tr>
                      <td align="center">
                        
                        <!-- Content Card -->
                        <table width="100%" max-width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
                          
                          <!-- Header / Logo Area -->
                          <tr>
                            <td align="center" style="padding: 30px 20px 20px 20px; background-color: #ffffff; border-bottom: 2px solid #f1f5f9;">
                              <!-- Replace with hosted Logo URL below -->
                              <img src="${logoUrl}" alt="Mustard Date" style="max-width: 140px; height: auto; display: block;" />
                            </td>
                          </tr>
  
                          <!-- Body Content -->
                          <tr>
                            <td style="padding: 40px 30px;">
                              
                              <h2 style="color: #0f172a; margin: 0 0 15px 0; font-size: 24px; font-weight: 700; text-align: center;">
                                ${emailTemplate.title || "Your Gift Card is Here!"}
                              </h2>
                              
                              <p style="color: #475569; font-size: 16px; line-height: 1.6; text-align: center; margin: 0 0 30px 0;">
                                ${emailTemplate.description || "Congratulations on winning! Here are the details of your reward."}
                              </p>
                              
                              <!-- Gift Card Block -->
                              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f0fdfa; border: 2px dashed ${brandAqua}; border-radius: 12px;">
                                <tr>
                                  <td align="center" style="padding: 24px;">
                                    <p style="margin: 0 0 8px 0; font-size: 13px; color: #0d9488; text-transform: uppercase; font-weight: 700; letter-spacing: 1px;">Your Private Gift Code</p>
                                    <p style="margin: 0; font-size: 28px; font-weight: 800; letter-spacing: 2px; color: #0f172a; font-family: monospace;">
                                      ${giftCode}
                                    </p>
                                  </td>
                                </tr>
                              </table>
                              
                              ${stepsHtml}
                              
                              ${expiryDate ? `
                              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 20px;">
                                <tr>
                                  <td align="center">
                                    <p style="background-color: #fef2f2; border: 1px solid #fecaca; color: #ef4444; font-size: 13px; padding: 8px 16px; border-radius: 20px; display: inline-block; margin: 0; font-weight: 500;">
                                      ⚠️ Expires on: <strong>${expiryDate}</strong>
                                    </p>
                                  </td>
                                </tr>
                              </table>` : ""}
  
                            </td>
                          </tr>
  
                          <!-- Footer -->
                          <tr>
                            <td style="background-color: #f8fafc; padding: 24px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                              <p style="margin: 0; font-size: 13px; color: #64748b;">
                                If you have any issues, please contact our support team.
                              </p>
                              <p style="margin: 8px 0 0 0; font-size: 13px; color: #64748b;">
                                © ${new Date().getFullYear()} Mustard. All rights reserved.
                              </p>
                            </td>
                          </tr>
                          
                        </table>
                      </td>
                    </tr>
                  </table>
                </body>
                </html>
              `;
          } else {
            // 🛡️ Fallback: Professional Default Layout
            emailSubject = "🎁 Your Gift Card Prize Has Arrived!";
            emailBody = `
                <!DOCTYPE html>
                <html>
                <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9;">
                  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="padding: 40px 20px;">
                    <tr>
                      <td align="center">
                        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                          <tr>
                            <td align="center" style="padding: 30px 20px; border-bottom: 2px solid #f1f5f9;">
                               <img src="${logoUrl}" alt="Mustard Date" style="max-width: 140px; height: auto; display: block;" />
                            </td>
                          </tr>
                          <tr>
                            <td style="padding: 40px 30px; text-align: center;">
                              <h2 style="color: #0f172a; margin: 0 0 15px 0; font-size: 24px;">🎁 Your Gift Card Has Arrived!</h2>
                              <p style="color: #475569; font-size: 16px;">You won: <strong>"${prize.title}"</strong> (Value: $${prize.value || 0})</p>
                              <div style="background-color: #f0fdfa; border: 2px dashed ${brandAqua}; padding: 24px; border-radius: 12px; margin: 30px 0;">
                                <p style="margin: 0 0 8px 0; font-size: 13px; color: #0d9488; text-transform: uppercase; font-weight: 700;">Your Gift Card Code</p>
                                <p style="margin: 0; font-size: 28px; font-weight: 800; letter-spacing: 2px; color: #0f172a; font-family: monospace;">${giftCode}</p>
                              </div>
                              ${expiryDate ? `<p style="color: #ef4444; font-size: 14px;">⚠️ This code expires on: <strong>${expiryDate}</strong></p>` : ""}
                            </td>
                          </tr>
                          <tr>
                            <td style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
                              <p style="margin: 0; font-size: 13px; color: #64748b;">Thank you for participating! 🎉</p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </body>
                </html>
              `;
          }
        }

        await utils.sendEmail(emailToSend, emailSubject, emailBody);
        emailSent = true;
      } catch (emailErr) {
        console.error("Failed to send delivery email, but prize is delivered:", emailErr.message);
        emailSent = false;
      }
    } else {
      console.log("No email found to notify user about delivery.");
    }

    return res.json({
      success: true,
      message: emailSent
        ? "Prize marked as delivered and email sent successfully"
        : "Prize marked as delivered, but email could not be sent",
      emailSent,
      data: {
        deliveredAt: winHistory.deliveredAt,
      },
    });
  } catch (error) {
    console.error("Delivery API error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to mark prize as delivered",
      error: error.message,
    });
  }
};

// module.exports.getPendingDeliveries = async (req, res) => {
//   try {
//     const records = await GiveawayWinHistory.find({
//       deliveryStatus: "PENDING",
//     })
//       .populate("userId", "phone email")
//       .populate("campaignId", "date")
//       .populate("prizeId", "title value")
//       .sort({ claimedAt: -1 });
//     res.json({
//       success: true,
//       count: records.length,
//       data: records,
//     });
//   } catch (error) {
//     console.error("Pending deliveries error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Failed to fetch pending deliveries",
//     });
//   }
// };

module.exports.getPendingDeliveries = async (req, res) => {
  try {
    // 1. Pagination Setup
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || "";
    const deliveryStatus = req.query.deliveryStatus || "";

    // --- 1. Build Dynamic Filter ---
    const matchQuery = {
      deliveryStatus: { $in: ["REVEALED", "DELIVERED"] }, // By default, only show claimed/delivered
    };

    // If deliveryStatus is provided and isn't "ALL", filter by it
    if (
      deliveryStatus &&
      ["REVEALED", "DELIVERED"].includes(deliveryStatus.toUpperCase())
    ) {
      matchQuery.deliveryStatus = deliveryStatus.toUpperCase();
    }

    const pipeline = [];

    // Stage 1: Initial Filter (Filter early for better performance)
    if (Object.keys(matchQuery).length > 0) {
      pipeline.push({ $match: matchQuery });
    }

    // Stage 2: Joins (Lookups)
    pipeline.push(
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "profiles",
          localField: "userId",
          foreignField: "userId", // 🐛 FIX: `profiles` table uses `userId`, not `_id`
          as: "profile",
        },
      },
      { $unwind: { path: "$profile", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "giveawaycampaigns",
          localField: "campaignId",
          foreignField: "_id",
          as: "campaign",
        },
      },
      { $unwind: { path: "$campaign", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "giveawayprizes",
          localField: "prizeId",
          foreignField: "_id",
          as: "prize",
        },
      },
      { $unwind: { path: "$prize", preserveNullAndEmptyArrays: true } }
    );

    // Stage 3: Global Search (Winner info or Prize info)
    if (search?.trim()) {
      const regex = new RegExp(
        search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "i"
      );
      pipeline.push({
        $match: {
          $or: [
            { "user.email": regex },
            { "user.phone": regex },
            { "prize.title": regex },
          ],
        },
      });
    }

    // Stage 4: Facet for Meta and Data
    pipeline.push({
      $facet: {
        metadata: [{ $count: "total" }],
        data: [
          { $sort: { createdAt: -1 } }, // Newest win histories first
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              _id: 1,
              deliveryStatus: 1,
              claimedAt: 1,
              wonAt: 1,
              year: 1,
              user: { _id: 1, email: 1, phone: 1 },
              profile: {
                _id: 1,
                nickname: 1,
                gender: 1,
                location: 1,
                city: 1,
                country: 1
              },
              campaign: { _id: 1, date: 1, title: 1 },
              prize: {
                _id: 1,
                title: 1,
                value: 1,
                type: 1,
              },
            },
          },
        ],
      },
    });

    const [result] = await GiveawayWinHistory.aggregate(pipeline);

    const total = result.metadata[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    return res.status(200).json({
      success: true,
      pagination: {
        totalItems: total,
        page,
        limit,
        totalPages,
      },
      data: result.data,
    });
  } catch (error) {
    console.error(">>> Get Deliveries Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while fetching delivery data",
    });
  }
};

module.exports.getDeliveredPrizes = async (req, res) => {
  try {
    const records = await GiveawayWinHistory.find({
      deliveryStatus: "DELIVERED",
    })
      .populate("userId", "phone email")
      .populate("campaignId", "date")
      .populate("prizeId", "title value")
      .sort({ deliveredAt: -1 });

    res.json({
      success: true,
      count: records.length,
      data: records,
    });
  } catch (error) {
    console.error("Delivered prizes error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch delivered prizes",
    });
  }
};

module.exports.getAllClaims = async (req, res) => {
  try {
    const records = await GiveawayWinHistory.find()
      .populate("userId", "phone email")
      .populate("campaignId", "date")
      .populate("prizeId", "title value")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: records.length,
      data: records,
    });
  } catch (error) {
    console.error("Claims list error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch claims",
    });
  }
};

module.exports.getGiveawayAuditReport = async (req, res) => {
  try {
    const filter = {};

    if (req.query.from && req.query.to) {
      filter.createdAt = {
        $gte: new Date(req.query.from),
        $lte: new Date(req.query.to),
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
      data: records,
    });
  } catch (error) {
    console.error("Audit report error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate audit report",
    });
  }
};

module.exports.bulkCreateCampaignByRanges = async (req, res) => {
  try {
    const { title, ranges, isActive = true } = req.body;

    if (!Array.isArray(ranges) || ranges.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Ranges array is required",
      });
    }

    // 🔒 Today (midnight in target timezone)
    const todayAEST = dayjs().tz(CURRENT_TZ).startOf("day");

    const campaignsToInsert = [];
    const skippedDates = [];

    for (const range of ranges) {
      const { startDate, endDate, prizeId, supportiveItems } = range;

      const prize = await Prize.findById(prizeId);
      if (!prize || !prize.isActive) {
        return res.status(400).json({
          success: false,
          message: `Invalid or inactive prize: ${prizeId}`,
        });
      }

      const start = dayjs.tz(startDate, CURRENT_TZ).startOf("day");
      const end = dayjs.tz(endDate, CURRENT_TZ).startOf("day");

      if (start.isAfter(end)) {
        return res.status(400).json({
          success: false,
          message: "Start date cannot be after end date",
        });
      }

      const normalizedSupportiveItems = Array.isArray(supportiveItems)
        ? supportiveItems.filter(Boolean)
        : [];

      let current = start;
      while (current.isBefore(end) || current.isSame(end)) {
        const campaignDate = current.toDate();

        // ❌ Skip non-Fridays (Weekly Campaigns only fall on Fridays)
        if (current.day() !== 5) {
          current = current.add(1, "day");
          continue;
        }

        // ❌ Skip past dates
        if (current.isBefore(todayAEST)) {
          skippedDates.push({
            date: campaignDate,
            reason: "Past date",
          });
          current = current.add(1, "day");
          continue;
        }

        // ═══════════════════════════════════════════
        // 🛡️ EDGE CASE: Weekly Boundary Guard for Bulk Create
        // Ek week mein sirf ek campaign banega. Agar is Friday ki week mein
        // pehle se campaign hai (ya isi bulk batch mein already add ho chuka hai),
        // toh skip kar do.
        // ═══════════════════════════════════════════
        const { weekStart: bulkWeekStart, weekEnd: bulkWeekEnd } = getWeekBoundaries(campaignDate);

        // Check DB for existing campaign in this week
        const existsInWeekDB = await GiveawayCampaign.findOne({
          date: { $gte: bulkWeekStart, $lte: bulkWeekEnd },
        }).lean();

        // Also check if we already queued a campaign for this week in the current batch
        const existsInBatch = campaignsToInsert.some((c) => {
          return c.date >= bulkWeekStart && c.date <= bulkWeekEnd;
        });

        if (existsInWeekDB || existsInBatch) {
          skippedDates.push({
            date: campaignDate,
            reason: existsInWeekDB
              ? `Campaign already exists for this week (${dayjs(existsInWeekDB.date).tz(CURRENT_TZ).format("DD MMM")})`
              : "Another campaign for this week already added in this batch",
          });
          current = current.add(1, "day");
          continue;
        }

        // 🛡️ Friday Time Lock: Skip if this date falls in current week during cron window
        const bulkNowTZ = dayjs().tz(CURRENT_TZ);
        const { weekStart: bulkCurrentWeekStart, weekEnd: bulkCurrentWeekEnd } = getWeekBoundaries(bulkNowTZ.toDate());
        const isBulkCurrentWeek = campaignDate >= bulkCurrentWeekStart && campaignDate <= bulkCurrentWeekEnd;

        if (isBulkCurrentWeek && bulkNowTZ.day() === 5) {
          const bulkNowMins = bulkNowTZ.hour() * 60 + bulkNowTZ.minute();
          if (bulkNowMins >= 1070 && bulkNowMins <= 1090) {
            skippedDates.push({
              date: campaignDate,
              reason: "Skipped: Draw is currently in progress for this week",
            });
            current = current.add(1, "day");
            continue;
          }
        }

        // [COMMENTED OUT] Old exact-date check
        // Replaced by week-level check above. Old logic only checked if the exact same
        // date had a campaign, but allowed Mon + Fri campaigns in the same week.
        // const exists = await GiveawayCampaign.findOne({ date: campaignDate }).lean();
        // if (exists) {
        //   skippedDates.push({ date: campaignDate, reason: "Campaign already exists" });
        //   current = current.add(1, "day");
        //   continue;
        // }

        campaignsToInsert.push({
          title,
          date: campaignDate,
          prizeId,
          supportiveItems: normalizedSupportiveItems, // 🔥 FIXED
          isActive,
          drawStatus: "PENDING",
        });

        current = current.add(1, "day");
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
        skipped: skippedDates.length,
      },
      skippedDates,
    });
  } catch (error) {
    console.error("bulkCreateCampaignByRanges error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to bulk create campaigns",
    });
  }
};

module.exports.disableCampaign = async (req, res) => {
  try {
    const { id } = req.params;

    const campaign = await GiveawayCampaign.findById(id);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Campaign not found",
      });
    }

    // Already disabled
    if (!campaign.isActive) {
      return res.status(400).json({
        success: false,
        message: "Campaign is already disabled",
      });
    }

    campaign.isActive = false;
    campaign.failureReason = "Disabled by admin";
    await campaign.save();

    return res.json({
      success: true,
      message: "Campaign disabled successfully",
    });
  } catch (error) {
    console.error("Disable campaign error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to disable campaign",
    });
  }
};

module.exports.pauseCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(id, "campaignId");

    const campaign = await GiveawayCampaign.findById(id);
    console.log(campaign.isActive, "active");

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Campaign not found",
      });
    }

    if (!campaign.isActive) {
      return res.status(400).json({
        success: false,
        message: "Campaign is already paused",
      });
    }

    campaign.isActive = false;
    campaign.failureReason = "Paused by admin";
    await campaign.save();
    console.log(campaign.isActive, "afteractive");

    return res.json({
      success: true,
      message: "Campaign paused successfully",
    });
  } catch (error) {
    console.error("Pause campaign error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to pause campaign",
    });
  }
};

/**
 * @desc    Delete a campaign by ID
 * @route   DELETE /api/v1/admin/giveaway/campaigns/:id
 * @access  Private/Admin
 */
exports.deleteCampaign = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if there are any winners for this campaign
    const hasWinners = await GiveawayWinHistory.exists({
      campaignId: id,
      wonAt: { $exists: true }, // Ensure wonAt is present
    });

    if (hasWinners) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete campaign with existing winners",
        code: "CAMPAIGN_HAS_WINNERS",
      });
    }

    // Also check if there are any pending claims
    const hasPendingClaims = await GiveawayWinHistory.exists({
      campaignId: id,
      claimedAt: null, // Not claimed yet
      wonAt: { $exists: true }, // But has won
    });

    if (hasPendingClaims) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete campaign with pending claims",
        code: "CAMPAIGN_HAS_PENDING_CLAIMS",
      });
    }

    // Find and delete the campaign
    const campaign = await GiveawayCampaign.findByIdAndDelete(id);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Campaign not found",
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
      message: "Campaign deleted successfully",
      data: { id },
    });
  } catch (error) {
    console.error("Delete Campaign Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete campaign",
      error: error.message,
    });
  }
};

module.exports.getParticipants = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { page = 1, limit = 20, search = "" } = req.query;

    const campaign = await GiveawayCampaign.findById(campaignId).lean();

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Campaign not found",
      });
    }

    const participantIds = campaign.participants || [];

    if (!participantIds.length) {
      return res.status(200).json({
        success: true,
        data: [],
        pagination: { page: 1, limit, total: 0, totalPages: 0 },
      });
    }

    const profileMatchFilter = {
      userId: { $in: participantIds },
    };

    if (search) {
      profileMatchFilter.$or = [
        { nickname: { $regex: search, $options: "i" } },
        { fullName: { $regex: search, $options: "i" } },
      ];
    }

    const total = await Profile.countDocuments(profileMatchFilter);

    const skip = (Number(page) - 1) * Number(limit);

    const participants = await Profile.aggregate([
      {
        $match: profileMatchFilter,
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          _id: "$userId",
          nickname: "$nickname",
          fullName: "$fullName",
          dob: "$dob",
          age: { $ifNull: ["$age", 0] },
          gender: "$gender",
          photo: {
            $arrayElemAt: [
              {
                $filter: {
                  input: "$photos",
                  as: "p",
                  cond: { $eq: ["$$p.order", 0] },
                },
              },
              0,
            ],
          },
          city: "$location.city",
          country: "$location.country",
          phone: "$user.phone",
          email: "$user.email",
          isPremium: "$user.isPremium",
          accountStatus: "$user.accountStatus",
          isWinner: {
            $cond: {
              if: {
                $eq: ["$userId", campaign.winnerUserId],
              },
              then: true,
              else: false,
            },
          },
        },
      },
      { $skip: skip },
      { $limit: Number(limit) },
    ]);

    return res.status(200).json({
      success: true,
      campaign: {
        _id: campaign._id,
        date: campaign.date,
        drawStatus: campaign.drawStatus,
        totalParticipants: campaign.totalParticipants,
        winnerUserId: campaign.winnerUserId,
      },
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
      data: participants,
    });
  } catch (error) {
    console.error("Get participants error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch participants",
    });
  }
};

// ===============================
// 🏆 Campaign Winners API
// ===============================
module.exports.getCampaignWinners = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = (req.query.search || "").trim();
    const status = (req.query.status || "").toUpperCase();

    // ─── 1. Stats (always unfiltered, for top cards) ───
    const [statsResult] = await GiveawayCampaign.aggregate([
      {
        $facet: {
          totalCampaigns: [{ $count: "count" }],
          completed: [
            { $match: { drawStatus: "COMPLETED" } },
            { $count: "count" },
          ],
          pending: [
            { $match: { drawStatus: { $in: ["REVEALED"] } } },
            { $count: "count" },
          ],
          withWinner: [
            { $match: { winnerUserId: { $ne: null } } },
            { $count: "count" },
          ],
        },
      },
    ]);

    const stats = {
      totalCampaigns: statsResult.totalCampaigns[0]?.count || 0,
      completed: statsResult.completed[0]?.count || 0,
      pending: statsResult.pending[0]?.count || 0,
      withWinner: statsResult.withWinner[0]?.count || 0,
    };

    // ─── 2. Build aggregation pipeline (filtered) ───
    const pipeline = [];

    // Status filter
    if (status && ["PENDING", "PROCESSING", "COMPLETED"].includes(status)) {
      pipeline.push({ $match: { drawStatus: status } });
    }

    // Populate prize
    pipeline.push({
      $lookup: {
        from: "giveawayprizes",
        localField: "prizeId",
        foreignField: "_id",
        as: "prizeInfo",
      },
    });
    pipeline.push({
      $unwind: { path: "$prizeInfo", preserveNullAndEmptyArrays: true },
    });

    // Populate winner (User)
    pipeline.push({
      $lookup: {
        from: "users",
        localField: "winnerUserId",
        foreignField: "_id",
        as: "winnerInfo",
      },
    });
    pipeline.push({
      $unwind: { path: "$winnerInfo", preserveNullAndEmptyArrays: true },
    });

    // Lookup winner profile
    pipeline.push({
      $lookup: {
        from: "profiles",
        localField: "winnerInfo._id",
        foreignField: "userId",
        as: "winnerProfile",
      },
    });
    pipeline.push({
      $unwind: { path: "$winnerProfile", preserveNullAndEmptyArrays: true },
    });

    // Populate winner profile
    pipeline.push({
      $lookup: {
        from: "profiles",
        localField: "winnerUserId",
        foreignField: "userId",
        as: "winnerProfile",
      },
    });
    pipeline.push({
      $unwind: { path: "$winnerProfile", preserveNullAndEmptyArrays: true },
    });

    // Search filter (title, prize.title, winner.phone, winner.email, nickname)
    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { title: { $regex: search, $options: "i" } },
            { "prizeInfo.title": { $regex: search, $options: "i" } },
            { "winnerInfo.phone": { $regex: search, $options: "i" } },
            { "winnerInfo.email": { $regex: search, $options: "i" } },
            { "winnerProfile.nickname": { $regex: search, $options: "i" } },
          ],
        },
      });
    }

    // ─── 3. Faceted output (data + count in single query) ───
    pipeline.push({
      $facet: {
        metadata: [{ $count: "total" }],
        data: [
          { $sort: { date: -1 } },
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              _id: 1,
              title: 1,
              date: 1,
              drawStatus: 1,
              prize: {
                _id: "$prizeInfo._id",
                title: { $ifNull: ["$prizeInfo.title", "Unknown Prize"] },
                value: { $ifNull: ["$prizeInfo.value", 0] },
              },
              winner: {
                $cond: {
                  if: { $ifNull: ["$winnerInfo", false] },
                  then: {
                    _id: "$winnerInfo._id",
                    phone: { $ifNull: ["$winnerInfo.phone", null] },
                    email: { $ifNull: ["$winnerInfo.email", null] },
                  },
                  else: null,
                },
              },
            },
          },
        ],
      },
    });

    const [result] = await GiveawayCampaign.aggregate(pipeline);
    const total = result.metadata[0]?.total || 0;

    return res.status(200).json({
      success: true,
      stats,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      data: result.data,
    });
  } catch (error) {
    console.error("Get campaign winners error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch campaign winners",
    });
  }
};