/**
 * QUEUED PRIZE DELIVERY WORKER
 * 
 * Purpose: Automatically delivers FREE_PREMIUM prizes that were put on hold
 * because the winner had an active Apple/Google subscription at claim time.
 * 
 * Runs daily via CRON. Checks each QUEUED prize and:
 *  - DELIVERS if user's store subscription has expired and account is active
 *  - FORFEITS if user is banned or deleted
 *  - SKIPS if user is suspended (will retry next day)
 *  - SKIPS if user still has active store subscription (will retry next day)
 */

const GiveawayWinHistory = require("../../modules/Admin/giveaways/giveawayWinHistory.model");
const Prize = require("../../modules/Admin/giveaways/prize.model");
const User = require("../../modules/auth/auth.model");
const Subscription = require("../../modules/subscription/models/Subscription");
const subscriptionService = require("../../modules/subscription/services/subscription.service");
const utils = require("../../modules/auth/auth.utils");
const { queuedPremiumPrizeEmailTemplate } = require("../../common/utils/queuedPremiumPrizeEmailTemplate");

const LOG_PREFIX = "[QUEUED-PRIZE]";

module.exports = async function processQueuedPrizes() {
  console.log(`${LOG_PREFIX} 🚀 Worker started at: ${new Date().toISOString()}`);

  try {
    // 1. Fetch all QUEUED prizes (only FREE_PREMIUM can be QUEUED)
    const queuedWins = await GiveawayWinHistory.find({
      deliveryStatus: "QUEUED"
    }).lean();

    if (!queuedWins.length) {
      console.log(`${LOG_PREFIX} ✅ No queued prizes to process.`);
      return;
    }

    console.log(`${LOG_PREFIX} 📋 Found ${queuedWins.length} queued prize(s). Processing...`);

    let delivered = 0;
    let forfeited = 0;
    let skipped = 0;

    for (const win of queuedWins) {
      try {
        await processSingleQueuedPrize(win);
        // Count result based on updated status
        const updated = await GiveawayWinHistory.findById(win._id).select("deliveryStatus").lean();
        if (updated?.deliveryStatus === "DELIVERED") delivered++;
        else if (updated?.deliveryStatus === "FORFEITED") forfeited++;
        else skipped++;
      } catch (err) {
        skipped++;
        console.error(`${LOG_PREFIX} ❌ Error processing winId=${win._id}: ${err.message}`);
        // One user failing must NOT crash the loop — continue to next user
      }
    }

    console.log(`${LOG_PREFIX} ✅ Done. Delivered: ${delivered} | Forfeited: ${forfeited} | Skipped: ${skipped}`);

  } catch (err) {
    console.error(`${LOG_PREFIX} ❌ Fatal worker error: ${err.message}`);
  }
};


/**
 * Processes a single queued prize with all edge case handling.
 */
async function processSingleQueuedPrize(win) {
  const userId = win.userId;

  // ─── STEP 1: User Existence Check ───
  const user = await User.findById(userId).select("accountStatus email").lean();

  if (!user) {
    await forfeitPrize(win._id, "User account not found (deleted)");
    return;
  }

  // ─── STEP 2: Account Status Check ───
  const { accountStatus } = user;

  // BANNED → Forfeit permanently
  if (accountStatus === "banned") {
    await forfeitPrize(win._id, "User account is banned");
    return;
  }

  // DEACTIVATED / DELETED → Forfeit permanently
  if (accountStatus === "deactivated" || accountStatus === "deleted") {
    await forfeitPrize(win._id, `User account is ${accountStatus}`);
    return;
  }

  // SUSPENDED → Skip today, retry tomorrow
  if (accountStatus === "suspended") {
    console.log(`${LOG_PREFIX} ⏸️ Skipping userId=${userId} (suspended). Will retry tomorrow.`);
    return;
  }

  // ─── STEP 3: Store Subscription Check ───
  // Check if user still has an active Apple/Google (Store) subscription
  const activeStoreSub = await Subscription.findOne({
    userId: userId,
    platform: { $in: ["ios", "android"] },
    status: { $in: ["ACTIVE", "CANCELLED"] },
    autoRenew: true,
    expiresAt: { $gt: new Date() }
  }).lean();

  if (activeStoreSub) {
    // Still has active store sub — skip, will check again tomorrow
    console.log(`${LOG_PREFIX} ⏸️ Skipping userId=${userId} (active store sub expires: ${activeStoreSub.expiresAt}). Will retry.`);
    return;
  }

  // ─── STEP 4: Prize Validation ───
  const prize = await Prize.findById(win.prizeId).lean();

  if (!prize) {
    await forfeitPrize(win._id, "Prize record not found in database");
    return;
  }

  if (prize.type !== "FREE_PREMIUM") {
    // Safety check: Only FREE_PREMIUM should ever be QUEUED
    await forfeitPrize(win._id, `Invalid prize type for queue: ${prize.type}`);
    return;
  }

  // ─── STEP 5: Deliver the Prize ───
  console.log(`${LOG_PREFIX} 🎁 Delivering queued prize to userId=${userId} (${prize.title})`);

  await subscriptionService.handleGiveawayGrant(
    userId.toString(),
    prize.durationInDays,
    prize.planType,
    prize.title,
    prize._id
  );

  // Update win history
  await GiveawayWinHistory.updateOne(
    { _id: win._id },
    {
      deliveryStatus: "DELIVERED",
      deliveredAt: new Date(),
      deliveryNotes: "Auto-delivered by queue worker after store subscription expired"
    }
  );

  // ─── STEP 6: Send Notification Email ───
  const emailToSend = win.claimEmail || user.email;

  if (emailToSend) {
    try {
      const expiresAt = new Date(Date.now() + (prize.durationInDays || 30) * 24 * 60 * 60 * 1000);
      const expiryStr = expiresAt.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });

      await utils.sendEmail(
        emailToSend,
        "🎉 Your Free Premium Has Been Activated!",
        queuedPremiumPrizeEmailTemplate({
          prizeTitle: prize.title,
          planType: prize.planType,
          durationInDays: prize.durationInDays,
          expiryStr,
        })
      );
      console.log(`${LOG_PREFIX} 📧 Email sent to ${emailToSend}`);
    } catch (emailErr) {
      // Email failure should NOT roll back the delivery
      console.error(`${LOG_PREFIX} ⚠️ Email failed for userId=${userId}: ${emailErr.message}`);
    }
  }

  console.log(`${LOG_PREFIX} ✅ Successfully delivered queued prize to userId=${userId}`);
}


/**
 * Marks a prize as FORFEITED with a human-readable reason.
 */
async function forfeitPrize(winId, reason) {
  await GiveawayWinHistory.updateOne(
    { _id: winId },
    {
      deliveryStatus: "FORFEITED",
      forfeitReason: reason
    }
  );
  console.log(`${LOG_PREFIX} 🚫 Forfeited winId=${winId} | Reason: ${reason}`);
}
