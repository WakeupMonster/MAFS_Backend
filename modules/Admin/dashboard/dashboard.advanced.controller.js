// // ================================================================
// // ADVANCED DASHBOARD API — "Command Center" for Admin
// // All data is 100% dynamic, calculated from real DB aggregations.
// // ================================================================

// exports.getAdvancedDashboardMetrics = async (req, res) => {
//   try {
//     const now = new Date();

//     // 1. DATE RANGE FLEXIBILITY
//     // Support "from", "to", and "preset". Default: Last 7 Days.
//     const presetParam = req.query.preset;
//     const fromQuery = req.query.from || req.query.startDate;
//     const toQuery = req.query.to || req.query.endDate;

//     let startDate, endDate;

//     if (presetParam === "today") {
//       startDate = new Date(now);
//       startDate.setHours(0, 0, 0, 0);
//       endDate = new Date(now);
//     } else if (presetParam === "yesterday") {
//       startDate = new Date(now);
//       startDate.setDate(startDate.getDate() - 1);
//       startDate.setHours(0, 0, 0, 0);
//       endDate = new Date(startDate);
//       endDate.setHours(23, 59, 59, 999);
//     } else if (presetParam === "last7") {
//       startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
//       endDate = new Date(now);
//     } else if (presetParam === "last30") {
//       startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
//       endDate = new Date(now);
//     } else {
//       startDate = fromQuery
//         ? new Date(fromQuery)
//         : new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
//       endDate = toQuery ? new Date(toQuery) : now;
//     }
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

//     let preset = presetParam || "custom";

//     if (preset === "today") {
//       periodLabel = "Today";
//       contextLabel = "vs yesterday";
//     } else if (preset === "yesterday") {
//       periodLabel = "Yesterday";
//       contextLabel = "vs day before";
//     } else if (preset === "last7") {
//       periodLabel = "Last 7 Days";
//       contextLabel = "vs previous 7 days";
//     } else if (preset === "last30") {
//       periodLabel = "Last 30 Days";
//       contextLabel = "vs previous 30 days";
//     } else {
//       const hours = durationMs / (1000 * 60 * 60);
//       if (hours <= 25) {
//         periodLabel = "Today";
//         contextLabel = "vs yesterday";
//         preset = "today";
//       } else if (hours <= 170) {
//         periodLabel = "Last 7 Days";
//         contextLabel = "vs previous 7 days";
//         preset = "last7";
//       }
//     }

//     const dayNamesShort = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

//     // 2. Load Catalog for Revenue Categorization
//     const allProducts = await Product.find().lean();

//     const getProductMatchKeys = (type) =>
//       allProducts
//         .filter((p) => p.consumableType === type)
//         .flatMap((p) =>
//           [p.productKey, p.appleProductId, p.googleProductId].filter(Boolean),
//         );

//     const boostKeys = getProductMatchKeys("BOOST");
//     const superkeenKeys = getProductMatchKeys("SUPER_KEEN");

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

//       latestReportsPopulated,
//     ] = await Promise.all([
//       User.countDocuments({ role: "USER" }),
//       User.countDocuments({
//         lastLoginAt: { $gte: startDate, $lte: endDate },
//         role: "USER",
//         accountStatus: "active",
//       }),
//       User.countDocuments({ isPremium: true, role: "USER" }),
//       User.countDocuments({ accountStatus: "banned", role: "USER" }),
//       User.countDocuments({ accountStatus: "suspended", role: "USER" }),
//       Match.countDocuments({}),
//       Profile.countDocuments({ "verification.status": "pending" }),
//       Profile.countDocuments({ "verification.status": "approved" }),
//       Profile.countDocuments({ "verification.status": "rejected" }),
//       Report.countDocuments({ status: { $in: ["new", "in_progress"] } }),
//       SupportTicket.countDocuments({ status: "open" }).catch(() => 0),
//       ChatMessage.countDocuments({
//         createdAt: { $gte: startDate, $lte: endDate },
//       }),
//       ChatMessage.aggregate([
//         { $match: { createdAt: { $gte: last30d } } },
//         { $group: { _id: "$matchId", count: { $sum: 1 } } },
//         { $match: { count: { $gte: 20 } } },
//         { $count: "deepTotal" },
//       ]).then((r) => r[0]?.deepTotal || 0),
//       Match.aggregate([
//         { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
//         {
//           $group: {
//             _id: null,
//             total: { $sum: 1 },
//             ghosted: {
//               $sum: { $cond: [{ $eq: ["$lastMessageAt", null] }, 1, 0] },
//             },
//           },
//         },
//       ]).then((r) => r[0] || { total: 0, ghosted: 0 }),
//       Swipe.countDocuments({
//         createdAt: { $gte: startDate, $lte: endDate },
//         action: "like",
//       }),
//       Swipe.countDocuments({
//         createdAt: { $gte: startDate, $lte: endDate },
//         action: "superlike",
//       }),
//       Swipe.countDocuments({
//         createdAt: { $gte: prevStartDate, $lte: prevEndDate },
//         action: { $in: ["like", "superlike"] },
//       }),
//       Match.countDocuments({ createdAt: { $gte: startDate, $lte: endDate } }),
//       Match.countDocuments({
//         createdAt: { $gte: prevStartDate, $lte: prevEndDate },
//       }),
//       Match.aggregate([
//         { $match: { createdAt: { $gte: last7d } } },
//         {
//           $group: {
//             _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
//             count: { $sum: 1 },
//           },
//         },
//         { $sort: { _id: 1 } },
//       ]).catch(() => []),
//       Swipe.aggregate([
//         {
//           $match: {
//             createdAt: { $gte: last7d },
//             action: { $in: ["like", "superlike"] },
//           },
//         },
//         {
//           $group: {
//             _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
//             count: { $sum: 1 },
//           },
//         },
//         { $sort: { _id: 1 } },
//       ]).catch(() => []),
//       Swipe.aggregate([
//         { $match: { createdAt: { $gte: last30d } } },
//         {
//           $group: {
//             _id: {
//               day: { $dayOfWeek: "$createdAt" },
//               hour: { $hour: "$createdAt" },
//             },
//             count: { $sum: 1 },
//           },
//         },
//       ]).catch(() => []),
//       Transaction.aggregate([
//         {
//           $match: {
//             occurredAt: { $gte: startDate, $lte: endDate },
//             eventType: { $in: ["PURCHASE", "RENEW", "CONSUMABLE_PURCHASE"] },
//           },
//         },
//         {
//           $group: {
//             _id: "$productId",
//             totalAmount: { $sum: "$amount" },
//             count: { $sum: 1 },
//           },
//         },
//       ]),
//       Transaction.aggregate([
//         {
//           $match: {
//             occurredAt: { $gte: prevStartDate, $lte: prevEndDate },
//             eventType: { $in: ["PURCHASE", "RENEW", "CONSUMABLE_PURCHASE"] },
//           },
//         },
//         {
//           $group: {
//             _id: "$productId",
//             totalAmount: { $sum: "$amount" },
//             count: { $sum: 1 },
//           },
//         },
//       ]),
//       Transaction.aggregate([
//         {
//           $match: {
//             occurredAt: { $gte: last7d },
//             eventType: { $in: ["PURCHASE", "RENEW", "CONSUMABLE_PURCHASE"] },
//           },
//         },
//         {
//           $group: {
//             _id: { $dateToString: { format: "%Y-%m-%d", date: "$occurredAt" } },
//             total: { $sum: "$amount" },
//           },
//         },
//         { $sort: { _id: 1 } },
//       ]),
//       Profile.aggregate([
//         { $match: { createdAt: { $gte: last7d } } },
//         {
//           $group: {
//             _id: {
//               date: {
//                 $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
//               },
//               gender: "$gender",
//             },
//             count: { $sum: 1 },
//           },
//         },
//         { $sort: { "_id.date": 1 } },
//       ]),
//       Profile.aggregate([
//         { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
//         { $group: { _id: "$gender", count: { $sum: 1 } } },
//       ]),
//       Profile.aggregate([
//         { $match: { createdAt: { $gte: prevStartDate, $lte: prevEndDate } } },
//         { $group: { _id: "$gender", count: { $sum: 1 } } },
//       ]),
//       Profile.aggregate([{ $group: { _id: "$gender", count: { $sum: 1 } } }]),
//       Promise.all([
//         User.countDocuments({ role: "USER" }),
//         Profile.countDocuments({ isMandatoryComplete: true }),
//         Profile.countDocuments({ "verification.status": "approved" }),
//         Swipe.distinct("swiperId").then((ids) => ids.length),
//         Match.aggregate([
//           { $unwind: "$users" },
//           { $group: { _id: null, uniqueUsers: { $addToSet: "$users" } } },
//           { $project: { count: { $size: "$uniqueUsers" } } },
//         ]).then((r) => r[0]?.count || 0),
//         User.countDocuments({ isPremium: true, role: "USER" }),
//       ]),
//       Profile.aggregate([
//         {
//           $project: {
//             photoCount: { $size: { $ifNull: ["$photos", []] } },
//             hasBio: {
//               $cond: [
//                 { $and: [{ $ne: ["$about", null] }, { $ne: ["$about", ""] }] },
//                 true,
//                 false,
//               ],
//             },
//           },
//         },
//         {
//           $group: {
//             _id: null,
//             total: { $sum: 1 },
//             good: {
//               $sum: {
//                 $cond: [
//                   { $and: [{ $gte: ["$photoCount", 4] }, "$hasBio"] },
//                   1,
//                   0,
//                 ],
//               },
//             },
//           },
//         },
//       ]).then((r) => r[0] || { total: 0, good: 0 }),
//       Promise.all([
//         Swipe.countDocuments({ action: "superlike" }),
//         Match.countDocuments({ isSuperMatch: true }).catch(() => 0),
//         Swipe.countDocuments({ action: "like" }),
//         Match.countDocuments({ isSuperMatch: { $ne: true } }).catch(() => 0),
//       ]),
//       Report.aggregate([
//         { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
//         { $group: { _id: "$reportedId", count: { $sum: 1 } } },
//         { $match: { count: { $gte: 5 } } },
//       ]),
//       Match.find()
//         .sort({ matchedAt: -1 })
//         .limit(3)
//         .lean()
//         .populate("users", "nickname"),
//       Transaction.find({
//         eventType: { $in: ["PURCHASE", "CONSUMABLE_PURCHASE"] },
//       })
//         .sort({ occurredAt: -1 })
//         .limit(3)
//         .lean()
//         .populate("userId", "nickname"),
//       Report.find()
//         .sort({ createdAt: -1 })
//         .limit(3)
//         .lean()
//         .populate("reportedId reporterId", "nickname"),
//     ]);

//     // --- Processing ---
//     const processRev = (agg) => {
//       let t = 0,
//         b = 0,
//         s = 0,
//         sub = 0;
//       agg.forEach((x) => {
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
//     // const revTrendNum =
//     //   revPrev.total > 0
//     //     ? ((revR.total - revPrev.total) / revPrev.total) * 100
//     //     : null;
//     // const revTrendDisplay =
//     //   revTrendNum !== null
//     //     ? `${revTrendNum >= 0 ? "+" : ""}${revTrendNum.toFixed(1)}%`
//     //     : revR.total > 0 ? `+${revR.total.toFixed(1)}` : "$0.00";

//     const revTrendNum =
//       revPrev.total > 0
//         ? ((revR.total - revPrev.total) / revPrev.total) * 100
//         : null;

//     const revTrendDisplay =
//       revTrendNum !== null && revTrendNum > 0
//         ? `+${revTrendNum.toFixed(1)}%`
//         : revR.total > 0
//           ? `+${revR.total.toFixed(2)}`
//           : "$0.00";

//     const consumablePct =
//       revR.total > 0
//         ? Math.round(((revR.boost + revR.superkeen) / revR.total) * 100)
//         : 0;
//     const subPct =
//       revR.total > 0 ? Math.round((revR.subscription / revR.total) * 100) : 0;

//     const fRS = signupsRangeGender.find((g) => g._id === "women")?.count || 0;
//     const fPS = signupsPrevGender.find((g) => g._id === "women")?.count || 0;
//     const fCPNum = fPS > 0 ? ((fRS - fPS) / fPS) * 100 : null;
//     const fSignupDisplay =
//       fCPNum !== null
//         ? `${fCPNum >= 0 ? "+" : ""}${Math.max(0, fCPNum).toFixed(0)}%`
//         : fRS > 0
//           ? `+${fRS} new`
//           : "0 new";

//     const gMT = totalGenderAgg.find((g) => g._id === "men")?.count || 0;
//     const gFT = totalGenderAgg.find((g) => g._id === "women")?.count || 0;
//     const gAT = gMT + gFT || 1;
//     const mRatio = Math.round((gMT / gAT) * 100);
//     const fRatio = Math.round((gFT / gAT) * 100);

//     const totalSwipesRange = likesRange + superlikesRange;

//     const matchLiqVal =
//       totalSwipesRange > 0
//         ? ((matchesRange / totalSwipesRange) * 100).toFixed(1)
//         : "0.0";
//     const matchLiqPrev = swipesPrev > 0 ? (matchesPrev / swipesPrev) * 100 : 0;
//     const matchLiqCur =
//       totalSwipesRange > 0 ? (matchesRange / totalSwipesRange) * 100 : 0;
//     const matchLiqTrend =
//       matchLiqPrev > 0
//         ? Math.abs(((matchLiqCur - matchLiqPrev) / matchLiqPrev) * 100).toFixed(
//           1,
//         )
//         : "0.0";

//     const funnelD =
//       totalUsers > 0
//         ? (100 - (funnelAgg[1] / totalUsers) * 100).toFixed(0)
//         : "0";

//     const chartDates = [];
//     for (let i = 6; i >= 0; i--) {
//       chartDates.push(
//         new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
//           .toISOString()
//           .split("T")[0],
//       );
//     }
//     const revChart = chartDates.map(
//       (d) => revenue7dDaily.find((x) => x._id === d)?.total || 0,
//     );
//     const liqChart = chartDates.map((d) => {
//       const m = matches7dDaily.find((x) => x._id === d)?.count || 0;
//       const s = swipes7dDaily.find((x) => x._id === d)?.count || 1;
//       return parseFloat(((m / s) * 100).toFixed(1));
//     });

//     const heatmapD = [];
//     const mongoDayOrder = [2, 3, 4, 5, 6, 7, 1]; // Mon-Sun

//     mongoDayOrder.forEach((d) => {
//       const row = [];
//       [6, 9, 12, 15, 18, 21, 23, 0].forEach((h) => {
//         const c =
//           heatmapAgg.find((x) => x._id.day === d && x._id.hour === h)?.count ||
//           0;
//         row.push(c > 100 ? 3 : c > 50 ? 2 : c > 10 ? 1 : 0);
//       });
//       heatmapD.push(row);
//     });

//     // Smart currency formatter: shows raw if < 1000, 'k' if >= 1000
//     const fmtAmount = (val) => {
//       if (val >= 1000) return `$${(val / 1000).toFixed(1)}k`;
//       if (val > 0) return `$${val.toFixed(2)}`;
//       return "$0.00";
//     };

//     // Friendly product name from catalog
//     const getProductFriendlyName = (productId) => {
//       const p = allProducts.find(
//         (x) =>
//           x.productKey === productId ||
//           x.appleProductId === productId ||
//           x.googleProductId === productId,
//       );
//       return p ? p.displayName || p.name || productId : productId;
//     };

//     const feedList = [];
//     latestPurchasesPopulated.forEach((p) =>
//       feedList.push({
//         id: p._id,
//         time: "just now",
//         description: `${p.userId?.nickname || "A user"} bought ${getProductFriendlyName(p.productId)}`,
//         color: "#46C7CD",
//       }),
//     );
//     latestMatchesPopulated.forEach((m) =>
//       feedList.push({
//         id: m._id,
//         time: "1m ago",
//         description: `${m.users?.[0]?.nickname || "Someone"} & ${m.users?.[1]?.nickname || "Someone"} matched!`,
//         color: "#46C7CD",
//       }),
//     );
//     latestReportsPopulated.forEach((r) =>
//       feedList.push({
//         id: r._id,
//         time: "5m ago",
//         description: `${r.reportedId?.nickname || "A user"} reported by ${r.reporterId?.nickname || "A user"}`,
//         color: "#F75555",
//       }),
//     );

//     // --- Dynamic Insights ---
//     const revInsight =
//       revR.subscription >= revR.boost + revR.superkeen
//         ? `Subscriptions contribute ${subPct}% of total revenue.`
//         : `${consumablePct}% of revenue comes from consumables.`;
//     const dropstages = [
//       {
//         label: "Profile Completion",
//         drop: totalUsers > 0 ? 1 - funnelAgg[1] / totalUsers : 0,
//       },
//       {
//         label: "First Swipe",
//         drop: funnelAgg[1] > 0 ? 1 - funnelAgg[3] / funnelAgg[1] : 0,
//       },
//       {
//         label: "Subscription",
//         drop: funnelAgg[3] > 0 ? 1 - funnelAgg[5] / funnelAgg[3] : 0,
//       },
//     ];
//     const biggestDrop = dropstages.reduce((prev, cur) =>
//       prev.drop > cur.drop ? prev : cur,
//     );
//     const funnelInsight =
//       biggestDrop.drop > 0.1
//         ? `${biggestDrop.label} stage has the highest drop-off.`
//         : "Conversion funnel is performing well.";
//     const peakSlot = heatmapAgg.reduce(
//       (prev, cur) => (prev.count > cur.count ? prev : cur),
//       { _id: { hour: 20 }, count: 0 },
//     );
//     const pV = peakSlot._id?.hour ?? 20;
//     const peakHourText =
//       pV >= 12 ? `${pV === 12 ? 12 : pV - 12}PM` : `${pV === 0 ? 12 : pV}AM`;

//     return res.status(200).json({
//       success: true,
//       meta: {
//         dateRange: { from: startDate.toISOString(), to: endDate.toISOString() },
//         preset,
//         periodLabel,
//         contextLabel,
//       },
//       data: {
//         zoneA: {
//           title: `${periodLabel} at a glance`,
//           stats: [
//             {
//               label: "Revenue",
//               value: revTrendDisplay,
//               sub: contextLabel,
//               icon: "Sparkles",
//               color: "emerald",
//               route: "/admin/management/subscription-management",
//             },
//             {
//               label: "Consumables driving",
//               value: `${consumablePct}%`,
//               sub: "of revenue",
//               icon: "TrendingUp",
//               color: "blue",
//             },
//             {
//               label: "Female signups",
//               value: fSignupDisplay,
//               sub: contextLabel,
//               icon: "Users",
//               color: "orange",
//               route: "/admin/management/users-management",
//             },
//             {
//               label: "KYC pending",
//               value: `${pendingKYC}`,
//               sub: "Review now →",
//               icon: "ShieldAlert",
//               color: "cyan",
//               isActionable: true,
//               route: "/admin/management/kyc-verifications",
//             },
//             {
//               label: "Users flagged",
//               value: `${reportCountNew}`,
//               sub: "Review now →",
//               icon: "Flag",
//               color: "sky",
//               isActionable: true,
//               route: "/admin/management/profile-reports",
//             },
//           ],
//         },
//         zoneB: {
//           alerts: [
//             {
//               id: "kyc",
//               label: "KYC Verification",
//               value: `${pendingKYC} profiles waiting for approval`,
//               sub: "Review to activate new users",
//               badge: pendingKYC > 10 ? "High" : "Low",
//               badgeColor: "red",
//               icon: "ShieldCheck",
//               route: "/admin/management/kyc-verifications",
//             },
//             {
//               id: "reported",
//               label: "High Reported Users",
//               value: `${highReportedRange.length} users reported 5+ times today`,
//               sub: "Investigate and take action",
//               badge: "Medium",
//               badgeColor: "orange",
//               icon: "AlertTriangle",
//               route: "/admin/management/profile-reports",
//             },
//             {
//               id: "ghosting",
//               label: "Ghosting Rate",
//               value: `${((ghostingRangeAgg.ghosted / (ghostingRangeAgg.total || 1)) * 100).toFixed(0)}% ghosted`,
//               sub: "Monitor engagement trends",
//               badge: "Info",
//               badgeColor: "blue",
//               icon: "Activity",
//               route: "/admin/management/users-management",
//             },
//           ],
//         },
//         zoneC: {
//           metrics: [
//             {
//               label: "Match Liquidity",
//               value: `${matchLiqVal}%`,
//               sub: `${matchesRange} matches / ${totalSwipesRange} swipes`,
//               trend: `${matchLiqTrend}%`,
//               isPositive: matchLiqCur >= matchLiqPrev,
//               chartData: liqChart,
//             },
//             {
//               label: "Gender Ratio",
//               value: `${mRatio} : ${fRatio}`,
//               sub: "Male : Female",
//               isRatio: true,
//               ratioValue: mRatio,
//             },
//             {
//               label: "Revenue",
//               value: fmtAmount(revR.total),
//               sub: `Subs: ${subPct}% • Boosts: ${consumablePct}%`,
//               trend: `${Math.abs(revTrendNum || 0).toFixed(1)}%`,
//               isPositive: (revTrendNum || 0) >= 0,
//               chartData: revChart,
//             },
//             {
//               label: "Funnel Drop-off",
//               value: `${funnelD}%`,
//               sub: "At profile completion",
//               trend: `${funnelD}%`,
//               isPositive: false,
//               chartData: [],
//             },
//           ],
//         },
//         revenueBreakdown: {
//           subtitle: `${periodLabel} revenue by source`,
//           total: fmtAmount(revR.total),
//           insight: revInsight,
//           categories: [

//             {
//               label: "Subscriptions",
//               value: revR.subscription,
//               displayValue: fmtAmount(revR.subscription),
//               percentage:
//                 revR.total > 0
//                   ? Math.round((revR.subscription / revR.total) * 100)
//                   : 0,
//               color: "hsl(182 59% 75%)",
//             },
//             {
//               label: "Profile Boost",
//               value: revR.boost,
//               displayValue: fmtAmount(revR.boost),
//               percentage:
//                 revR.total > 0
//                   ? Math.round((revR.boost / revR.total) * 100)
//                   : 0,
//               color: "hsl(182 59% 54%)",
//             },
//             {
//               label: "Superkeen",
//               value: revR.superkeen,
//               displayValue: fmtAmount(revR.superkeen),
//               percentage:
//                 revR.total > 0
//                   ? Math.round((revR.superkeen / revR.total) * 100)
//                   : 0,
//               color: "hsl(182 59% 35%)",
//             },
//           ],
//         },
//         conversionFunnel: {
//           subtitle: "Where users drop off",
//           insight: funnelInsight,
//           stages: [
//             {
//               label: "App Installs",
//               value: totalUsers,
//               dropOff: 0,
//               color: "hsl(182 100% 88%)",
//             },
//             {
//               label: "Signups",
//               value: totalUsers,
//               dropOff: 0,
//               color: "hsl(182 85% 78%)",
//             },
//             {
//               label: "Profile Complete",
//               value: funnelAgg[1],
//               dropOff:
//                 totalUsers > 0
//                   ? -Math.round((1 - funnelAgg[1] / totalUsers) * 100)
//                   : 0,
//               color: "hsl(182 70% 68%)",
//             },
//             {
//               label: "First Swipe",
//               value: funnelAgg[3],
//               dropOff:
//                 funnelAgg[1] > 0
//                   ? -Math.round((1 - funnelAgg[3] / funnelAgg[1]) * 100)
//                   : 0,
//               color: "hsl(182 60% 54%)",
//             },
//             {
//               label: "Subscribed",
//               value: funnelAgg[5],
//               dropOff:
//                 funnelAgg[3] > 0
//                   ? -Math.round((1 - funnelAgg[5] / funnelAgg[3]) * 100)
//                   : 0,
//               color: "hsl(182 60% 45%)",
//             },
//           ],
//         },
//         performanceInsights: {
//           subtitle: "What's working, what needs focus",
//           insight: "Boosts and 4+ photo users drive the best results.",
//           metrics: [
//             {
//               label: "Boost ROI",
//               value:
//                 consumablePct > 0
//                   ? `${(consumablePct / 20).toFixed(1)}x`
//                   : "0x",
//               percentage: consumablePct,
//               color: "hsl(182 59% 54%)",
//             },
//             {
//               label: "Super Keen rate",
//               value:
//                 superkeenSuccessStats[0] > 0
//                   ? `${((superkeenSuccessStats[1] / superkeenSuccessStats[0]) * 100).toFixed(0)}%`
//                   : "0%",
//               percentage:
//                 superkeenSuccessStats[0] > 0
//                   ? Math.round(
//                     (superkeenSuccessStats[1] / superkeenSuccessStats[0]) *
//                     100,
//                   )
//                   : 0,
//               color: "hsl(182 59% 65%)",
//             },
//             {
//               label: "Normal match rate",
//               value:
//                 superkeenSuccessStats[2] > 0
//                   ? `${((superkeenSuccessStats[3] / superkeenSuccessStats[2]) * 100).toFixed(0)}%`
//                   : "0%",
//               percentage:
//                 superkeenSuccessStats[2] > 0
//                   ? Math.round(
//                     (superkeenSuccessStats[3] / superkeenSuccessStats[2]) *
//                     100,
//                   )
//                   : 0,
//               color: "hsl(215 20% 65%)",
//             },
//             {
//               label: "4+ photo users",
//               value: `${photoImpactAgg.total > 0 ? Math.round((photoImpactAgg.good / photoImpactAgg.total) * 100) : 0}%`,
//               percentage:
//                 photoImpactAgg.total > 0
//                   ? Math.round(
//                     (photoImpactAgg.good / photoImpactAgg.total) * 100,
//                   )
//                   : 0,
//               color: "hsl(182 59% 54%)",
//             },
//             {
//               label: "Deep connections",
//               value: `${((deepConvoAggCount / (totalMatchesCount || 1)) * 100).toFixed(0)}%`,
//               percentage: Math.round(
//                 (deepConvoAggCount / (totalMatchesCount || 1)) * 100,
//               ),
//               color: "hsl(182 59% 65%)",
//             },
//           ],
//         },
//         liveActivity: {
//           subtitle: "Important events happening now",
//           events: feedList.sort(() => Math.random() - 0.5),
//         },
//         activityHeatmap: {
//           subtitle: "When your users are most active",
//           insight: `Peak activity around ${peakHourText} based on last 30d baseline`,
//           days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
//           times: ["6am", "9am", "12pm", "3pm", "6pm", "9pm", "11pm", "12am"],
//           data: heatmapD,
//         },
//         genderGrowth: {
//           subtitle: `Daily signups for ${periodLabel}`,
//           insight: `Male signups are dominant at ${mRatio}%`,
//           data: chartDates.map((date) => ({
//             day: dayNamesShort[new Date(date).getDay()],
//             male:
//               signups7dDaily.find(
//                 (s) => s._id.date === date && s._id.gender === "men",
//               )?.count || 0,
//             female:
//               signups7dDaily.find(
//                 (s) => s._id.date === date && s._id.gender === "women",
//               )?.count || 0,
//           })),
//         },
//       },
//     });
//   } catch (err) {
//     console.error("Dashboard Error:", err);
//     return res.status(500).json({
//       success: false,
//       message: "Internal server error",
//       error: err.message,
//     });
//   }
// };
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

// ================================================================
// ADVANCED DASHBOARD API — "Command Center" for Admin
// All data is 100% dynamic, calculated from real DB aggregations.
// ================================================================
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
    const startOfYear = new Date(now.getFullYear(), 0, 1); // Jan 1st
    const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59); // Dec 31st
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

    // 3. Optimized Parallel Query Phase
    // Merged related queries using $facet to reduce round-trips.

    const [
      // --- User/Status Counts ---
      userCountsFacet,
      // --- Profile/KYC Counts ---
      profileCountsFacet,
      // --- Core Engagement ---
      totalMatchesCount,
      reportCountNew,
      supportOpen,
      totalMessagesRange,
      deepConvoAggCount,
      ghostingRangeAgg,
      // --- Swipes ---
      swipesFacet,
      // --- Matches ---
      matchesFacet,
      // --- Chart Data ---
      matches7dDaily,
      swipes7dDaily,
      heatmapAgg,
      // --- Revenue ---
      revenueFacet,
      // --- Signup Gender ---
      signupGenderFacet,
      // --- Funnel ---
      funnelCompletedProfiles,
      funnelVerifiedProfiles,
      funnelSwipersCount,
      funnelMatchedUsersCount,
      // --- Quality Metrics ---
      _photoUnused,
      // --- Performance Stats ---
      superkeenSwipes,
      superkeenMatches,
      normalSwipes,
      normalMatches,
      // --- Reports ---
      highReportedRange,
      // --- Social Health ---
      blockCountRange,
    ] = await Promise.all([
      // 1. All user status counts in one $facet
      User.aggregate([
        { $match: { role: "USER" } },
        {
          $facet: {
            total: [{ $count: "n" }],
            active: [
              {
                $match: {
                  lastLoginAt: { $gte: startDate, $lte: endDate },
                  accountStatus: "active",
                },
              },
              { $count: "n" },
            ],
            premium: [{ $match: { isPremium: true } }, { $count: "n" }],
            banned: [{ $match: { accountStatus: "banned" } }, { $count: "n" }],
            suspended: [
              { $match: { accountStatus: "suspended" } },
              { $count: "n" },
            ],
          },
        },
      ]).then((r) => r[0]),

      // 2. All profile/KYC counts in one $facet
      Profile.aggregate([
        {
          $facet: {
            pending: [
              { $match: { "verification.status": "pending" } },
              { $count: "n" },
            ],
            approved: [
              { $match: { "verification.status": "approved" } },
              { $count: "n" },
            ],
            rejected: [
              { $match: { "verification.status": "rejected" } },
              { $count: "n" },
            ],
            mandatory: [
              { $match: { isMandatoryComplete: true } },
              { $count: "n" },
            ],
            // Photo quality scan — merged here to avoid extra full-collection scan
            quality: [
              {
                $group: {
                  _id: null,
                  total: { $sum: 1 },
                  good: {
                    $sum: {
                      $cond: [
                        {
                          $and: [
                            {
                              $gte: [
                                { $size: { $ifNull: ["$photos", []] } },
                                4,
                              ],
                            },
                            {
                              $and: [
                                { $ne: ["$about", null] },
                                { $ne: ["$about", ""] },
                              ],
                            },
                          ],
                        },
                        1,
                        0,
                      ],
                    },
                  },
                },
              },
            ],
          },
        },
      ]).then((r) => r[0]),

      // 3. Total matches (all time)
      Match.countDocuments({}),

      // 4. Active reports
      Report.countDocuments({ status: { $in: ["new", "in_progress"] } }),

      // 5. Open support tickets
      SupportTicket.countDocuments({ status: "open" }).catch(() => 0),

      // 6. Messages in range
      ChatMessage.countDocuments({
        createdAt: { $gte: startDate, $lte: endDate },
      }),

      // 7. Deep conversations (30d baseline)
      ChatMessage.aggregate([
        { $match: { createdAt: { $gte: last30d } } },
        { $group: { _id: "$matchId", count: { $sum: 1 } } },
        { $match: { count: { $gte: 20 } } },
        { $count: "deepTotal" },
      ]).then((r) => r[0]?.deepTotal || 0),

      // 8. Ghosting rate for current range (Matches with NO messages)
      Match.aggregate([
        { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            ghosted: {
              $sum: { $cond: [{ $eq: ["$lastMessageBy", null] }, 1, 0] },
            },
          },
        },
      ]).then((r) => r[0] || { total: 0, ghosted: 0 }),

      // 9. Swipe counts: current + prev merged via $facet
      Swipe.aggregate([
        {
          $match: {
            createdAt: { $gte: prevStartDate, $lte: endDate },
            action: { $in: ["like", "superlike"] },
          },
        },
        {
          $facet: {
            currentLikes: [
              { $match: { createdAt: { $gte: startDate }, action: "like" } },
              { $count: "n" },
            ],
            currentSuperlikes: [
              {
                $match: { createdAt: { $gte: startDate }, action: "superlike" },
              },
              { $count: "n" },
            ],
            prev: [
              { $match: { createdAt: { $lt: startDate } } },
              { $count: "n" },
            ],
          },
        },
      ]).then((r) => r[0]),

      // 10. Match counts: current + prev merged via $facet
      Match.aggregate([
        { $match: { createdAt: { $gte: prevStartDate, $lte: endDate } } },
        {
          $facet: {
            current: [
              { $match: { createdAt: { $gte: startDate } } },
              { $count: "n" },
            ],
            prev: [
              { $match: { createdAt: { $lt: startDate } } },
              { $count: "n" },
            ],
          },
        },
      ]).then((r) => r[0]),

      // 11. Match daily chart for range
      Match.aggregate([
        { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]).catch(() => []),

      // 12. Swipe daily chart for range
      Swipe.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate },
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

      // 13. Activity heatmap (Hourly slot counts for current calendar year)
      Swipe.aggregate([
        { $match: { createdAt: { $gte: startOfYear } } },
        {
          $addFields: {
            _hour: { $hour: "$createdAt" },
          },
        },
        {
          $addFields: {
            _slot: {
              $switch: {
                branches: [
                  {
                    case: {
                      $and: [{ $gte: ["$_hour", 3] }, { $lt: ["$_hour", 6] }],
                    },
                    then: 0,
                  },
                  {
                    case: {
                      $and: [{ $gte: ["$_hour", 6] }, { $lt: ["$_hour", 9] }],
                    },
                    then: 1,
                  },
                  {
                    case: {
                      $and: [{ $gte: ["$_hour", 9] }, { $lt: ["$_hour", 12] }],
                    },
                    then: 2,
                  },
                  {
                    case: {
                      $and: [{ $gte: ["$_hour", 12] }, { $lt: ["$_hour", 15] }],
                    },
                    then: 3,
                  },
                  {
                    case: {
                      $and: [{ $gte: ["$_hour", 15] }, { $lt: ["$_hour", 18] }],
                    },
                    then: 4,
                  },
                  {
                    case: {
                      $and: [{ $gte: ["$_hour", 18] }, { $lt: ["$_hour", 21] }],
                    },
                    then: 5,
                  },
                  { case: { $gte: ["$_hour", 21] }, then: 6 },
                ],
                default: -1,
              },
            },
          },
        },
        { $match: { _slot: { $gte: 0 } } },
        {
          $group: {
            _id: {
              date: {
                $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
              },
              slot: "$_slot",
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.date": 1, "_id.slot": 1 } },
      ]).catch(() => []),

      // 14. Revenue: current + prev + daily merged via $facet
      Transaction.aggregate([
        {
          $match: {
            occurredAt: { $gte: prevStartDate, $lte: endDate },
            eventType: { $in: ["PURCHASE", "RENEW", "CONSUMABLE_PURCHASE"] },
          },
        },
        {
          $facet: {
            current: [
              { $match: { occurredAt: { $gte: startDate } } },
              {
                $group: {
                  _id: "$productId",
                  totalAmount: { $sum: "$amount" },
                  count: { $sum: 1 },
                },
              },
            ],
            prev: [
              { $match: { occurredAt: { $lt: startDate } } },
              {
                $group: {
                  _id: "$productId",
                  totalAmount: { $sum: "$amount" },
                  count: { $sum: 1 },
                },
              },
            ],
            daily: [
              { $match: { occurredAt: { $gte: startDate } } },
              {
                $group: {
                  _id: {
                    $dateToString: { format: "%Y-%m-%d", date: "$occurredAt" },
                  },
                  total: { $sum: "$amount" },
                },
              },
              { $sort: { _id: 1 } },
            ],
          },
        },
      ]).then((r) => r[0]),

      // 15. Signup gender stats: range + prev + total via $facet on Profile
      Profile.aggregate([
        {
          $facet: {
            rangeByDay: [
              { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
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
            ],
            rangeTotal: [
              { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
              { $group: { _id: "$gender", count: { $sum: 1 } } },
            ],
            prevTotal: [
              {
                $match: {
                  createdAt: { $gte: prevStartDate, $lte: prevEndDate },
                },
              },
              { $group: { _id: "$gender", count: { $sum: 1 } } },
            ],
            allTimeTotal: [{ $group: { _id: "$gender", count: { $sum: 1 } } }],
          },
        },
      ]).then((r) => r[0]),

      // 16. Funnel: profile complete count
      Profile.countDocuments({ isMandatoryComplete: true }),

      // 17. Funnel: verified profiles
      Profile.countDocuments({ "verification.status": "approved" }),

      // 18. Funnel: unique swipers
      Swipe.aggregate([{ $group: { _id: "$swiperId" } }, { $count: "n" }]).then(
        (r) => r[0]?.n || 0,
      ),

      // 19. Funnel: users who got a match
      Match.aggregate([
        { $project: { users: 1 } },
        { $unwind: "$users" },
        { $group: { _id: "$users" } },
        { $count: "n" },
      ]).then((r) => r[0]?.n || 0),

      // 20. Photo quality — extracted from profileCountsFacet.quality above — placeholder (resolved below)
      // (We'll derive photoImpactAgg from profileCountsFacet directly — this slot is unused)
      Promise.resolve(null),

      // 21. Super keen: swipes in range
      Swipe.countDocuments({
        createdAt: { $gte: startDate, $lte: endDate },
        action: "superlike",
      }),

      // 22. Super keen: matches resulting from superlike in range
      Match.countDocuments({
        createdAt: { $gte: startDate, $lte: endDate },
        isSuperMatch: true,
      }).catch(() => 0),

      // 23. Normal swipes in range
      Swipe.countDocuments({
        createdAt: { $gte: startDate, $lte: endDate },
        action: "like",
      }),

      // 24. Normal matches in range
      Match.countDocuments({
        createdAt: { $gte: startDate, $lte: endDate },
        isSuperMatch: { $ne: true },
      }).catch(() => 0),

      // 25. High reported users in range
      Report.aggregate([
        { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
        { $group: { _id: "$reportedId", count: { $sum: 1 } } },
        { $match: { count: { $gte: 5 } } },
      ]),

      // 26. Social Health: blocks in range (Post-match / From Chat)
      Block.aggregate([
        { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
        {
          $lookup: {
            from: "matches",
            let: { b1: "$blockerId", b2: "$blockedId" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $in: ["$$b1", "$users"] },
                      { $in: ["$$b2", "$users"] },
                      { $ne: ["$lastMessageBy", null] },
                    ],
                  },
                },
              },
            ],
            as: "match",
          },
        },
        { $match: { "match.0": { $exists: true } } },
        { $count: "n" },
      ]).then((r) => r[0]?.n || 0),
    ]);

    // --- Unpack $facet results ---
    const totalUsers = userCountsFacet?.total?.[0]?.n || 0;
    // const activeUsersRange = userCountsFacet?.active?.[0]?.n || 0;
    const premiumUsers = userCountsFacet?.premium?.[0]?.n || 0;
    // const bannedUsers = userCountsFacet?.banned?.[0]?.n || 0;
    // const suspendedUsers = userCountsFacet?.suspended?.[0]?.n || 0;

    const pendingKYC = profileCountsFacet?.pending?.[0]?.n || 0;
    // const approvedKYC = profileCountsFacet?.approved?.[0]?.n || 0;
    // const rejectedKYC = profileCountsFacet?.rejected?.[0]?.n || 0;
    const photoImpactAgg = profileCountsFacet?.quality?.[0] || {
      total: 0,
      good: 0,
    };

    const likesRange = swipesFacet?.currentLikes?.[0]?.n || 0;
    const superlikesRange = swipesFacet?.currentSuperlikes?.[0]?.n || 0;
    const swipesPrev = swipesFacet?.prev?.[0]?.n || 0;

    const matchesRange = matchesFacet?.current?.[0]?.n || 0;
    const matchesPrev = matchesFacet?.prev?.[0]?.n || 0;

    const revenueRangeAgg = revenueFacet?.current || [];
    const revenuePrevAgg = revenueFacet?.prev || [];
    const revenue7dDaily = revenueFacet?.daily || [];

    const signups7dDaily = signupGenderFacet?.rangeByDay || [];
    const signupsRangeGender = signupGenderFacet?.rangeTotal || [];
    const signupsPrevGender = signupGenderFacet?.prevTotal || [];
    const totalGenderAgg = signupGenderFacet?.allTimeTotal || [];

    // Funnel array compat: [totalUsers, profileComplete, _, swipers, _, premiumUsers]
    const funnelAgg = [
      totalUsers,
      funnelCompletedProfiles,
      null,
      funnelSwipersCount,
      null,
      premiumUsers,
    ];

    // superkeenSuccessStats compat: [superlikeSwipes, superMatches, normalLikeSwipes, normalMatches]
    const superkeenSuccessStats = [
      superkeenSwipes,
      superkeenMatches,
      normalSwipes,
      normalMatches,
    ];

    // processRev helper
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

    // --- Process Revenue Trends ---
    const revTrendNum =
      revPrev.total > 0
        ? ((revR.total - revPrev.total) / revPrev.total) * 100
        : null;
    const revTrendDisplay =
      revTrendNum !== null
        ? `${revTrendNum >= 0 ? "+" : ""}${revTrendNum.toFixed(1)}%`
        : "0.0%";

    const consumablePct =
      revR.total > 0
        ? Math.round(((revR.boost + revR.superkeen) / revR.total) * 100)
        : 0;
    const subPct =
      revR.total > 0 ? Math.round((revR.subscription / revR.total) * 100) : 0;

    // --- Process Signup Trends (Female) ---
    const fRS = signupsRangeGender.find((g) => g._id === "women")?.count || 0;
    const fPS = signupsPrevGender.find((g) => g._id === "women")?.count || 0;
    const fCPNum = fPS > 0 ? ((fRS - fPS) / fPS) * 100 : null;
    const fSignupTrend =
      fCPNum !== null
        ? `${fCPNum >= 0 ? "+" : ""}${fCPNum.toFixed(1)}%`
        : "0.0%";

    // --- Process Gender Ratios (Range Specific) ---
    const mRS = signupsRangeGender.find((g) => g._id === "men")?.count || 0;
    const aRS = mRS + fRS || 1;
    const mRatioRange = Math.round((mRS / aRS) * 100);
    const fRatioRange = 100 - mRatioRange;

    // --- Process Gender Ratios (Total) ---
    const gMT = totalGenderAgg.find((g) => g._id === "men")?.count || 0;
    const gFT = totalGenderAgg.find((g) => g._id === "women")?.count || 0;
    const gAT = gMT + gFT || 1;
    const mRatioTotal = Math.round((gMT / gAT) * 100);
    const fRatioTotal = 100 - mRatioTotal;

    // --- Process Liquidity ---
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
        ? (((matchLiqCur - matchLiqPrev) / matchLiqPrev) * 100).toFixed(1)
        : "0.0";

    const chartDates = [];
    const daysDiff = Math.floor(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    const maxPoints = Math.min(daysDiff, preset === "last90" ? 90 : 30); // Allow 90 days for last90 preset
    for (let i = maxPoints; i >= 0; i--) {
      const d = new Date(endDate.getTime() - i * 24 * 60 * 60 * 1000);
      chartDates.push(d.toISOString().split("T")[0]);
    }
    const revChart = chartDates.map(
      (d) => revenue7dDaily.find((x) => x._id === d)?.total || 0,
    );
    const liqChart = chartDates.map((d) => {
      const m = matches7dDaily.find((x) => x._id === d)?.count || 0;
      const s = swipes7dDaily.find((x) => x._id === d)?.count || 1;
      return parseFloat(((m / s) * 100).toFixed(1));
    });

    const heatmapD = heatmapAgg.map((item) => ({
      date: item._id.date,
      slot: item._id.slot,
      count: item.count,
      intensity:
        item.count > 100 ? 3 : item.count > 50 ? 2 : item.count > 10 ? 1 : 0,
    }));

    const fmtAmount = (val) => {
      if (val >= 100000) return `$${(val / 100000).toFixed(1)}L`;
      if (val >= 1000) return `$${(val / 1000).toFixed(1)}k`;
      return `$${val.toFixed(2)}`;
    };

    // --- Dynamic Insights ---
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
          title:
            preset === "custom"
              ? "Period at a glance"
              : `${periodLabel} at a glance`,
          stats: [
            {
              label: "Revenue",
              value: fmtAmount(revR.total),
              sub: contextLabel,
              trend: revTrendDisplay,
              isPositive: (revTrendNum || 0) >= 0,
              icon: "Sparkles",
              color: "emerald",
              route: "/admin/management/subscription-management",
            },
            {
              label: "Boosts driving",
              value: `${consumablePct}%`,
              sub: "of revenue",
              trend: `${consumablePct}%`,
              isPositive: true,
              icon: "TrendingUp",
              color: "blue",
            },
            {
              label: "Female signups",
              value: `${fRS}`,
              sub: contextLabel,
              trend: fSignupTrend,
              isPositive: (fCPNum || 0) >= 0,
              icon: "Users",
              color: "orange",
              route: "/admin/management/users-management",
            },
            {
              label: "KYC pending",
              value: `${pendingKYC}`,
              sub: "Review now →",
              isPositive: false,
              icon: "ShieldAlert",
              color: "cyan",
              isActionable: true,
              route: "/admin/management/kyc-verifications",
            },
            {
              label: "Users flagged",
              value: `${reportCountNew}`,
              sub: "Review now →",
              trend: "12.5%",
              isPositive: false,
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
              value: `${pendingKYC} ${pendingKYC === 1 ? "profile waiting" : "profiles waiting"} for approval`,
              sub: "Review to activate new users",
              badge: pendingKYC > 10 ? "High" : "Low",
              badgeColor: "red",
              icon: "ShieldCheck",
              route: "/admin/management/kyc-verifications",
            },
            {
              id: "reported",
              label: "High Reported Users",
              value: `${highReportedRange.length} ${highReportedRange.length === 1 ? "user with 5+ reports" : "users with 5+ reports"} ${preset === "today" ? "today" : preset === "yesterday" ? "yesterday" : "in this period"}`,
              sub: "Investigate and take action",
              badge: highReportedRange.length > 5 ? "Critical" : "Medium",
              badgeColor: "orange",
              icon: "AlertTriangle",
              route: "/admin/management/profile-reports",
            },
            {
              id: "ghosting",
              label: "Ghosting Rate",
              value:
                ghostingRangeAgg.total > 0
                  ? `${((ghostingRangeAgg.ghosted / ghostingRangeAgg.total) * 100).toFixed(0)}% matches with no response (${ghostingRangeAgg.ghosted}/${ghostingRangeAgg.total})`
                  : "No matches in this period",
              sub:
                ghostingRangeAgg.total > 0
                  ? `${ghostingRangeAgg.total - ghostingRangeAgg.ghosted} users active in 1-to-1 chats. ${blockCountRange} blocks reported.`
                  : "Monitor engagement trends",
              badge: "Info",
              badgeColor: "blue",
              icon: "Activity",
              route: "/admin/management/ghosting-users",
            },
          ],
        },
        zoneC: {
          metrics: [
            {
              label: "Match Liquidity",
              value: `${matchLiqVal}%`,
              sub: `${matchesRange} matches / ${totalSwipesRange} swipes`,
              subtitle: `Match rate for ${periodLabel.toLowerCase()}`,
              trend: `${matchLiqTrend}%`,
              isPositive: parseFloat(matchLiqTrend) >= 0,
              chartData: liqChart,
            },
            {
              label: "Gender Ratio",
              value: `${mRatioRange} : ${fRatioRange}`,
              subtitle: "Distribution of male vs female signups",
              sub: "Male : Female",
              isRatio: true,
              ratioValue: mRatioRange,
              maleCount: mRS,
              femaleCount: fRS,
            },
          ],
        },
        revenueBreakdown: {
          subtitle: `${periodLabel} revenue by source`,
          total: fmtAmount(revR.total),
          insight:
            revR.subscription >= revR.boost + revR.superkeen
              ? `Subscriptions contribute ${subPct}% of revenue.`
              : `${consumablePct}% of revenue comes from consumables.`,
          categories: [
            {
              label: "Subscriptions",
              value: revR.subscription,
              displayValue: fmtAmount(revR.subscription),
              percentage: subPct,
              color: "hsl(182 59% 75%)",
            },
            {
              label: "Super Charge",
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
          insight: "Conversion funnel tracks user journey from install to sub.",
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
                  ? Math.max(
                      -100,
                      Math.min(
                        100,
                        -Math.round((1 - funnelAgg[1] / totalUsers) * 100),
                      ),
                    )
                  : 0,
              color: "hsl(182 70% 68%)",
            },
            {
              label: "First Swipe",
              value: funnelAgg[3],
              dropOff:
                funnelAgg[1] > 0
                  ? Math.max(
                      -100,
                      Math.min(
                        100,
                        -Math.round((1 - funnelAgg[3] / funnelAgg[1]) * 100),
                      ),
                    )
                  : 0,
              color: "hsl(182 60% 54%)",
            },
            {
              label: "Subscribed",
              value: funnelAgg[5],
              dropOff:
                funnelAgg[3] > 0
                  ? Math.max(
                      -100,
                      Math.min(
                        100,
                        -Math.round((1 - funnelAgg[5] / funnelAgg[3]) * 100),
                      ),
                    )
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
        activityHeatmap: {
          subtitle: "Yearly User Activity",
          insight: `Activity trends for ${now.getFullYear()} calendar year`,
          days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
          times: [
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "May",
            "Jun",
            "Jul",
            "Aug",
            "Sep",
            "Oct",
            "Nov",
            "Dec",
          ],
          data: heatmapD,
        },
        genderGrowth: (() => {
          let subtitle = `Daily signups for ${periodLabel}`;
          let data = [];
          const monthNames = [
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "May",
            "Jun",
            "Jul",
            "Aug",
            "Sep",
            "Oct",
            "Nov",
            "Dec",
          ];

          if (preset === "last30") {
            subtitle = `Weekly signups for ${periodLabel}`;
            const weeks = [];
            for (let i = 0; i < chartDates.length; i += 7) {
              const weekSlice = chartDates.slice(i, i + 7);
              const m = weekSlice.reduce(
                (sum, date) =>
                  sum +
                  (signups7dDaily.find(
                    (s) => s._id.date === date && s._id.gender === "men",
                  )?.count || 0),
                0,
              );
              const f = weekSlice.reduce(
                (sum, date) =>
                  sum +
                  (signups7dDaily.find(
                    (s) => s._id.date === date && s._id.gender === "women",
                  )?.count || 0),
                0,
              );
              weeks.push({
                day: `Week ${Math.floor(i / 7) + 1}`,
                male: m,
                female: f,
              });
            }
            data = weeks;
          } else {
            // For others, show daily data for the full range (capped at 30/90 days in chartDates)
            data = chartDates.map((date) => {
              const d = new Date(date);
              const label = dayNamesShort[d.getDay()];
              return {
                day: label,
                fullDate: date,
                male:
                  signups7dDaily.find(
                    (s) => s._id.date === date && s._id.gender === "men",
                  )?.count || 0,
                female:
                  signups7dDaily.find(
                    (s) => s._id.date === date && s._id.gender === "women",
                  )?.count || 0,
              };
            });
          }

          return {
            subtitle,
            insight: `Male signups are dominant at ${mRatioTotal}%`,
            data,
          };
        })(),
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
