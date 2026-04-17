const SubscriptionConfig = require("../models_v3/SubscriptionConfig");
const logger = require("../utils/logger");

/**
 * Controller to handle Dynamic Premium Features from Admin Panel
 * This is kept separate from the main admin controller to ensure zero breakage and high clarity.
 */

// 1. List all dynamic features
exports.listFeatures = async (req, res, next) => {
    try {
        const config = await SubscriptionConfig.getOrCreate();
        return res.json({ 
            success: true, 
            data: config.dynamicFeatures || [] 
        });
    } catch (err) {
        next(err);
    }
};

// 2. Add or Update a feature
exports.upsertFeature = async (req, res, next) => {
    try {
        const { key, name, description, icon, isActive, isPremiumOnly } = req.body;

        if (!key || !name) {
            return res.status(400).json({ success: false, message: "Feature key and name are required." });
        }

        const config = await SubscriptionConfig.getOrCreate();
        
        // Check if feature already exists
        const featureIndex = config.dynamicFeatures.findIndex(f => f.key === key);

        const featureData = { key, name, description, icon, isActive, isPremiumOnly };

        if (featureIndex > -1) {
            // Update existing
            config.dynamicFeatures[featureIndex] = { ...config.dynamicFeatures[featureIndex], ...featureData };
        } else {
            // Add new
            config.dynamicFeatures.push(featureData);
        }

        config.updatedAt = new Date();
        await config.save();

        return res.json({ 
            success: true, 
            message: featureIndex > -1 ? "Feature updated" : "Feature added", 
            data: config.dynamicFeatures 
        });
    } catch (err) {
        next(err);
    }
};

// 3. Remove a feature
exports.deleteFeature = async (req, res, next) => {
    try {
        const { key } = req.params;
        const config = await SubscriptionConfig.getOrCreate();

        config.dynamicFeatures = config.dynamicFeatures.filter(f => f.key !== key);
        
        config.updatedAt = new Date();
        await config.save();

        return res.json({ 
            success: true, 
            message: "Feature removed successfully", 
            data: config.dynamicFeatures 
        });
    } catch (err) {
        next(err);
    }
};

// 4. Toggle Feature Status
exports.toggleFeature = async (req, res, next) => {
    try {
        const { key } = req.params;
        const { isActive } = req.body;

        const config = await SubscriptionConfig.getOrCreate();
        const feature = config.dynamicFeatures.find(f => f.key === key);

        if (!feature) {
            return res.status(404).json({ success: false, message: "Feature not found" });
        }

        feature.isActive = isActive !== undefined ? isActive : !feature.isActive;
        
        config.updatedAt = new Date();
        await config.save();

        return res.json({ 
            success: true, 
            message: `Feature ${feature.isActive ? 'enabled' : 'disabled'}`, 
            data: feature 
        });
    } catch (err) {
        next(err);
    }
};
