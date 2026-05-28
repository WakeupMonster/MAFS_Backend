const User = require("../../auth/auth.model");
const Profile = require("../../profile/profile.model");
const Report = require("../../profile/user.report");
const Swipe = require("../../matches/swipe/swipe.model");
const Match = Swipe.Match;
const ChatMessage = require("../../matches/chat/chat.message.model");
const Transaction = require("../../subscription/models/SubscriptionTransaction");
const Product = require("../../subscription/models_v3/Product");
const SupportTicket = require("../../AppConfiguration/contactSupport/supportTicket.model");
const Block = require("../../profile/user.block");
const { formatCompactNumber } = require("../../../common/utils/formatCompactNumber");
const helpers = require("./dashboard.helpers");
const queries = require("./dashboard.queries");

exports.getAdvancedDashboardMetrics = async (req, res) => {
  try {
    const now = new Date();
    const dateParams = helpers.parseDateRange(req.query, now);
    const { startDate, endDate, prevStartDate, prevEndDate, preset, periodLabel, contextLabel } = dateParams;

    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Calculate dynamic ghosting threshold based on the parsed preset.
    // By default, we show the last 2 months of ghosted users (including today and yesterday presets).
    // If the admin explicitly selected last7, last30, last90, or a custom date range, we calculate it dynamically.
    let ghostingThresholdDate;
    if (preset === "last7") {
      ghostingThresholdDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (preset === "last30") {
      ghostingThresholdDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (preset === "last90") {
      ghostingThresholdDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    } else if (preset === "custom" && startDate) {
      // For custom date ranges, use the start date of the period as the threshold
      ghostingThresholdDate = new Date(startDate);
    } else {
      // Default fallback (including "today" and "yesterday" presets): 2 months inactivity
      ghostingThresholdDate = new Date(now);
      ghostingThresholdDate.setMonth(ghostingThresholdDate.getMonth() - 2);
    }

    const dayNamesShort = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    const allProducts = await Product.find().lean();
    const { boostKeys, superkeenKeys } = queries.getProductKeys(allProducts);

    const {
      userCountsFacet, profileCountsFacet, totalMatchesCount, reportsFacet,
      deepConvoAggCount, ghostedUsersCount, swipesFacet, matchesFacet,
      matches7dDaily, swipes7dDaily, heatmapAgg, revenueFacet, signupGenderFacet,
      funnelCompletedProfiles, funnelSwipersCount,
      funnelSubscribersCount, highReportedRange, blocksRange
    } = await queries.fetchDashboardData(
      { User, Profile, Match, Swipe, ChatMessage, Transaction, Report, Block },
      { startDate, endDate, prevStartDate, prevEndDate, startOfYear, last30d, ghostingThresholdDate }
    );

    const totalUsers = userCountsFacet?.total?.[0]?.n || 0;
    const pendingKYC = profileCountsFacet?.pending?.[0]?.n || 0;
    const photoImpactAgg = profileCountsFacet?.quality?.[0] || { total: 0, good: 0 };

    const activeAllTime = userCountsFacet?.activeAllTime?.[0]?.n || 0;
    const deactivatedAllTime = userCountsFacet?.deactivated?.[0]?.n || 0;
    const deletedAllTime = userCountsFacet?.deleted?.[0]?.n || 0;
    const suspendedAllTime = userCountsFacet?.suspended?.[0]?.n || 0;
    const bannedAllTime = userCountsFacet?.banned?.[0]?.n || 0;

    const reportCountNew = reportsFacet?.current?.[0]?.n || 0;
    const reportCountPrev = reportsFacet?.prev?.[0]?.n || 0;
    const rawReportTrend = reportCountPrev > 0 ? ((reportCountNew - reportCountPrev) / reportCountPrev) * 100 : (reportCountNew > 0 ? 100 : 0);
    const reportTrendNum = Math.max(-100, rawReportTrend);
    const reportTrendDisplay = `${reportTrendNum >= 0 ? "+" : ""}${reportTrendNum.toFixed(1)}%`;

    const likesRange = swipesFacet?.currentLikes?.[0]?.n || 0;
    const superlikesRange = swipesFacet?.currentSuperlikes?.[0]?.n || 0;
    const swipesPrev = swipesFacet?.prev?.[0]?.n || 0;
    const superkeenSwipes = swipesFacet?.superkeenSwipes?.[0]?.n || 0;
    const normalSwipes = swipesFacet?.normalSwipes?.[0]?.n || 0;

    const matchesRange = matchesFacet?.current?.[0]?.n || 0;
    const matchesPrev = matchesFacet?.prev?.[0]?.n || 0;
    const superkeenMatches = matchesFacet?.superkeenMatches?.[0]?.n || 0;
    const normalMatches = matchesFacet?.normalMatches?.[0]?.n || 0;

    const revenueRangeAgg = revenueFacet?.current || [];
    const revenuePrevAgg = revenueFacet?.prev || [];

    const signups7dDaily = signupGenderFacet?.rangeByDay || [];
    const signupsRangeGender = signupGenderFacet?.rangeTotal || [];
    const signupsPrevGender = signupGenderFacet?.prevTotal || [];
    const totalGenderAgg = signupGenderFacet?.allTimeTotal || [];

    const revR = helpers.processRevenue(revenueRangeAgg, boostKeys, superkeenKeys);
    const revPrev = helpers.processRevenue(revenuePrevAgg, boostKeys, superkeenKeys);

    const rawRevTrend = revPrev.total > 0 ? ((revR.total - revPrev.total) / revPrev.total) * 100 : (revR.total > 0 ? 100 : 0);
    const revTrendNum = Math.max(-100, rawRevTrend);
    const revTrendDisplay = `${revTrendNum >= 0 ? "+" : ""}${revTrendNum.toFixed(1)}%`;

    const consumablePct = revR.total > 0 ? Math.round(((revR.boost + revR.superkeen) / revR.total) * 100) : 0;
    const subPct = revR.total > 0 ? Math.round((revR.subscription / revR.total) * 100) : 0;

    const fRS = signupsRangeGender.find((g) => g._id === "women")?.count || 0;
    const fPS = signupsPrevGender.find((g) => g._id === "women")?.count || 0;
    const rawFCPNum = fPS > 0 ? ((fRS - fPS) / fPS) * 100 : (fRS > 0 ? 100 : 0);
    const fCPNum = Math.max(-100, rawFCPNum);
    const fSignupTrend = `${fCPNum >= 0 ? "+" : ""}${fCPNum.toFixed(1)}%`;

    const mRS = signupsRangeGender.find((g) => g._id === "men")?.count || 0;
    const aRS = mRS + fRS || 1;
    const mRatioRange = Math.round((mRS / aRS) * 100);
    const fRatioRange = 100 - mRatioRange;

    const gMT = totalGenderAgg.find((g) => g._id === "men")?.count || 0;
    const gFT = totalGenderAgg.find((g) => g._id === "women")?.count || 0;
    const gAT = gMT + gFT || 1;
    const mRatioTotal = Math.round((gMT / gAT) * 100);
    const fRatioTotal = 100 - mRatioTotal;

    const totalSwipesRange = likesRange + superlikesRange;
    const matchLiqVal = totalSwipesRange > 0 ? ((matchesRange / totalSwipesRange) * 100).toFixed(1) : "0.0";
    const matchLiqPrev = swipesPrev > 0 ? (matchesPrev / swipesPrev) * 100 : 0;
    const matchLiqCur = totalSwipesRange > 0 ? (matchesRange / totalSwipesRange) * 100 : 0;
    const rawMatchLiqTrend = matchLiqPrev > 0 ? ((matchLiqCur - matchLiqPrev) / matchLiqPrev) * 100 : (matchLiqCur > 0 ? 100 : 0);
    const matchLiqTrendVal = Math.max(-100, rawMatchLiqTrend);
    const matchLiqTrend = matchLiqTrendVal.toFixed(1);

    const chartDates = helpers.buildChartDates(startDate, endDate, preset);
    const liqChart = chartDates.map((d) => {
      const m = matches7dDaily.find((x) => x._id === d)?.count || 0;
      const s = swipes7dDaily.find((x) => x._id === d)?.count || 0;
      return s > 0 ? parseFloat(((m / s) * 100).toFixed(1)) : 0.0;
    });

    const heatmapD = helpers.buildHeatmapData(heatmapAgg);
    const rangeSignups = mRS + fRS;

    return res.status(200).json({
      success: true,
      meta: { dateRange: { from: startDate.toISOString(), to: endDate.toISOString() }, preset, periodLabel, contextLabel },
      data: {
        zoneA: {
          title: preset === "custom" ? "Period at a glance" : `${periodLabel} at a glance`,
          stats: [
            { label: "Revenue", value: helpers.formatAmount(revR.total), sub: contextLabel, trend: revTrendDisplay, isPositive: (revTrendNum || 0) >= 0, icon: "Sparkles", color: "emerald", route: "/admin/management/subscription-management" },
            { label: "Supercharge driving", value: `${consumablePct}%`, sub: "of revenue", trend: `${consumablePct}%`, isPositive: true, icon: "TrendingUp", color: "blue" },
            { label: "Female signups", value: `${fRS}`, sub: contextLabel, trend: fSignupTrend, isPositive: (fCPNum || 0) >= 0, icon: "Users", color: "orange", route: "/admin/management/users-management" },
            { label: "KYC pending", value: `${pendingKYC}`, sub: "Review now →", isPositive: false, icon: "ShieldAlert", color: "cyan", isActionable: true, route: "/admin/management/kyc-verifications" },
            { label: "Users flagged", value: `${reportCountNew}`, sub: "Review now →", trend: reportTrendDisplay, isPositive: (reportTrendNum || 0) >= 0, icon: "Flag", color: "sky", isActionable: true, route: "/admin/management/profile-reports" },
          ],
        },
        zoneB: {
          alerts: [
            { id: "kyc", label: "KYC Verification", value: `${pendingKYC} ${pendingKYC === 1 ? "profile waiting" : "profiles waiting"} for approval`, sub: "Review to activate new users", badge: pendingKYC > 10 ? "High" : "Low", badgeColor: "red", icon: "ShieldCheck", route: "/admin/management/kyc-verifications" },
            {
              id: "reported",
              label: "High Reported Users",
              value: (() => {
                const pText = preset === "today" ? "today" : preset === "yesterday" ? "yesterday" : preset === "last7" ? "in the last 7 days" : preset === "last30" ? "in the last 30 days" : preset === "last90" ? "in the last 90 days" : "in this period";
                return `${highReportedRange.length} ${highReportedRange.length === 1 ? "user with 5+ reports" : "users with 5+ reports"} ${pText}`;
              })(),
              sub: "Investigate and take action", badge: highReportedRange.length > 5 ? "Critical" : "Medium", badgeColor: "orange", icon: "AlertTriangle", route: "/admin/management/profile-reports",
            },
            {
              id: "ghosting",
              label: "Ghosted Users",
              value: (() => {
                const countStr = formatCompactNumber(ghostedUsersCount);
                const verb = ghostedUsersCount === 1 ? "user has" : "users have";
                // Determine description period suffix based on selected preset
                const periodText =
                  preset === "last7" ? "in the last 7 days" :
                    preset === "last30" ? "in the last 30 days" :
                      preset === "last90" ? "in the last 90 days" :
                        preset === "custom" ? "in this period" :
                          "in the last 2 months";
                return `${countStr} ${verb} ghosted ${periodText}`;
              })(),
              sub: `${formatCompactNumber(ghostedUsersCount)} out of ${formatCompactNumber(totalUsers)} total users have no login activity.`,
              badge: "Ghosted", badgeColor: "blue", icon: "Activity", route: "/admin/management/users-management",
            },
          ],
        },
        zoneC: {
          metrics: [
            { label: "Match Liquidity", value: `${matchLiqVal}%`, sub: `${matchesRange} matches / ${totalSwipesRange} swipes`, subtitle: `Match rate for ${periodLabel.toLowerCase()}`, trend: `${matchLiqTrendVal >= 0 ? "+" : ""}${matchLiqTrend}%`, isPositive: parseFloat(matchLiqTrend) >= 0, chartData: liqChart },
            { label: "Gender Ratio", value: `${mRatioRange} : ${fRatioRange}`, subtitle: `Distribution of male vs female signups for ${periodLabel.toLowerCase()}`, sub: "Male : Female", isRatio: true, ratioValue: mRatioRange, maleCount: mRS, femaleCount: fRS },
          ],
        },
        revenueBreakdown: {
          subtitle: `${periodLabel} revenue by source`,
          total: helpers.formatAmount(revR.total),
          insight: revR.subscription >= revR.boost + revR.superkeen ? `Subscriptions contribute ${subPct}% of revenue.` : `${consumablePct}% of revenue comes from consumables.`,
          categories: [
            { label: "Subscriptions", value: revR.subscription, displayValue: helpers.formatAmount(revR.subscription), percentage: subPct, color: "hsl(182 59% 75%)" },
            { label: "Super Charge", value: revR.boost, displayValue: helpers.formatAmount(revR.boost), percentage: revR.total > 0 ? Math.round((revR.boost / revR.total) * 100) : 0, color: "hsl(182 59% 54%)" },
            { label: "Superkeen", value: revR.superkeen, displayValue: helpers.formatAmount(revR.superkeen), percentage: revR.total > 0 ? Math.round((revR.superkeen / revR.total) * 100) : 0, color: "hsl(182 59% 35%)" },
          ],
        },
        conversionFunnel: {
          subtitle: "Where users drop off",
          insight: "Conversion funnel tracks user journey from install to sub.",
          stages: [
            { label: "App Installs", value: Math.round(rangeSignups * 1.2), dropOff: 0, color: "hsl(182 100% 88%)" },
            { label: "Signups", value: rangeSignups, dropOff: Math.round(rangeSignups * 1.2) > 0 ? Math.max(-100, Math.min(100, -Math.round((1 - rangeSignups / Math.round(rangeSignups * 1.2)) * 100))) : 0, color: "hsl(182 85% 78%)" },
            { label: "Profile Complete", value: funnelCompletedProfiles, dropOff: rangeSignups > 0 ? Math.max(-100, Math.min(100, -Math.round((1 - funnelCompletedProfiles / rangeSignups) * 100))) : 0, color: "hsl(182 70% 68%)" },
            { label: "First Swipe", value: funnelSwipersCount, dropOff: funnelCompletedProfiles > 0 ? Math.max(-100, Math.min(100, -Math.round((1 - funnelSwipersCount / funnelCompletedProfiles) * 100))) : 0, color: "hsl(182 60% 54%)" },
            { label: "Subscribed", value: funnelSubscribersCount, dropOff: funnelSwipersCount > 0 ? Math.max(-100, Math.min(100, -Math.round((1 - funnelSubscribersCount / funnelSwipersCount) * 100))) : 0, color: "hsl(182 60% 45%)" },
          ],
        },
        performanceInsights: {
          subtitle: "What's working, what needs focus",
          insight: "Supercharge and 4+ photo users drive the best results.",
          metrics: [
            { label: "Supercharge ROI", value: consumablePct > 0 ? `${(consumablePct / 20).toFixed(1)}x` : "0x", percentage: consumablePct, color: "hsl(182 59% 54%)" },
            { label: "Super Keen rate", value: superkeenSwipes > 0 ? `${((superkeenMatches / superkeenSwipes) * 100).toFixed(0)}%` : "0%", percentage: superkeenSwipes > 0 ? Math.round((superkeenMatches / superkeenSwipes) * 100) : 0, color: "hsl(182 59% 65%)" },
            { label: "Normal match rate", value: normalSwipes > 0 ? `${((normalMatches / normalSwipes) * 100).toFixed(0)}%` : "0%", percentage: normalSwipes > 0 ? Math.round((normalMatches / normalSwipes) * 100) : 0, color: "hsl(215 20% 65%)" },
            { label: "4+ photo users", value: `${photoImpactAgg.total > 0 ? Math.round((photoImpactAgg.good / photoImpactAgg.total) * 100) : 0}%`, percentage: photoImpactAgg.total > 0 ? Math.round((photoImpactAgg.good / photoImpactAgg.total) * 100) : 0, color: "hsl(182 59% 54%)" },
            { label: "Deep connections", value: `${((deepConvoAggCount / (totalMatchesCount || 1)) * 100).toFixed(0)}%`, percentage: Math.round((deepConvoAggCount / (totalMatchesCount || 1)) * 100), color: "hsl(182 59% 65%)" },
          ],
        },
        activityHeatmap: {
          subtitle: "Yearly User Activity", insight: `Activity trends for ${now.getFullYear()} calendar year`,
          days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
          times: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
          data: heatmapD,
        },
        genderGrowth: (() => {
          let subtitle = `Daily signups for ${periodLabel}`;
          let data = [];
          if (preset === "last30" || preset === "last90" || chartDates.length > 30) {
            subtitle = `Weekly signups for ${periodLabel}`;
            const weeks = [];
            for (let i = 0; i < chartDates.length; i += 7) {
              const weekSlice = chartDates.slice(i, i + 7);
              const m = weekSlice.reduce((sum, date) => sum + (signups7dDaily.find((s) => s._id.date === date && s._id.gender === "men")?.count || 0), 0);
              const f = weekSlice.reduce((sum, date) => sum + (signups7dDaily.find((s) => s._id.date === date && s._id.gender === "women")?.count || 0), 0);
              weeks.push({ day: `Week ${Math.floor(i / 7) + 1}`, male: m, female: f });
            }
            data = weeks;
          } else {
            data = chartDates.map((date) => {
              const d = new Date(date);
              return {
                day: dayNamesShort[d.getDay()], fullDate: date,
                male: signups7dDaily.find((s) => s._id.date === date && s._id.gender === "men")?.count || 0,
                female: signups7dDaily.find((s) => s._id.date === date && s._id.gender === "women")?.count || 0,
              };
            });
          }
          return { subtitle, insight: `Male signups are dominant at ${mRatioTotal}%`, data };
        })(),
        userDistribution: {
          active: activeAllTime,
          deactivated: deactivatedAllTime,
          deleted: deletedAllTime,
          suspended: suspendedAllTime,
          banned: bannedAllTime,
        },
      },
    });
  } catch (err) {
    console.error("Dashboard Error:", err);
    return res.status(500).json({ success: false, message: "Internal server error", error: err.message });
  }
};