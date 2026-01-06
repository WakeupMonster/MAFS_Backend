// controllers/admin/admin.kpi.controller.js

const User = require("../auth/auth.model");
const Profile = require("../profile/profile.model");
const Report = require("../profile/user.report");
const UserSubscription = require("../auth/UserSubscription.model");

exports.getKpiOverview = async (req, res) => {
  try {
    // ---------- 1. Time calculations ----------
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // ---------- 2. Parallel DB queries ----------
    const [
      totalUsers,
      activeUsers24h,
      paidUsers,
      pendingVerifications,
      openReports
    ] = await Promise.all([
      User.countDocuments({
  accountStatus: "active",
  role: "USER"
}),

      User.countDocuments({
        lastLoginAt: { $gte: last24Hours },
        isDeleted: false
      }),

      UserSubscription.countDocuments({
        isActive: true
      }),

      Profile.countDocuments({
        "verification.status": "pending"
      }),

      Report.countDocuments({
        status: { $in: ["new", "in_progress"] }
      })
    ]);

    // ---------- 3. Response formatting for UI ----------
    const response = {
      kpis: {
        totalUsers: {
          value: totalUsers
        },
        activeUsers24h: {
          value: activeUsers24h
        },
        paidUsers: {
          value: paidUsers
        },
        pendingVerifications: {
          value: pendingVerifications,
          actionable: true
        },
        openReports: {
          value: openReports,
          actionable: true,
          severity: openReports > 10 ? "high" : "normal"
        }
      },
      lastUpdatedAt: new Date()
    };

    return res.json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error("Admin KPI error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load dashboard KPIs"
    });
  }
};
