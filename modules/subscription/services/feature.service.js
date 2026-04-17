const SubscriptionConfig = require("../models_v3/SubscriptionConfig");
const Subscription = require("../models/Subscription");
const logger = require("../utils/logger");

class FeatureService {
    /**
     * Gets all dynamic features and marks them as enabled/disabled for a specific user.
     * @param {string} userId - The user ID
     * @param {boolean} isPremium - Whether the user is currently premium
     * @returns {Array} List of features with enablement status
     */
    async getDynamicFeaturesForUser(userId, isPremium) {
        try {
            const config = await SubscriptionConfig.getOrCreate();

            // If dynamicFeatures array is empty, we return an empty list or some defaults
            if (!config.dynamicFeatures || config.dynamicFeatures.length === 0) {
                return [];
            }

            return config.dynamicFeatures.map(feature => {
                // Logic: 
                // 1. Feature must be globally isActive
                // 2. If it's isPremiumOnly, user must be isPremium
                const isEnabled = feature.isActive && (!feature.isPremiumOnly || isPremium);

                return {
                    key: feature.key,
                    name: feature.name,
                    description: feature.description,
                    icon: feature.icon,
                    isPremiumOnly: feature.isPremiumOnly,
                    enabled: isEnabled
                };
            });
        } catch (err) {
            logger.error("Error in getDynamicFeaturesForUser:", err.message);
            return [];
        }
    }
    /**
     * Checks if a user has access to a specific dynamic feature.
     * @param {string} userId 
     * @param {string} featureKey 
     * @returns {Promise<boolean>}
     */
    async hasFeature(userId, featureKey) {
        try {
            // 1. Get User's Premium Status
            const activeSub = await Subscription.findOne({
                userId,
                status: { $in: ['ACTIVE', 'CANCELLED'] },
                expiresAt: { $gt: new Date() }
            }).lean();

            const isPremium = !!activeSub;

            // 2. Get Global Config
            const config = await SubscriptionConfig.getOrCreate();
            const feature = config.dynamicFeatures.find(f => f.key === featureKey);

            if (!feature) {
                // If feature doesn't exist in DB, we default to false for safety
                return false;
            }

            // 3. Enforcement Logic
            return feature.isActive && (!feature.isPremiumOnly || isPremium);
        } catch (err) {
            logger.error(`Error checking feature ${featureKey}:`, err.message);
            return false;
        }
    }
}

module.exports = new FeatureService();
