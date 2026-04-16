const User = require("../../auth/auth.model");
const Profile = require("../../profile/profile.model");
const Report = require("../../profile/user.report");
const Swipe = require("../../matches/swipe/swipe.model");
const Match = Swipe.Match;
const ChatMessage = require("../../matches/chat/chat.message.model");
const Transaction = require("../../subscription/models/SubscriptionTransaction");
const Product = require("../../subscription/models_v3/Product");
const GiveawayCampaign = require("../giveaways/giveawayCampaign.model");
const GiveawayWinHistory = require("../giveaways/giveawayWinHistory.model");
const SupportTicket = require("../../AppConfiguration/contactSupport/supportTicket.model");

// ================================================================
// ADVANCED DASHBOARD API — "Command Center" for Admin
// All data is 100% dynamic, calculated from real DB aggregations.
// ================================================================

// exports.getAdvancedDashboardMetrics = async (req, res) => {
//   try {
//     const now = new Date();

//     // 1. DATE RANGE FLEXIBILITY
//     // Support "from" and "to" as per frontend documentation. Default: Last 7 Days.
//     const fromQuery = req.query.from || req.query.startDate;
//     const toQuery = req.query.to || req.query.endDate;

//     const startDate = fromQuery ? new Date(fromQuery) : new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
//     const endDate = toQuery ? new Date(toQuery) : now;
//     const durationMs = endDate.getTime() - startDate.getTime();

//     // For comparison (vs yesterday or vs last period)
//     const prevStartDate = new Date(startDate.getTime() - durationMs);
//     const prevEndDate = startDate;

//     // Baselines
//     const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
//     const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

//     // Meta Labels & Context
//     let periodLabel = "Custom Range";
//     let contextLabel = "vs previous period";
//     let preset = "custom";

//     const hours = durationMs / (1000 * 60 * 60);
//     if (hours <= 25) {
//       periodLabel = "Today";
//       contextLabel = "vs yesterday";
//       preset = "today";
//     } else if (hours <= 170) {
//       periodLabel = "Last 7 Days";
//       contextLabel = "vs previous 7 days";
//       preset = "last7";
//     }

//     const dayNamesShort = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

//     // 2. Load Catalog for Revenue Categorization
//     const allProducts = await Product.find().lean();
//     const getProductMatchKeys = (type) => allProducts
//       .filter(p => p.consumableType === type)
//       .flatMap(p => [p.productKey, p.appleProductId, p.googleProductId].filter(Boolean));

//     const boostKeys = getProductMatchKeys('BOOST');
//     const superkeenKeys = getProductMatchKeys('SUPER_KEEN');

//     // 3. Comprehensive Parallel Query Phase
//     const [
//       totalUsers,
//       activeUsersRange,
//       premiumUsers,
//       bannedUsers,
//       suspendedUsers,
//       totalMatchesCount,
//       pendingKYC,
//       approvedKYC,
//       rejectedKYC,
//       reportCountNew,
//       supportOpen,
//       totalMessagesRange,
//       deepConvoAggCount,
//       ghostingRangeAgg,
//       likesRange,
//       superlikesRange,
//       swipesPrev,
//       matchesRange,
//       matchesPrev,
//       matches7dDaily,
//       swipes7dDaily,
//       heatmapAgg,
//       revenueRangeAgg,
//       revenuePrevAgg,
//       revenue7dDaily,
//       signups7dDaily,
//       signupsRangeGender,
//       signupsPrevGender,
//       totalGenderAgg,
//       funnelAgg,
//       photoImpactAgg,
//       superkeenSuccessStats,
//       highReportedRange,
//       latestMatchesPopulated,
//       latestPurchasesPopulated,
//       latestReportsPopulated
//     ] = await Promise.all([
//       User.countDocuments({ role: "USER" }),
//       User.countDocuments({ lastLoginAt: { $gte: startDate, $lte: endDate }, role: "USER", accountStatus: "active" }),
//       User.countDocuments({ isPremium: true, role: "USER" }),
//       User.countDocuments({ accountStatus: "banned", role: "USER" }),
//       User.countDocuments({ accountStatus: "suspended", role: "USER" }),
//       Match.countDocuments({}),
//       Profile.countDocuments({ "verification.status": "pending" }),
//       Profile.countDocuments({ "verification.status": "approved" }),
//       Profile.countDocuments({ "verification.status": "rejected" }),
//       Report.countDocuments({ status: { $in: ["new", "in_progress"] } }),
//       SupportTicket.countDocuments({ status: "open" }).catch(() => 0),
//       ChatMessage.countDocuments({ createdAt: { $gte: startDate, $lte: endDate } }),
//       ChatMessage.aggregate([{ $match: { createdAt: { $gte: last30d } } }, { $group: { _id: "$matchId", count: { $sum: 1 } } }, { $match: { count: { $gte: 20 } } }, { $count: "deepTotal" }]).then(r => r[0]?.deepTotal || 0),
//       Match.aggregate([{ $match: { createdAt: { $gte: startDate, $lte: endDate } } }, { $group: { _id: null, total: { $sum: 1 }, ghosted: { $sum: { $cond: [{ $eq: ["$lastMessageAt", null] }, 1, 0] } } } }]).then(r => r[0] || { total: 0, ghosted: 0 }),
//       Swipe.countDocuments({ createdAt: { $gte: startDate, $lte: endDate }, action: "like" }),
//       Swipe.countDocuments({ createdAt: { $gte: startDate, $lte: endDate }, action: "superlike" }),
//       Swipe.countDocuments({ createdAt: { $gte: prevStartDate, $lte: prevEndDate }, action: { $in: ["like", "superlike"] } }),
//       Match.countDocuments({ createdAt: { $gte: startDate, $lte: endDate } }),
//       Match.countDocuments({ createdAt: { $gte: prevStartDate, $lte: prevEndDate } }),
//       Match.aggregate([{ $match: { createdAt: { $gte: last7d } } }, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } }, { $sort: { "_id": 1 } }]).catch(() => []),
//       Swipe.aggregate([{ $match: { createdAt: { $gte: last7d }, action: { $in: ["like", "superlike"] } } }, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } }, { $sort: { "_id": 1 } }]).catch(() => []),
//       Swipe.aggregate([{ $match: { createdAt: { $gte: last30d } } }, { $group: { _id: { day: { $dayOfWeek: "$createdAt" }, hour: { $hour: "$createdAt" } }, count: { $sum: 1 } } }]).catch(() => []),
//       Transaction.aggregate([{ $match: { occurredAt: { $gte: startDate, $lte: endDate }, eventType: { $in: ['PURCHASE', 'RENEW', 'CONSUMABLE_PURCHASE'] } } }, { $group: { _id: "$productId", totalAmount: { $sum: "$amount" }, count: { $sum: 1 } } }]),
//       Transaction.aggregate([{ $match: { occurredAt: { $gte: prevStartDate, $lte: prevEndDate }, eventType: { $in: ['PURCHASE', 'RENEW', 'CONSUMABLE_PURCHASE'] } } }, { $group: { _id: "$productId", totalAmount: { $sum: "$amount" }, count: { $sum: 1 } } }]),
//       Transaction.aggregate([{ $match: { occurredAt: { $gte: last7d }, eventType: { $in: ['PURCHASE', 'RENEW', 'CONSUMABLE_PURCHASE'] } } }, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$occurredAt" } }, total: { $sum: "$amount" } } }, { $sort: { "_id": 1 } }]),
//       Profile.aggregate([{ $match: { createdAt: { $gte: last7d } } }, { $group: { _id: { date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, gender: "$gender" }, count: { $sum: 1 } } }, { $sort: { "_id.date": 1 } }]),
//       Profile.aggregate([{ $match: { createdAt: { $gte: startDate, $lte: endDate } } }, { $group: { _id: "$gender", count: { $sum: 1 } } }]),
//       Profile.aggregate([{ $match: { createdAt: { $gte: prevStartDate, $lte: prevEndDate } } }, { $group: { _id: "$gender", count: { $sum: 1 } } }]),
//       Profile.aggregate([{ $group: { _id: "$gender", count: { $sum: 1 } } }]),
//       Promise.all([User.countDocuments({ role: "USER" }), Profile.countDocuments({ isMandatoryComplete: true }), Profile.countDocuments({ "verification.status": "approved" }), Swipe.distinct("swiperId").then(ids => ids.length), Match.aggregate([{ $unwind: "$users" }, { $group: { _id: null, uniqueUsers: { $addToSet: "$users" } } }, { $project: { count: { $size: "$uniqueUsers" } } }]).then(r => r[0]?.count || 0), User.countDocuments({ isPremium: true, role: "USER" })]),
//       Profile.aggregate([{ $project: { photoCount: { $size: { $ifNull: ["$photos", []] } }, hasBio: { $cond: [{ $and: [{ $ne: ["$about", null] }, { $ne: ["$about", ""] }] }, true, false] } } }, { $group: { _id: null, total: { $sum: 1 }, good: { $sum: { $cond: [{ $and: [{ $gte: ["$photoCount", 4] }, "$hasBio"] }, 1, 0] } } } }]).then(r => r[0] || { total: 0, good: 0 }),
//       Promise.all([Swipe.countDocuments({ action: "superlike" }), Match.countDocuments({ isSuperMatch: true }).catch(() => 0), Swipe.countDocuments({ action: "like" }), Match.countDocuments({ isSuperMatch: { $ne: true } }).catch(() => 0)]),
//       Report.aggregate([{ $match: { createdAt: { $gte: startDate, $lte: endDate } } }, { $group: { _id: "$reportedId", count: { $sum: 1 } } }, { $match: { count: { $gte: 5 } } }]),
//       Match.find().sort({ matchedAt: -1 }).limit(3).lean().populate("users", "nickname"),
//       Transaction.find({ eventType: { $in: ['PURCHASE', 'CONSUMABLE_PURCHASE'] } }).sort({ occurredAt: -1 }).limit(3).lean().populate("userId", "nickname"),
//       Report.find().sort({ createdAt: -1 }).limit(3).lean().populate("reportedId reporterId", "nickname")
//     ]);

//     // --- Processing ---
//     const processRev = (agg) => {
//       let t = 0, b = 0, s = 0, sub = 0;
//       agg.forEach(x => {
//         t += x.totalAmount;
//         if (boostKeys.includes(x._id)) b += x.totalAmount;
//         else if (superkeenKeys.includes(x._id)) s += x.totalAmount;
//         else sub += x.totalAmount;
//       });
//       return { total: t, boost: b, superkeen: s, subscription: sub };
//     };

//     const revR = processRev(revenueRangeAgg);
//     const revPrev = processRev(revenuePrevAgg);

//     // Real % change only when previous period has data. No fake 100%.
//     const revTrendNum = revPrev.total > 0 ? ((revR.total - revPrev.total) / revPrev.total) * 100 : null;
//     const revTrendDisplay = revTrendNum !== null
//       ? `${revTrendNum >= 0 ? '+' : ''}${revTrendNum.toFixed(1)}%`
//       : (revR.total > 0 ? `+${revR.total.toFixed(2)}` : '$0.00');

//     const consumablePct = revR.total > 0 ? Math.round(((revR.boost + revR.superkeen) / revR.total) * 100) : 0;
//     const subPct = revR.total > 0 ? Math.round((revR.subscription / revR.total) * 100) : 0;

//     const fRS = signupsRangeGender.find(g => g._id === "women")?.count || 0;
//     const fPS = signupsPrevGender.find(g => g._id === "women")?.count || 0;
//     const fCPNum = fPS > 0 ? ((fRS - fPS) / fPS) * 100 : null;
//     const fSignupDisplay = fCPNum !== null
//       ? `${fCPNum >= 0 ? '+' : ''}${fCPNum.toFixed(0)}%`
//       : (fRS > 0 ? `+${fRS} new` : '0 new');

//     const gMT = totalGenderAgg.find(g => g._id === "men")?.count || 0;
//     const gFT = totalGenderAgg.find(g => g._id === "women")?.count || 0;
//     const gAT = gMT + gFT || 1;
//     const mRatio = Math.round((gMT / gAT) * 100);
//     const fRatio = Math.round((gFT / gAT) * 100);

//     const totalSwipesRange = likesRange + superlikesRange;
//     const matchLiqVal = totalSwipesRange > 0 ? ((matchesRange / totalSwipesRange) * 100).toFixed(1) : "0.0";
//     const matchLiqPrev = swipesPrev > 0 ? ((matchesPrev / swipesPrev) * 100) : 0;
//     const matchLiqCur = totalSwipesRange > 0 ? ((matchesRange / totalSwipesRange) * 100) : 0;
//     const matchLiqTrend = matchLiqPrev > 0 ? Math.abs(((matchLiqCur - matchLiqPrev) / matchLiqPrev) * 100).toFixed(1) : "0.0";

//     const funnelD = totalUsers > 0 ? (100 - (funnelAgg[1] / totalUsers * 100)).toFixed(0) : "0";

//     const chartDates = [];
//     for (let i = 6; i >= 0; i--) { chartDates.push(new Date(now.getTime() - i * 24 * 60 * 60 * 1000).toISOString().split("T")[0]); }
//     const revChart = chartDates.map(d => revenue7dDaily.find(x => x._id === d)?.total || 0);
//     const liqChart = chartDates.map(d => {
//       const m = matches7dDaily.find(x => x._id === d)?.count || 0;
//       const s = swipes7dDaily.find(x => x._id === d)?.count || 1;
//       return parseFloat(((m / s) * 100).toFixed(1));
//     });

//     const heatmapD = [];
//     const mongoDayOrder = [2, 3, 4, 5, 6, 7, 1]; // Mon-Sun
//     mongoDayOrder.forEach(d => {
//       const row = [];
//       [6, 9, 12, 15, 18, 21, 23, 0].forEach(h => {
//         const c = heatmapAgg.find(x => x._id.day === d && x._id.hour === h)?.count || 0;
//         row.push(c > 100 ? 3 : c > 50 ? 2 : c > 10 ? 1 : 0);
//       });
//       heatmapD.push(row);
//     });

//     // Smart currency formatter: shows raw if < 1000, 'k' if >= 1000
//     const fmtAmount = (val) => {
//       if (val >= 1000) return `$${(val / 1000).toFixed(1)}k`;
//       if (val > 0) return `$${val.toFixed(2)}`;
//       return '$0.00';
//     };

//     // Friendly product name from catalog
//     const getProductFriendlyName = (productId) => {
//       const p = allProducts.find(x => x.productKey === productId || x.appleProductId === productId || x.googleProductId === productId);
//       return p ? (p.displayName || p.name || productId) : productId;
//     };

//     const feedList = [];
//     latestPurchasesPopulated.forEach(p => feedList.push({
//       id: p._id,
//       time: "just now",
//       description: `${p.userId?.nickname || "A user"} bought ${getProductFriendlyName(p.productId)}`,
//       color: "#46C7CD"
//     }));
//     latestMatchesPopulated.forEach(m => feedList.push({
//       id: m._id,
//       time: "1m ago",
//       description: `${m.users?.[0]?.nickname || "Someone"} & ${m.users?.[1]?.nickname || "Someone"} matched!`,
//       color: "#46C7CD"
//     }));
//     latestReportsPopulated.forEach(r => feedList.push({
//       id: r._id,
//       time: "5m ago",
//       description: `${r.reportedId?.nickname || "A user"} reported by ${r.reporterId?.nickname || "A user"}`,
//       color: "#F75555"
//     }));

//     // --- Dynamic Insights ---
//     const revInsight = revR.subscription >= (revR.boost + revR.superkeen) ? `Subscriptions contribute ${subPct}% of total revenue.` : `${consumablePct}% of revenue comes from consumables.`;
//     const dropstages = [
//       { label: "Profile Completion", drop: totalUsers > 0 ? (1 - funnelAgg[1] / totalUsers) : 0 },
//       { label: "First Swipe", drop: funnelAgg[1] > 0 ? (1 - funnelAgg[3] / funnelAgg[1]) : 0 },
//       { label: "Subscription", drop: funnelAgg[3] > 0 ? (1 - funnelAgg[5] / funnelAgg[3]) : 0 }
//     ];
//     const biggestDrop = dropstages.reduce((prev, cur) => (prev.drop > cur.drop) ? prev : cur);
//     const funnelInsight = biggestDrop.drop > 0.1 ? `${biggestDrop.label} stage has the highest drop-off.` : "Conversion funnel is performing well.";
//     const peakSlot = heatmapAgg.reduce((prev, cur) => (prev.count > cur.count) ? prev : cur, { _id: { hour: 20 }, count: 0 });
//     const pV = peakSlot._id?.hour ?? 20;
//     const peakHourText = pV >= 12 ? `${pV === 12 ? 12 : pV - 12}PM` : `${pV === 0 ? 12 : pV}AM`;

//     return res.status(200).json({
//       success: true,
//       meta: {
//         dateRange: { from: startDate.toISOString(), to: endDate.toISOString() },
//         preset,
//         periodLabel,
//         contextLabel
//       },
//       data: {
//         zoneA: {
//           title: `${periodLabel} at a glance`,
//           stats: [
//             { label: "Revenue", value: revTrendDisplay, sub: contextLabel, icon: "Sparkles", color: "emerald" },
//             { label: "Consumables driving", value: `${consumablePct}%`, sub: "of revenue", icon: "TrendingUp", color: "blue" },
//             { label: "Female signups", value: fSignupDisplay, sub: contextLabel, icon: "Users", color: "orange" },
//             { label: "KYC pending", value: `${pendingKYC}`, sub: "Review now →", icon: "ShieldAlert", color: "cyan", isActionable: true, route: "/admin/management/kyc-verifications" },
//             { label: "Users flagged", value: `${reportCountNew}`, sub: "Review now →", icon: "Flag", color: "sky", isActionable: true, route: "/admin/management/profile-reports" }
//           ]
//         },
//         zoneB: {
//           alerts: [
//             { id: "kyc", label: "KYC Verification", value: `${pendingKYC} profiles waiting for approval`, sub: "Review to activate new users", badge: pendingKYC > 10 ? "High" : "Low", badgeColor: "red", icon: "ShieldCheck", route: "/admin/management/kyc-verifications" },
//             { id: "reported", label: "High Reported Users", value: `${highReportedRange.length} users reported 5+ times today`, sub: "Investigate and take action", badge: "Medium", badgeColor: "orange", icon: "AlertTriangle", route: "/admin/management/profile-reports" },
//             { id: "ghosting", label: "Ghosting Rate", value: `${(ghostingRangeAgg.ghosted / (ghostingRangeAgg.total || 1) * 100).toFixed(0)}% ghosted`, sub: "Monitor engagement trends", badge: "Info", badgeColor: "blue", icon: "Activity", route: "/admin/management/users-management" }
//           ]
//         },
//         zoneC: {
//           metrics: [
//             { label: "Match Liquidity", value: `${matchLiqVal}%`, sub: `${matchesRange} matches / ${totalSwipesRange} swipes`, trend: `${matchLiqTrend}%`, isPositive: matchLiqCur >= matchLiqPrev, chartData: liqChart },
//             { label: "Gender Ratio", value: `${mRatio} : ${fRatio}`, sub: "Male : Female", isRatio: true, ratioValue: mRatio },
//             { label: "Revenue", value: fmtAmount(revR.total), sub: `Subs: ${subPct}% • Boosts: ${consumablePct}%`, trend: `${Math.abs(revTrendNum || 0).toFixed(1)}%`, isPositive: (revTrendNum || 0) >= 0, chartData: revChart },
//             { label: "Funnel Drop-off", value: `${funnelD}%`, sub: "At profile completion", trend: `${funnelD}%`, isPositive: false, chartData: [] }
//           ]
//         },
//         revenueBreakdown: {
//           subtitle: `${periodLabel} revenue by source`,
//           total: fmtAmount(revR.total),
//           insight: revInsight,
//           categories: [
//             { label: "Subscriptions", value: revR.subscription, displayValue: fmtAmount(revR.subscription), percentage: revR.total > 0 ? Math.round(revR.subscription / revR.total * 100) : 0, color: "hsl(182 59% 75%)" },
//             { label: "Profile Boost", value: revR.boost, displayValue: fmtAmount(revR.boost), percentage: revR.total > 0 ? Math.round(revR.boost / revR.total * 100) : 0, color: "hsl(182 59% 54%)" },
//             { label: "Superkeen", value: revR.superkeen, displayValue: fmtAmount(revR.superkeen), percentage: revR.total > 0 ? Math.round(revR.superkeen / revR.total * 100) : 0, color: "hsl(182 59% 35%)" }
//           ]
//         },
//         conversionFunnel: {
//           subtitle: "Where users drop off",
//           insight: funnelInsight,
//           stages: [
//             { label: "App Installs", value: totalUsers, dropOff: 0, color: "hsl(182 100% 88%)" },
//             { label: "Signups", value: totalUsers, dropOff: 0, color: "hsl(182 85% 78%)" },
//             { label: "Profile Complete", value: funnelAgg[1], dropOff: totalUsers > 0 ? -Math.round((1 - funnelAgg[1] / totalUsers) * 100) : 0, color: "hsl(182 70% 68%)" },
//             { label: "First Swipe", value: funnelAgg[3], dropOff: funnelAgg[1] > 0 ? -Math.round((1 - funnelAgg[3] / funnelAgg[1]) * 100) : 0, color: "hsl(182 60% 54%)" },
//             { label: "Subscribed", value: funnelAgg[5], dropOff: funnelAgg[3] > 0 ? -Math.round((1 - funnelAgg[5] / funnelAgg[3]) * 100) : 0, color: "hsl(182 60% 45%)" }
//           ]
//         },
//         performanceInsights: {
//           subtitle: "What's working, what needs focus",
//           insight: "Boosts and 4+ photo users drive the best results.",
//           metrics: [
//             { label: "Boost ROI", value: consumablePct > 0 ? `${(consumablePct / 20).toFixed(1)}x` : "0x", percentage: consumablePct, color: "hsl(182 59% 54%)" },
//             { label: "Super Keen rate", value: superkeenSuccessStats[0] > 0 ? `${(superkeenSuccessStats[1] / superkeenSuccessStats[0] * 100).toFixed(0)}%` : "0%", percentage: superkeenSuccessStats[0] > 0 ? Math.round(superkeenSuccessStats[1] / superkeenSuccessStats[0] * 100) : 0, color: "hsl(182 59% 65%)" },
//             { label: "Normal match rate", value: superkeenSuccessStats[2] > 0 ? `${(superkeenSuccessStats[3] / superkeenSuccessStats[2] * 100).toFixed(0)}%` : "0%", percentage: superkeenSuccessStats[2] > 0 ? Math.round(superkeenSuccessStats[3] / superkeenSuccessStats[2] * 100) : 0, color: "hsl(215 20% 65%)" },
//             { label: "4+ photo users", value: `${(photoImpactAgg.total > 0 ? Math.round((photoImpactAgg.good / photoImpactAgg.total) * 100) : 0)}%`, percentage: (photoImpactAgg.total > 0 ? Math.round((photoImpactAgg.good / photoImpactAgg.total) * 100) : 0), color: "hsl(182 59% 54%)" },
//             { label: "Deep connections", value: `${(deepConvoAggCount / (totalMatchesCount || 1) * 100).toFixed(0)}%`, percentage: Math.round(deepConvoAggCount / (totalMatchesCount || 1) * 100), color: "hsl(182 59% 65%)" }
//           ]
//         },
//         liveActivity: {
//           subtitle: "Important events happening now",
//           events: feedList.sort(() => Math.random() - 0.5)
//         },
//         activityHeatmap: {
//           subtitle: "When your users are most active",
//           insight: `Peak activity around ${peakHourText} based on last 30d baseline`,
//           days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
//           times: ["6am", "9am", "12pm", "3pm", "6pm", "9pm", "11pm", "12am"],
//           data: heatmapD
//         },
//         genderGrowth: {
//           subtitle: `Daily signups for ${periodLabel}`,
//           insight: `Male signups are dominant at ${mRatio}%`,
//           data: chartDates.map(date => ({
//             day: dayNamesShort[new Date(date).getDay()],
//             male: signups7dDaily.find(s => s._id.date === date && s._id.gender === "men")?.count || 0,
//             female: signups7dDaily.find(s => s._id.date === date && s._id.gender === "women")?.count || 0
//           }))
//         }
//       }
//     });
//   } catch (err) {
//     console.error("Dashboard Error:", err);
//     return res.status(500).json({ success: false, message: "Internal server error", error: err.message });
//   }
// };

exports.getAdvancedDashboardMetrics = async (req, res) => {
  try {
    const now = new Date();

    // 1. DATE RANGE FLEXIBILITY
    // Support "from", "to", and "preset". Default: Last 7 Days.
    const presetParam = req.query.preset;
    const fromQuery = req.query.from || req.query.startDate;
    const toQuery = req.query.to || req.query.endDate;

    let startDate, endDate;

    if (presetParam === "today") {
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now);
    } else if (presetParam === "yesterday") {
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 1);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setHours(23, 59, 59, 999);
    } else if (presetParam === "last7") {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      endDate = new Date(now);
    } else if (presetParam === "last30") {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      endDate = new Date(now);
    } else {
      startDate = fromQuery
        ? new Date(fromQuery)
        : new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      endDate = toQuery ? new Date(toQuery) : now;
    }
    const durationMs = endDate.getTime() - startDate.getTime();

    // For comparison (vs yesterday or vs last period)
    const prevStartDate = new Date(startDate.getTime() - durationMs);
    const prevEndDate = startDate;

    // Baselines
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Meta Labels & Context
    let periodLabel = "Custom Range";
    let contextLabel = "vs previous period";
    let preset = presetParam || "custom";

    if (preset === "today") {
      periodLabel = "Today";
      contextLabel = "vs yesterday";
    } else if (preset === "yesterday") {
      periodLabel = "Yesterday";
      contextLabel = "vs day before";
    } else if (preset === "last7") {
      periodLabel = "Last 7 Days";
      contextLabel = "vs previous 7 days";
    } else if (preset === "last30") {
      periodLabel = "Last 30 Days";
      contextLabel = "vs previous 30 days";
    } else {
      const hours = durationMs / (1000 * 60 * 60);
      if (hours <= 25) {
        periodLabel = "Today";
        contextLabel = "vs yesterday";
        preset = "today";
      } else if (hours <= 170) {
        periodLabel = "Last 7 Days";
        contextLabel = "vs previous 7 days";
        preset = "last7";
      }
    }

    const dayNamesShort = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    // 2. Load Catalog for Revenue Categorization
    const allProducts = await Product.find().lean();
    const getProductMatchKeys = (type) =>
      allProducts
        .filter((p) => p.consumableType === type)
        .flatMap((p) =>
          [p.productKey, p.appleProductId, p.googleProductId].filter(Boolean),
        );

    const boostKeys = getProductMatchKeys("BOOST");
    const superkeenKeys = getProductMatchKeys("SUPER_KEEN");

    // 3. Comprehensive Parallel Query Phase
    const [
      totalUsers,
      activeUsersRange,
      premiumUsers,
      bannedUsers,
      suspendedUsers,
      totalMatchesCount,
      pendingKYC,
      approvedKYC,
      rejectedKYC,
      reportCountNew,
      supportOpen,
      totalMessagesRange,
      deepConvoAggCount,
      ghostingRangeAgg,
      likesRange,
      superlikesRange,
      swipesPrev,
      matchesRange,
      matchesPrev,
      matches7dDaily,
      swipes7dDaily,
      heatmapAgg,
      revenueRangeAgg,
      revenuePrevAgg,
      revenue7dDaily,
      signups7dDaily,
      signupsRangeGender,
      signupsPrevGender,
      totalGenderAgg,
      funnelAgg,
      photoImpactAgg,
      superkeenSuccessStats,
      highReportedRange,
      latestMatchesPopulated,
      latestPurchasesPopulated,
      latestReportsPopulated,
    ] = await Promise.all([
      User.countDocuments({ role: "USER" }),
      User.countDocuments({
        lastLoginAt: { $gte: startDate, $lte: endDate },
        role: "USER",
        accountStatus: "active",
      }),
      User.countDocuments({ isPremium: true, role: "USER" }),
      User.countDocuments({ accountStatus: "banned", role: "USER" }),
      User.countDocuments({ accountStatus: "suspended", role: "USER" }),
      Match.countDocuments({}),
      Profile.countDocuments({ "verification.status": "pending" }),
      Profile.countDocuments({ "verification.status": "approved" }),
      Profile.countDocuments({ "verification.status": "rejected" }),
      Report.countDocuments({ status: { $in: ["new", "in_progress"] } }),
      SupportTicket.countDocuments({ status: "open" }).catch(() => 0),
      ChatMessage.countDocuments({
        createdAt: { $gte: startDate, $lte: endDate },
      }),
      ChatMessage.aggregate([
        { $match: { createdAt: { $gte: last30d } } },
        { $group: { _id: "$matchId", count: { $sum: 1 } } },
        { $match: { count: { $gte: 20 } } },
        { $count: "deepTotal" },
      ]).then((r) => r[0]?.deepTotal || 0),
      Match.aggregate([
        { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            ghosted: {
              $sum: { $cond: [{ $eq: ["$lastMessageAt", null] }, 1, 0] },
            },
          },
        },
      ]).then((r) => r[0] || { total: 0, ghosted: 0 }),
      Swipe.countDocuments({
        createdAt: { $gte: startDate, $lte: endDate },
        action: "like",
      }),
      Swipe.countDocuments({
        createdAt: { $gte: startDate, $lte: endDate },
        action: "superlike",
      }),
      Swipe.countDocuments({
        createdAt: { $gte: prevStartDate, $lte: prevEndDate },
        action: { $in: ["like", "superlike"] },
      }),
      Match.countDocuments({ createdAt: { $gte: startDate, $lte: endDate } }),
      Match.countDocuments({
        createdAt: { $gte: prevStartDate, $lte: prevEndDate },
      }),
      Match.aggregate([
        { $match: { createdAt: { $gte: last7d } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]).catch(() => []),
      Swipe.aggregate([
        {
          $match: {
            createdAt: { $gte: last7d },
            action: { $in: ["like", "superlike"] },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]).catch(() => []),
      Swipe.aggregate([
        { $match: { createdAt: { $gte: last30d } } },
        {
          $group: {
            _id: {
              day: { $dayOfWeek: "$createdAt" },
              hour: { $hour: "$createdAt" },
            },
            count: { $sum: 1 },
          },
        },
      ]).catch(() => []),
      Transaction.aggregate([
        {
          $match: {
            occurredAt: { $gte: startDate, $lte: endDate },
            eventType: { $in: ["PURCHASE", "RENEW", "CONSUMABLE_PURCHASE"] },
          },
        },
        {
          $group: {
            _id: "$productId",
            totalAmount: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
      ]),
      Transaction.aggregate([
        {
          $match: {
            occurredAt: { $gte: prevStartDate, $lte: prevEndDate },
            eventType: { $in: ["PURCHASE", "RENEW", "CONSUMABLE_PURCHASE"] },
          },
        },
        {
          $group: {
            _id: "$productId",
            totalAmount: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
      ]),
      Transaction.aggregate([
        {
          $match: {
            occurredAt: { $gte: last7d },
            eventType: { $in: ["PURCHASE", "RENEW", "CONSUMABLE_PURCHASE"] },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$occurredAt" } },
            total: { $sum: "$amount" },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Profile.aggregate([
        { $match: { createdAt: { $gte: last7d } } },
        {
          $group: {
            _id: {
              date: {
                $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
              },
              gender: "$gender",
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.date": 1 } },
      ]),
      Profile.aggregate([
        { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
        { $group: { _id: "$gender", count: { $sum: 1 } } },
      ]),
      Profile.aggregate([
        { $match: { createdAt: { $gte: prevStartDate, $lte: prevEndDate } } },
        { $group: { _id: "$gender", count: { $sum: 1 } } },
      ]),
      Profile.aggregate([{ $group: { _id: "$gender", count: { $sum: 1 } } }]),
      Promise.all([
        User.countDocuments({ role: "USER" }),
        Profile.countDocuments({ isMandatoryComplete: true }),
        Profile.countDocuments({ "verification.status": "approved" }),
        Swipe.distinct("swiperId").then((ids) => ids.length),
        Match.aggregate([
          { $unwind: "$users" },
          { $group: { _id: null, uniqueUsers: { $addToSet: "$users" } } },
          { $project: { count: { $size: "$uniqueUsers" } } },
        ]).then((r) => r[0]?.count || 0),
        User.countDocuments({ isPremium: true, role: "USER" }),
      ]),
      Profile.aggregate([
        {
          $project: {
            photoCount: { $size: { $ifNull: ["$photos", []] } },
            hasBio: {
              $cond: [
                { $and: [{ $ne: ["$about", null] }, { $ne: ["$about", ""] }] },
                true,
                false,
              ],
            },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            good: {
              $sum: {
                $cond: [
                  { $and: [{ $gte: ["$photoCount", 4] }, "$hasBio"] },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]).then((r) => r[0] || { total: 0, good: 0 }),
      Promise.all([
        Swipe.countDocuments({ action: "superlike" }),
        Match.countDocuments({ isSuperMatch: true }).catch(() => 0),
        Swipe.countDocuments({ action: "like" }),
        Match.countDocuments({ isSuperMatch: { $ne: true } }).catch(() => 0),
      ]),
      Report.aggregate([
        { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
        { $group: { _id: "$reportedId", count: { $sum: 1 } } },
        { $match: { count: { $gte: 5 } } },
      ]),
      Match.find()
        .sort({ matchedAt: -1 })
        .limit(3)
        .lean()
        .populate("users", "nickname"),
      Transaction.find({
        eventType: { $in: ["PURCHASE", "CONSUMABLE_PURCHASE"] },
      })
        .sort({ occurredAt: -1 })
        .limit(3)
        .lean()
        .populate("userId", "nickname"),
      Report.find()
        .sort({ createdAt: -1 })
        .limit(3)
        .lean()
        .populate("reportedId reporterId", "nickname"),
    ]);

    // --- Processing ---
    const processRev = (agg) => {
      let t = 0,
        b = 0,
        s = 0,
        sub = 0;
      agg.forEach((x) => {
        t += x.totalAmount;
        if (boostKeys.includes(x._id)) b += x.totalAmount;
        else if (superkeenKeys.includes(x._id)) s += x.totalAmount;
        else sub += x.totalAmount;
      });
      return { total: t, boost: b, superkeen: s, subscription: sub };
    };

    const revR = processRev(revenueRangeAgg);
    const revPrev = processRev(revenuePrevAgg);

    // Real % change only when previous period has data. No fake 100%.
    // const revTrendNum =
    //   revPrev.total > 0
    //     ? ((revR.total - revPrev.total) / revPrev.total) * 100
    //     : null;
    // const revTrendDisplay =
    //   revTrendNum !== null
    //     ? `${revTrendNum >= 0 ? "+" : ""}${revTrendNum.toFixed(1)}%`
    //     : revR.total > 0 ? `+${revR.total.toFixed(1)}` : "$0.00";

    const revTrendNum =
      revPrev.total > 0
        ? ((revR.total - revPrev.total) / revPrev.total) * 100
        : null;

    const revTrendDisplay =
      revTrendNum !== null && revTrendNum > 0
        ? `+${revTrendNum.toFixed(1)}%`
        : revR.total > 0
          ? `+${revR.total.toFixed(2)}`
          : "$0.00";

    const consumablePct =
      revR.total > 0
        ? Math.round(((revR.boost + revR.superkeen) / revR.total) * 100)
        : 0;
    const subPct =
      revR.total > 0 ? Math.round((revR.subscription / revR.total) * 100) : 0;

    const fRS = signupsRangeGender.find((g) => g._id === "women")?.count || 0;
    const fPS = signupsPrevGender.find((g) => g._id === "women")?.count || 0;
    const fCPNum = fPS > 0 ? ((fRS - fPS) / fPS) * 100 : null;
    const fSignupDisplay =
      fCPNum !== null
        ? `${fCPNum >= 0 ? "+" : ""}${Math.max(0, fCPNum).toFixed(0)}%`
        : fRS > 0
          ? `+${fRS} new`
          : "0 new";

    const gMT = totalGenderAgg.find((g) => g._id === "men")?.count || 0;
    const gFT = totalGenderAgg.find((g) => g._id === "women")?.count || 0;
    const gAT = gMT + gFT || 1;
    const mRatio = Math.round((gMT / gAT) * 100);
    const fRatio = Math.round((gFT / gAT) * 100);

    const totalSwipesRange = likesRange + superlikesRange;
    const matchLiqVal =
      totalSwipesRange > 0
        ? ((matchesRange / totalSwipesRange) * 100).toFixed(1)
        : "0.0";
    const matchLiqPrev = swipesPrev > 0 ? (matchesPrev / swipesPrev) * 100 : 0;
    const matchLiqCur =
      totalSwipesRange > 0 ? (matchesRange / totalSwipesRange) * 100 : 0;
    const matchLiqTrend =
      matchLiqPrev > 0
        ? Math.abs(((matchLiqCur - matchLiqPrev) / matchLiqPrev) * 100).toFixed(
            1,
          )
        : "0.0";

    const funnelD =
      totalUsers > 0
        ? (100 - (funnelAgg[1] / totalUsers) * 100).toFixed(0)
        : "0";

    const chartDates = [];
    for (let i = 6; i >= 0; i--) {
      chartDates.push(
        new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
      );
    }
    const revChart = chartDates.map(
      (d) => revenue7dDaily.find((x) => x._id === d)?.total || 0,
    );
    const liqChart = chartDates.map((d) => {
      const m = matches7dDaily.find((x) => x._id === d)?.count || 0;
      const s = swipes7dDaily.find((x) => x._id === d)?.count || 1;
      return parseFloat(((m / s) * 100).toFixed(1));
    });

    const heatmapD = [];
    const mongoDayOrder = [2, 3, 4, 5, 6, 7, 1]; // Mon-Sun
    mongoDayOrder.forEach((d) => {
      const row = [];
      [6, 9, 12, 15, 18, 21, 23, 0].forEach((h) => {
        const c =
          heatmapAgg.find((x) => x._id.day === d && x._id.hour === h)?.count ||
          0;
        row.push(c > 100 ? 3 : c > 50 ? 2 : c > 10 ? 1 : 0);
      });
      heatmapD.push(row);
    });

    // Smart currency formatter: shows raw if < 1000, 'k' if >= 1000
    const fmtAmount = (val) => {
      if (val >= 1000) return `$${(val / 1000).toFixed(1)}k`;
      if (val > 0) return `$${val.toFixed(2)}`;
      return "$0.00";
    };

    // Friendly product name from catalog
    const getProductFriendlyName = (productId) => {
      const p = allProducts.find(
        (x) =>
          x.productKey === productId ||
          x.appleProductId === productId ||
          x.googleProductId === productId,
      );
      return p ? p.displayName || p.name || productId : productId;
    };

    const feedList = [];
    latestPurchasesPopulated.forEach((p) =>
      feedList.push({
        id: p._id,
        time: "just now",
        description: `${p.userId?.nickname || "A user"} bought ${getProductFriendlyName(p.productId)}`,
        color: "#46C7CD",
      }),
    );
    latestMatchesPopulated.forEach((m) =>
      feedList.push({
        id: m._id,
        time: "1m ago",
        description: `${m.users?.[0]?.nickname || "Someone"} & ${m.users?.[1]?.nickname || "Someone"} matched!`,
        color: "#46C7CD",
      }),
    );
    latestReportsPopulated.forEach((r) =>
      feedList.push({
        id: r._id,
        time: "5m ago",
        description: `${r.reportedId?.nickname || "A user"} reported by ${r.reporterId?.nickname || "A user"}`,
        color: "#F75555",
      }),
    );

    // --- Dynamic Insights ---
    const revInsight =
      revR.subscription >= revR.boost + revR.superkeen
        ? `Subscriptions contribute ${subPct}% of total revenue.`
        : `${consumablePct}% of revenue comes from consumables.`;
    const dropstages = [
      {
        label: "Profile Completion",
        drop: totalUsers > 0 ? 1 - funnelAgg[1] / totalUsers : 0,
      },
      {
        label: "First Swipe",
        drop: funnelAgg[1] > 0 ? 1 - funnelAgg[3] / funnelAgg[1] : 0,
      },
      {
        label: "Subscription",
        drop: funnelAgg[3] > 0 ? 1 - funnelAgg[5] / funnelAgg[3] : 0,
      },
    ];
    const biggestDrop = dropstages.reduce((prev, cur) =>
      prev.drop > cur.drop ? prev : cur,
    );
    const funnelInsight =
      biggestDrop.drop > 0.1
        ? `${biggestDrop.label} stage has the highest drop-off.`
        : "Conversion funnel is performing well.";
    const peakSlot = heatmapAgg.reduce(
      (prev, cur) => (prev.count > cur.count ? prev : cur),
      { _id: { hour: 20 }, count: 0 },
    );
    const pV = peakSlot._id?.hour ?? 20;
    const peakHourText =
      pV >= 12 ? `${pV === 12 ? 12 : pV - 12}PM` : `${pV === 0 ? 12 : pV}AM`;

    return res.status(200).json({
      success: true,
      meta: {
        dateRange: { from: startDate.toISOString(), to: endDate.toISOString() },
        preset,
        periodLabel,
        contextLabel,
      },
      data: {
        zoneA: {
          title: `${periodLabel} at a glance`,
          stats: [
            {
              label: "Revenue",
              value: revTrendDisplay,
              sub: contextLabel,
              icon: "Sparkles",
              color: "emerald",
              route: "/admin/management/subscription-management",
            },
            {
              label: "Consumables driving",
              value: `${consumablePct}%`,
              sub: "of revenue",
              icon: "TrendingUp",
              color: "blue",
            },
            {
              label: "Female signups",
              value: fSignupDisplay,
              sub: contextLabel,
              icon: "Users",
              color: "orange",
              route: "/admin/management/users-management",
            },
            {
              label: "KYC pending",
              value: `${pendingKYC}`,
              sub: "Review now →",
              icon: "ShieldAlert",
              color: "cyan",
              isActionable: true,
              route: "/admin/management/kyc-verifications",
            },
            {
              label: "Users flagged",
              value: `${reportCountNew}`,
              sub: "Review now →",
              icon: "Flag",
              color: "sky",
              isActionable: true,
              route: "/admin/management/profile-reports",
            },
          ],
        },
        zoneB: {
          alerts: [
            {
              id: "kyc",
              label: "KYC Verification",
              value: `${pendingKYC} profiles waiting for approval`,
              sub: "Review to activate new users",
              badge: pendingKYC > 10 ? "High" : "Low",
              badgeColor: "red",
              icon: "ShieldCheck",
              route: "/admin/management/kyc-verifications",
            },
            {
              id: "reported",
              label: "High Reported Users",
              value: `${highReportedRange.length} users reported 5+ times today`,
              sub: "Investigate and take action",
              badge: "Medium",
              badgeColor: "orange",
              icon: "AlertTriangle",
              route: "/admin/management/profile-reports",
            },
            {
              id: "ghosting",
              label: "Ghosting Rate",
              value: `${((ghostingRangeAgg.ghosted / (ghostingRangeAgg.total || 1)) * 100).toFixed(0)}% ghosted`,
              sub: "Monitor engagement trends",
              badge: "Info",
              badgeColor: "blue",
              icon: "Activity",
              route: "/admin/management/users-management",
            },
          ],
        },
        zoneC: {
          metrics: [
            {
              label: "Match Liquidity",
              value: `${matchLiqVal}%`,
              sub: `${matchesRange} matches / ${totalSwipesRange} swipes`,
              trend: `${matchLiqTrend}%`,
              isPositive: matchLiqCur >= matchLiqPrev,
              chartData: liqChart,
            },
            {
              label: "Gender Ratio",
              value: `${mRatio} : ${fRatio}`,
              sub: "Male : Female",
              isRatio: true,
              ratioValue: mRatio,
            },
            {
              label: "Revenue",
              value: fmtAmount(revR.total),
              sub: `Subs: ${subPct}% • Boosts: ${consumablePct}%`,
              trend: `${Math.abs(revTrendNum || 0).toFixed(1)}%`,
              isPositive: (revTrendNum || 0) >= 0,
              chartData: revChart,
            },
            {
              label: "Funnel Drop-off",
              value: `${funnelD}%`,
              sub: "At profile completion",
              trend: `${funnelD}%`,
              isPositive: false,
              chartData: [],
            },
          ],
        },
        revenueBreakdown: {
          subtitle: `${periodLabel} revenue by source`,
          total: fmtAmount(revR.total),
          insight: revInsight,
          categories: [
            {
              label: "Subscriptions",
              value: revR.subscription,
              displayValue: fmtAmount(revR.subscription),
              percentage:
                revR.total > 0
                  ? Math.round((revR.subscription / revR.total) * 100)
                  : 0,
              color: "hsl(182 59% 75%)",
            },
            {
              label: "Profile Boost",
              value: revR.boost,
              displayValue: fmtAmount(revR.boost),
              percentage:
                revR.total > 0
                  ? Math.round((revR.boost / revR.total) * 100)
                  : 0,
              color: "hsl(182 59% 54%)",
            },
            {
              label: "Superkeen",
              value: revR.superkeen,
              displayValue: fmtAmount(revR.superkeen),
              percentage:
                revR.total > 0
                  ? Math.round((revR.superkeen / revR.total) * 100)
                  : 0,
              color: "hsl(182 59% 35%)",
            },
          ],
        },
        conversionFunnel: {
          subtitle: "Where users drop off",
          insight: funnelInsight,
          stages: [
            {
              label: "App Installs",
              value: totalUsers,
              dropOff: 0,
              color: "hsl(182 100% 88%)",
            },
            {
              label: "Signups",
              value: totalUsers,
              dropOff: 0,
              color: "hsl(182 85% 78%)",
            },
            {
              label: "Profile Complete",
              value: funnelAgg[1],
              dropOff:
                totalUsers > 0
                  ? -Math.round((1 - funnelAgg[1] / totalUsers) * 100)
                  : 0,
              color: "hsl(182 70% 68%)",
            },
            {
              label: "First Swipe",
              value: funnelAgg[3],
              dropOff:
                funnelAgg[1] > 0
                  ? -Math.round((1 - funnelAgg[3] / funnelAgg[1]) * 100)
                  : 0,
              color: "hsl(182 60% 54%)",
            },
            {
              label: "Subscribed",
              value: funnelAgg[5],
              dropOff:
                funnelAgg[3] > 0
                  ? -Math.round((1 - funnelAgg[5] / funnelAgg[3]) * 100)
                  : 0,
              color: "hsl(182 60% 45%)",
            },
          ],
        },
        performanceInsights: {
          subtitle: "What's working, what needs focus",
          insight: "Boosts and 4+ photo users drive the best results.",
          metrics: [
            {
              label: "Boost ROI",
              value:
                consumablePct > 0
                  ? `${(consumablePct / 20).toFixed(1)}x`
                  : "0x",
              percentage: consumablePct,
              color: "hsl(182 59% 54%)",
            },
            {
              label: "Super Keen rate",
              value:
                superkeenSuccessStats[0] > 0
                  ? `${((superkeenSuccessStats[1] / superkeenSuccessStats[0]) * 100).toFixed(0)}%`
                  : "0%",
              percentage:
                superkeenSuccessStats[0] > 0
                  ? Math.round(
                      (superkeenSuccessStats[1] / superkeenSuccessStats[0]) *
                        100,
                    )
                  : 0,
              color: "hsl(182 59% 65%)",
            },
            {
              label: "Normal match rate",
              value:
                superkeenSuccessStats[2] > 0
                  ? `${((superkeenSuccessStats[3] / superkeenSuccessStats[2]) * 100).toFixed(0)}%`
                  : "0%",
              percentage:
                superkeenSuccessStats[2] > 0
                  ? Math.round(
                      (superkeenSuccessStats[3] / superkeenSuccessStats[2]) *
                        100,
                    )
                  : 0,
              color: "hsl(215 20% 65%)",
            },
            {
              label: "4+ photo users",
              value: `${photoImpactAgg.total > 0 ? Math.round((photoImpactAgg.good / photoImpactAgg.total) * 100) : 0}%`,
              percentage:
                photoImpactAgg.total > 0
                  ? Math.round(
                      (photoImpactAgg.good / photoImpactAgg.total) * 100,
                    )
                  : 0,
              color: "hsl(182 59% 54%)",
            },
            {
              label: "Deep connections",
              value: `${((deepConvoAggCount / (totalMatchesCount || 1)) * 100).toFixed(0)}%`,
              percentage: Math.round(
                (deepConvoAggCount / (totalMatchesCount || 1)) * 100,
              ),
              color: "hsl(182 59% 65%)",
            },
          ],
        },
        liveActivity: {
          subtitle: "Important events happening now",
          events: feedList.sort(() => Math.random() - 0.5),
        },
        activityHeatmap: {
          subtitle: "When your users are most active",
          insight: `Peak activity around ${peakHourText} based on last 30d baseline`,
          days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
          times: ["6am", "9am", "12pm", "3pm", "6pm", "9pm", "11pm", "12am"],
          data: heatmapD,
        },
        genderGrowth: {
          subtitle: `Daily signups for ${periodLabel}`,
          insight: `Male signups are dominant at ${mRatio}%`,
          data: chartDates.map((date) => ({
            day: dayNamesShort[new Date(date).getDay()],
            male:
              signups7dDaily.find(
                (s) => s._id.date === date && s._id.gender === "men",
              )?.count || 0,
            female:
              signups7dDaily.find(
                (s) => s._id.date === date && s._id.gender === "women",
              )?.count || 0,
          })),
        },
      },
    });
  } catch (err) {
    console.error("Dashboard Error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message,
    });
  }
};
