const mongoose = require("mongoose");
const SubscriptionConfig = require("../modules/subscription/models_v3/SubscriptionConfig");
require("dotenv").config();

async function seedDynamicFeatures() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB for seeding...");

        const config = await SubscriptionConfig.getOrCreate();

        const defaultFeatures = [
            {
                key: "seeWhoLikedYou",
                name: "See who liked you",
                description: "Unlock the ability to see everyone who likes you.",
                icon: "eye",
                isActive: true,
                isPremiumOnly: true
            },
            {
                key: "passport",
                name: "Passport",
                description: "Match with people anywhere in the world.",
                icon: "map-pin",
                isActive: true,
                isPremiumOnly: true
            },
            {
                key: "advancedFilters",
                name: "Advanced Filters",
                description: "Filter matches by more than just age and distance.",
                icon: "filter",
                isActive: true,
                isPremiumOnly: true
            },
            {
                key: "noAds",
                name: "Ad-Free Experience",
                description: "Enjoy using the app without any interruptions.",
                icon: "shield",
                isActive: true,
                isPremiumOnly: true
            }
        ];

        config.dynamicFeatures = defaultFeatures;
        await config.save();

        console.log("Successfully seeded dynamicFeatures into SubscriptionConfig!");
        process.exit(0);
    } catch (err) {
        console.error("Migration/Seeding failed:", err.message);
        process.exit(1);
    }
}

seedDynamicFeatures();
