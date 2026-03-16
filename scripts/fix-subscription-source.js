/**
 * One-Time Migration Script
 * Fixes old admin-granted subscriptions that incorrectly defaulted to source: "STORE"
 * 
 * Usage: node scripts/fix-subscription-source.js
 */

const mongoose = require("mongoose");
require("dotenv").config();
const { connectWithRetry } = require("../config/database");

async function runMigration() {
    console.log("🔄 Connecting to database...");
    await connectWithRetry();

    const Subscription = mongoose.model("Subscription", new mongoose.Schema({}, { strict: false }));

    // Step 1: Fix old manual admin grants (that incorrectly defaulted to STORE)
    const adminResult = await Subscription.updateMany(
        {
            platform: "admin_granted",
            source: "STORE",
            grantReason: { $not: /milestone/i }
        },
        { $set: { source: "ADMIN" } }
    );
    console.log(`✅ Step 1: Fixed ${adminResult.modifiedCount} admin-granted subscriptions → source: "ADMIN"`);

    // Step 2: Fix old Giveaway/Milestone grants
    const giveawayResult = await Subscription.updateMany(
        {
            platform: "admin_granted",
            source: "STORE",
            grantReason: /milestone/i
        },
        { $set: { source: "GIVEAWAY" } }
    );
    console.log(`✅ Step 2: Fixed ${giveawayResult.modifiedCount} milestone subscriptions → source: "GIVEAWAY"`);

    // Verification: Count remaining admin_granted with source STORE (should be 0)
    const remaining = await Subscription.countDocuments({
        platform: "admin_granted",
        source: "STORE"
    });
    console.log(`\n📊 Verification: ${remaining} admin_granted records still have source "STORE" (should be 0)`);

    if (remaining > 0) {
        console.log("⚠️  Some records may not have grantReason set. Fixing remaining...");
        const fixRemaining = await Subscription.updateMany(
            {
                platform: "admin_granted",
                source: "STORE"
            },
            { $set: { source: "ADMIN" } }
        );
        console.log(`✅ Fixed remaining ${fixRemaining.modifiedCount} records → source: "ADMIN"`);
    }

    console.log("\n🎉 Migration complete!");
    await mongoose.disconnect();
    process.exit(0);
}

runMigration().catch(err => {
    console.error("❌ Migration failed:", err.message);
    process.exit(1);
});
