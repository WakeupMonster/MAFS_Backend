const User = require("../../auth/auth.model");
const Profile = require("../../profile/profile.model");
const Report = require("../../profile/user.report");
const UserSubscription = require("../../auth/UserSubscription.model");
const SupportTicket = require("../../AppConfiguration/contactSupport/supportTicket.model");
const GiveawayWinHistory = require("../../../modules/giveaway/giveawayWinHistory.model");
const Redis = require("../../../config/cache");

// module.exports.getKpiOverview = async (req, res) => {
//   try {
//     const now = new Date();
//     const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

//     const [
//       totalUsers,
//       activeUsers24h,
//       paidUsers,
//       TotalBanUsers,
//       TotalTickets,
//       ClaimedPrize,
//       pendingVerifications,
//       openReports,
//     ] = await Promise.all([
//       User.countDocuments({ accountStatus: "active", role: "USER" }),

//       User.countDocuments({
//         lastLoginAt: { $gte: last24Hours },
//         role: "USER",
//         accountStatus: "active",
//       }),

//       UserSubscription.countDocuments({
//         isActive: true,
//         // isPremium: true,
//       }),

//       User.countDocuments({ accountStatus: "banned" }),
//       SupportTicket.countDocuments({ status: { $in: ["open"] } }),

//       GiveawayWinHistory.countDocuments({
//         deliveryStatus: "PENDING",
//         claimedAt: { $ne: null },
//       }),
//       Profile.countDocuments({ "verification.status": "pending" }),

//       Report.countDocuments({ status: { $in: ["new", "in_progress"] } }),
//     ]);

//     // ---------- 3. Response formatting for UI ----------
//     const response = {
//       kpis: {
//         totalUsers: { value: totalUsers },
//         activeUsers24h: { value: activeUsers24h },
//         paidUsers: { value: paidUsers },
//         TotalBanUsers: { value: TotalBanUsers },
//         TotalTickets: { value: TotalTickets },
//         ClaimedPrize: { value: ClaimedPrize },
//         pendingVerifications: { value: pendingVerifications, actionable: true },
//         openReports: {
//           value: openReports,
//           actionable: true,
//           severity: openReports > 10 ? "high" : "normal",
//         },
//       },
//       lastUpdatedAt: new Date(),
//     };

//     return res.json({ success: true, data: response });
//   } catch (error) {
//     console.error("Admin KPI error:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Failed to load dashboard KPIs",
//     });
//   }
// };

exports.getKpiOverview = async (req, res) => {
  try {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      activeUsers24h,
      paidUsers,
      TotalBanUsers,
      TotalTickets,
      ClaimedPrize,
      pendingVerifications,
      openReports,
    ] = await Promise.all([
      User.countDocuments({ role: "USER" }),

      User.countDocuments({
        lastLoginAt: { $gte: last24Hours },
        role: "USER",
        accountStatus: "active",
      }),

      User.countDocuments({ isPremium: true }),
      User.countDocuments({ accountStatus: "banned" }),
      SupportTicket.countDocuments({ status: { $in: ["open"] } }),

      GiveawayWinHistory.countDocuments({
        deliveryStatus: "PENDING",
        claimedAt: { $ne: null },
      }),
      Profile.countDocuments({ "verification.status": "pending" }),

      Report.countDocuments({ status: { $in: ["new", "in_progress"] } }),
    ]);

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
      },
      lastUpdatedAt: new Date(),
    };

    return res.json({ success: true, data: response });
  } catch (error) {
    console.error("Admin KPI error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load dashboard KPIs",
    });
  }
};
