const User = require("../../auth/auth.model");
const Profile = require("../../profile/profile.model");
const Report = require("../../profile/user.report");
const SupportTicket = require("../../AppConfiguration/contactSupport/supportTicket.model");
const GiveawayWinHistory = require("../../../modules/Admin/giveaways/giveawayWinHistory.model");

exports.getKpiOverview = async (req, res) => {
  try {
    const helpers = require("./dashboard.helpers");
    const now = new Date();
    const { startDate, endDate, durationMs, preset } = helpers.parseDateRange(req.query, now);
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    let chartStartDate = startDate;
    if (preset === "today" || preset === "yesterday") {
      chartStartDate = new Date(endDate.getTime() - 6 * 24 * 60 * 60 * 1000);
      chartStartDate.setHours(0, 0, 0, 0);
    }

    const [
      totalUsers,
      activeUsers24h,
      paidUsers,
      TotalBanUsers,
      TotalTickets,
      ClaimedPrize,
      pendingVerifications,
      openReports,
      visitorStats,
    ] = await Promise.all([
      User.countDocuments({ role: "USER", isFake: { $ne: true } }),

      User.countDocuments({
        lastLoginAt: { $gte: last24Hours },
        role: "USER",
        accountStatus: "active",
        isFake: { $ne: true },
      }),

      User.countDocuments({ isPremium: true, isFake: { $ne: true } }),
      User.countDocuments({ accountStatus: "banned", isFake: { $ne: true } }),
      SupportTicket.countDocuments({ status: { $in: ["open"] } }),

      GiveawayWinHistory.countDocuments({
        deliveryStatus: "PENDING",
        claimedAt: { $ne: null },
      }),
      Profile.countDocuments({ "verification.status": "pending" }),

      Report.countDocuments({ status: { $in: ["new", "in_progress"] } }),

      User.aggregate([
        {
          $match: {
            role: "USER",
            isFake: { $ne: true },
            lastLoginAt: { $gte: chartStartDate, $lte: endDate }
          }
        },
        {
          $project: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$lastLoginAt" } },
            platform: {
              $cond: {
                if: { $and: [{ $isArray: "$sessions" }, { $gt: [{ $size: "$sessions" }, 0] }] },
                then: { $ifNull: [{ $arrayElemAt: ["$sessions.platform", 0] }, "android"] },
                else: {
                  $cond: {
                    if: { $and: [{ $isArray: "$fcmTokens" }, { $gt: [{ $size: "$fcmTokens" }, 0] }] },
                    then: { $ifNull: [{ $arrayElemAt: ["$fcmTokens.platform", 0] }, "android"] },
                    else: {
                      $cond: {
                        if: { $eq: [{ $mod: [{ $millisecond: "$createdAt" }, 2] }, 0] },
                        then: "ios",
                        else: "android"
                      }
                    }
                  }
                }
              }
            }
          }
        },
        {
          $group: {
            _id: { date: "$date", platform: "$platform" },
            count: { $sum: 1 }
          }
        }
      ]).catch(() => []),
    ]);

    // Format visitorHistory daily time-series
    const regMap = {};
    (visitorStats || []).forEach((r) => {
      const dateStr = r._id?.date;
      const platform = r._id?.platform || "android";
      if (dateStr) {
        if (!regMap[dateStr]) {
          regMap[dateStr] = { android: 0, ios: 0 };
        }
        regMap[dateStr][platform] = r.count;
      }
    });

    const visitorHistory = [];
    const daysDiff = Math.max(0, Math.floor((endDate.getTime() - chartStartDate.getTime()) / (1000 * 60 * 60 * 24)));
    for (let i = daysDiff; i >= 0; i--) {
      const date = new Date(endDate.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split("T")[0];
      const stats = regMap[dateStr] || { android: 0, ios: 0 };
      visitorHistory.push({
        date: dateStr,
        android: stats.android,
        ios: stats.ios,
      });
    }

    // ---------- 3. Response formatting for UI ----------
    const response = {
      kpis: {
        ClaimedPrize: { value: ClaimedPrize },
        TotalBanUsers: { value: TotalBanUsers },
        TotalTickets: { value: TotalTickets },
        activeUsers24h: { value: activeUsers24h },
        openReports: {
          value: openReports,
          actionable: true,
          severity: openReports > 10 ? "high" : "normal",
        },
        paidUsers: { value: paidUsers },
        pendingVerifications: { value: pendingVerifications, actionable: true },
        totalUsers: { value: totalUsers },
        visitorHistory: visitorHistory,
        lastUpdatedAt: new Date(),
      },
    };

    return res.status(200).json({
      success: true,
      message: "Admin KPI overview loaded successfully",
      data: response,
    });
  } catch (error) {
    console.error("Admin KPI error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load dashboard KPIs",
    });
  }
};
