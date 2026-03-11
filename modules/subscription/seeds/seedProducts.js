const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables with absolute path to ensure robustness
dotenv.config({ path: path.join(__dirname, '../../../.env') });

const Product = require('../models_v3/Product');
const SubscriptionConfig = require('../models_v3/SubscriptionConfig');
const { connectWithRetry } = require('../../../config/database');

/**
 * Initial Catalog Data based on 'subscription-implementation-guide-97ba86 (3).md'
 * Section 3.1 & 3.2 Requirements fulfillment.
 */
const initialProducts = [
    // --- SUBSCRIPTIONS (Infinite or long-term access items) ---
    {
        productKey: "premium_1month",
        type: "SUBSCRIPTION",
        planType: "1_MONTH",
        durationDays: 30,
        displayName: "1 Month Premium",
        displayPrice: "$9.95",
        currency: "AUD",
        appleProductId: "com.keenasmustard.premium.1month",
        googleProductId: "com.keenasmustard.premium.1month",
        sortOrder: 1,
        isActive: true
    },
    {
        productKey: "premium_3month",
        type: "SUBSCRIPTION",
        planType: "3_MONTH",
        durationDays: 90,
        displayName: "3 Months Premium",
        displayPrice: "$24.00",
        currency: "AUD",
        appleProductId: "com.keenasmustard.premium.3month",
        googleProductId: "com.keenasmustard.premium.3month",
        sortOrder: 2,
        isActive: true
    },
    // --- CONSUMABLES: SUPER KEENS (Bucket 2 Walllet items) ---
    {
        productKey: "superkeen_1",
        type: "CONSUMABLE",
        consumableType: "SUPER_KEEN",
        quantity: 1,
        displayName: "1 Super Keen",
        displayPrice: "$1.00",
        currency: "AUD",
        appleProductId: "com.keenasmustard.superkeen.1",
        googleProductId: "com.keenasmustard.superkeen.1",
        sortOrder: 3,
        isActive: true
    },
    {
        productKey: "superkeen_5",
        type: "CONSUMABLE",
        consumableType: "SUPER_KEEN",
        quantity: 5,
        displayName: "5 Super Keens",
        displayPrice: "$3.50",
        currency: "AUD",
        appleProductId: "com.keenasmustard.superkeen.5",
        googleProductId: "com.keenasmustard.superkeen.5",
        sortOrder: 4,
        isActive: true
    },
    {
        productKey: "superkeen_10",
        type: "CONSUMABLE",
        consumableType: "SUPER_KEEN",
        quantity: 10,
        displayName: "10 Super Keens",
        displayPrice: "$6.00",
        currency: "AUD",
        appleProductId: "com.keenasmustard.superkeen.10",
        googleProductId: "com.keenasmustard.superkeen.10",
        sortOrder: 5,
        isActive: true
    },
    // --- CONSUMABLES: BOOSTS (Bucket 2 Wallet items) ---
    {
        productKey: "boost_1",
        type: "CONSUMABLE",
        consumableType: "BOOST",
        quantity: 1,
        displayName: "1 Boost",
        displayPrice: "$3.00",
        currency: "AUD",
        appleProductId: "com.keenasmustard.boost.1",
        googleProductId: "com.keenasmustard.boost.1",
        sortOrder: 6,
        isActive: true
    },
    {
        productKey: "boost_5",
        type: "CONSUMABLE",
        consumableType: "BOOST",
        quantity: 5,
        displayName: "5 Boosts",
        displayPrice: "$12.50",
        currency: "AUD",
        appleProductId: "com.keenasmustard.boost.5",
        googleProductId: "com.keenasmustard.boost.5",
        sortOrder: 7,
        isActive: true
    },
    {
        productKey: "boost_10",
        type: "CONSUMABLE",
        consumableType: "BOOST",
        quantity: 10,
        displayName: "10 Boosts",
        displayPrice: "$20.00",
        currency: "AUD",
        appleProductId: "com.keenasmustard.boost.10",
        googleProductId: "com.keenasmustard.boost.10",
        sortOrder: 8,
        isActive: true
    }
];

/**
 * Robust Seeding Engine
 * Handles connection retries, idempotency, and singleton configuration setup.
 */
async function runSeeder() {
    try {
        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) {
            throw new Error('[CRITICAL] MONGODB_URI not found in environment. Check root .env file.');
        }

        console.log('--- Phase 1: Subscription v3 Seeding ---');
        console.log('Connecting to database...');
        await connectWithRetry(mongoUri);
        console.log('Connected successfully.\n');

        // 1. Seed Products Catalog
        // Edge Case: Prevents duplicates by using productKey as unique identifier for upsert.
        console.log('Processing Products Catalog...');
        for (const prodData of initialProducts) {
            const updatedItem = await Product.findOneAndUpdate(
                { productKey: prodData.productKey },
                { $set: prodData }, // Uses $set to update existing fields or insert new ones
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );
            console.log(`[UPSERT] ${updatedItem.productKey} - ${updatedItem.displayName}`);
        }
        console.log('--- Products Seeding Complete ---\n');

        // 2. Seed Singleton Configurations
        // Edge Case: Ensures that even if DB is fresh, limits/rules exist before any user hits the API.
        console.log('Setting up Global Subscription Configuration...');
        const config = await SubscriptionConfig.getOrCreate();
        console.log(`[SINGLETON] Config document ensured. ID: ${config._id}`);
        console.log(`Status: Milestone First 1,000 Users is ${config.milestone.isActive ? 'ACTIVE' : 'INACTIVE'}`);

        console.log('\n✅ Phase 1 Foundation is 100% Ready for Production.');

        // Graceful exit
        setTimeout(() => {
            mongoose.connection.close();
            process.exit(0);
        }, 1000);

    } catch (err) {
        console.error('\n❌ SEEDING ERROR:', err.message);
        if (err.stack) console.error(err.stack);
        process.exit(1);
    }
}

// Global Rejection Handler for extra robustness
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

runSeeder();
