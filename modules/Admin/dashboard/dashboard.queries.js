/**
 * Database queries for the Admin Advanced Dashboard Metrics.
 */

/**
 * Categorizes products from the catalog.
 * @param {Array} allProducts Product list.
 * @returns {Object} Keys for BOOST and SUPER_KEEN consumable types.
 */
function getProductKeys(allProducts) {
  const getProductMatchKeys = (type) =>
    (allProducts || [])
      .filter((p) => p.consumableType === type)
      .flatMap((p) =>
        [p.productKey, p.appleProductId, p.googleProductId].filter(Boolean)
      );

  const boostKeys = getProductMatchKeys("BOOST");
  const superkeenKeys = getProductMatchKeys("SUPER_KEEN");

  return { boostKeys, superkeenKeys };
}

/**
 * Fetches all metric components in parallel.
 * @param {Object} models Mongoose models registry.
 * @param {Object} dateParams Pre-calculated date ranges.
 * @returns {Promise<Object>} Aggregated dashboard data.
 */
async function fetchDashboardData(models, dateParams) {
  const {
    User,
    Profile,
    Match,
    Swipe,
    ChatMessage,
    Transaction,
    Report,
  } = models;

  const { startDate, endDate, prevStartDate, prevEndDate, startOfYear, last30d, ghostingThresholdDate } = dateParams;

  const [
    userCountsFacet, profileCountsFacet, totalMatchesCount, reportsFacet,
    deepConvoAggCount, ghostedUsersCount, swipesFacet, matchesFacet, matches7dDaily, swipes7dDaily, heatmapAgg,
    revenueFacet, signupGenderFacet, funnelCompletedProfiles, funnelSwipersCount,
    funnelSubscribersCount, highReportedRange
  ] = await Promise.all([
    // 1. User status counts in one $facet
    User.aggregate([
      { $match: { role: "USER" } },
      {
        $facet: {
          total: [{ $count: "n" }],
          // active: [{ $match: { lastLoginAt: { $gte: startDate, $lte: endDate }, accountStatus: "active" } }, { $count: "n" }],
          // premium: [{ $match: { isPremium: true } }, { $count: "n" }],
          banned: [{ $match: { accountStatus: "banned" } }, { $count: "n" }],
          suspended: [{ $match: { accountStatus: "suspended" } }, { $count: "n" }],
          deactivated: [{ $match: { accountStatus: "deactivated" } }, { $count: "n" }],
          deleted: [{ $match: { accountStatus: "deleted" } }, { $count: "n" }],
          activeAllTime: [{ $match: { accountStatus: "active" } }, { $count: "n" }],
        },
      },
    ]).then((r) => r[0] || {}),

    // 2. Profile/KYC counts in one $facet
    Profile.aggregate([
      {
        $facet: {
          pending: [{ $match: { "verification.status": "pending" } }, { $count: "n" }],
          // Photo quality scan
          quality: [
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                good: {
                  $sum: {
                    $cond: [{ $and: [{ $gte: [{ $size: { $ifNull: ["$photos", []] } }, 4] }, { $and: [{ $ne: ["$about", null] }, { $ne: ["$about", ""] }] }] }, 1, 0],
                  },
                },
              },
            },
          ],
        },
      },
    ]).then((r) => r[0] || {}),

    // 3. Total matches (all time)
    Match.countDocuments({}),

    // 4. Reports in range
    Report.aggregate([
      {
        $facet: {
          current: [
            { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
            { $sort: { createdAt: -1 } },
            { $group: { _id: "$reportedId", status: { $first: "$status" } } },
            { $match: { status: "new" } },
            { $count: "n" },
          ],
          prev: [
            { $match: { createdAt: { $gte: prevStartDate, $lt: startDate } } },
            { $sort: { createdAt: -1 } },
            { $group: { _id: "$reportedId", status: { $first: "$status" } } },
            { $match: { status: "new" } },
            { $count: "n" },
          ],
        },
      },
    ]).then((r) => r[0] || {}),

    // 5. Deep conversations (30d baseline)
    ChatMessage.aggregate([
      { $match: { createdAt: { $gte: last30d } } },
      { $group: { _id: "$matchId", count: { $sum: 1 } } },
      { $match: { count: { $gte: 20 } } },
      { $count: "deepTotal" },
    ]).then((r) => r[0]?.deepTotal || 0),

    // 6. Ghosted users
    User.countDocuments({
      role: "USER",
      isFake: { $ne: true },
      accountStatus: "active",
      createdAt: { $lt: ghostingThresholdDate },
      $or: [
        { lastLoginAt: { $lt: ghostingThresholdDate } },
        { lastLoginAt: null },
      ],
    }).catch(() => 0),

    // 7. Swipe counts (current, prev, superkeen, normal merged)
    Swipe.aggregate([
      { $match: { createdAt: { $gte: prevStartDate, $lte: endDate }, action: { $in: ["like", "superlike"] } } },
      {
        $facet: {
          currentLikes: [
            { $match: { createdAt: { $gte: startDate }, action: "like" } },
            { $count: "n" },
          ],
          currentSuperlikes: [
            { $match: { createdAt: { $gte: startDate }, action: "superlike" } },
            { $count: "n" },
          ],
          prev: [
            { $match: { createdAt: { $lt: startDate } } },
            { $count: "n" },
          ],
          superkeenSwipes: [
            { $match: { createdAt: { $gte: startDate }, action: "superlike" } },
            { $count: "n" },
          ],
          normalSwipes: [
            { $match: { createdAt: { $gte: startDate }, action: "like" } },
            { $count: "n" },
          ],
        },
      },
    ]).then((r) => r[0] || {}),

    // 8. Match counts (current, prev, superkeen matches, normal matches merged)
    Match.aggregate([
      { $match: { createdAt: { $gte: prevStartDate, $lte: endDate } } },
      {
        $facet: {
          current: [{ $match: { createdAt: { $gte: startDate } } }, { $count: "n" }],
          prev: [{ $match: { createdAt: { $lt: startDate } } }, { $count: "n" }],
          superkeenMatches: [{ $match: { createdAt: { $gte: startDate }, isSuperMatch: true } }, { $count: "n" }],
          normalMatches: [{ $match: { createdAt: { $gte: startDate }, isSuperMatch: { $ne: true } } }, { $count: "n" }],
        },
      },
    ]).then((r) => r[0] || {}),

    // 9. Match daily chart
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

    // 10. Swipe daily chart
    Swipe.aggregate([
      {
        $match: { createdAt: { $gte: startDate, $lte: endDate }, action: { $in: ["like", "superlike"] } },
      },
      {
        $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } },
      },
      { $sort: { _id: 1 } },
    ]).catch(() => []),

    // 11. Activity heatmap
    Swipe.aggregate([
      { $match: { createdAt: { $gte: startOfYear } } },
      { $addFields: { _hour: { $hour: "$createdAt" } } },
      {
        $addFields: {
          _slot: {
            $switch: {
              branches: [
                { case: { $and: [{ $gte: ["$_hour", 3] }, { $lt: ["$_hour", 6] }] }, then: 0 },
                { case: { $and: [{ $gte: ["$_hour", 6] }, { $lt: ["$_hour", 9] }] }, then: 1 },
                { case: { $and: [{ $gte: ["$_hour", 9] }, { $lt: ["$_hour", 12] }] }, then: 2 },
                { case: { $and: [{ $gte: ["$_hour", 12] }, { $lt: ["$_hour", 15] }] }, then: 3 },
                { case: { $and: [{ $gte: ["$_hour", 15] }, { $lt: ["$_hour", 18] }] }, then: 4 },
                { case: { $and: [{ $gte: ["$_hour", 18] }, { $lt: ["$_hour", 21] }] }, then: 5 },
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
          _id: { date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, slot: "$_slot" },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.date": 1, "_id.slot": 1 } },
    ]).catch(() => []),

    // 12. Revenue: current + prev merged
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
        },
      },
    ]).then((r) => r[0] || {}),

    // 13. Signup gender stats
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
    ]).then((r) => r[0] || {}),

    // 14. Funnel: profile complete count
    Profile.countDocuments({
      isMandatoryComplete: true,
      createdAt: { $gte: startDate, $lte: endDate },
    }),

    // 15. Funnel: unique swipers
    Swipe.aggregate([
      { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: "$swiperId" } },
      { $count: "n" },
    ]).then((r) => r[0]?.n || 0),

    // 16. Funnel: unique subscribers in range
    Transaction.aggregate([
      {
        $match: {
          occurredAt: { $gte: startDate, $lte: endDate },
          eventType: { $in: ["PURCHASE", "RENEW"] },
        },
      },
      { $group: { _id: "$userId" } },
      { $count: "n" },
    ]).then((r) => r[0]?.n || 0),

    // 17. High reported users in range
    Report.aggregate([
      { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: "$reportedId", count: { $sum: 1 } } },
      { $match: { count: { $gte: 5 } } },
    ]),
  ]);

  return {
    userCountsFacet,
    profileCountsFacet,
    totalMatchesCount,
    reportsFacet,
    deepConvoAggCount,
    ghostedUsersCount,
    swipesFacet,
    matchesFacet,
    matches7dDaily,
    swipes7dDaily,
    heatmapAgg,
    revenueFacet,
    signupGenderFacet,
    funnelCompletedProfiles,
    funnelSwipersCount,
    funnelSubscribersCount,
    highReportedRange,
  };
}

module.exports = { getProductKeys, fetchDashboardData };
