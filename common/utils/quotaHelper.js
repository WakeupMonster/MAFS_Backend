// // File: utils/quotaHelper.js

// const checkUserQuota = (sub, action) => {
//     // Limits Define karo
//     const MAX_LIKES = 30;
//     const MAX_SUPERLIKES = 3;

//     const isPremium = sub.planId !== 'free';

//     // 1. Like Check Logic
//     if (action === 'like') {
//         const canLike = isPremium || sub.dailyLikesUsed < MAX_LIKES;
//         return {
//             allowed: canLike,
//             remaining: isPremium ? 999 : Math.max(0, MAX_LIKES - sub.dailyLikesUsed),
//             total: MAX_LIKES
//         };
//     }

//     // 2. Superlike Check Logic
//     if (action === 'superlike') {
//         const totalAvailable = MAX_SUPERLIKES + (sub.superlikeBalance || 0);
//         const canSuperlike = sub.dailySuperlikesUsed < totalAvailable;
//         return {
//             allowed: canSuperlike,
//             remaining: Math.max(0, totalAvailable - sub.dailySuperlikesUsed),
//             total: MAX_SUPERLIKES
//         };
//     }

//     return { allowed: true };
// };

// module.exports = { checkUserQuota };



const checkUserQuota = (sub, action) => {
    const limits = sub.getLimits(); // Get limits based on planId

    if (action === 'like') {
        const canLike = sub.dailyLikesUsed < limits.dailyLikes;
        return {
            allowed: canLike,
            remaining: Math.max(0, limits.dailyLikes - sub.dailyLikesUsed),
            total: limits.dailyLikes
        };
    }

    if (action === 'superlike') {
        // Daily limit + purchased balance
        const totalLimit = limits.dailySuperlikes + (sub.superlikeBalance || 0);
        const canSuperlike = sub.dailySuperlikesUsed < totalLimit;
        return {
            allowed: canSuperlike,
            remaining: Math.max(0, totalLimit - sub.dailySuperlikesUsed),
            total: totalLimit
        };
    }

    return { allowed: true };
};

module.exports = { checkUserQuota };