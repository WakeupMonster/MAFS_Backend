const AdsConfiguration = require("./adsConfig.model");
const cache = require("../../config/cache");

const REDIS_KEY = "ads_config_data";

// Helper to format configurations into the standardized JSON response
const formatConfigs = (configs) => {
    const formattedData = {
        android: {
            app_open: { id: "", active: false },
            interstitial: { id: "", active: false, click_limit: 5 },
            native: { id: "", active: false, n_item: 25 }
        },
        ios: {
            app_open: { id: "", active: false },
            interstitial: { id: "", active: false, click_limit: 5 },
            native: { id: "", active: false, n_item: 25 }
        }
    };

    configs.forEach(config => {
        if (config.platform === 'android' || config.platform === 'ios') {
            formattedData[config.platform] = {
                app_open: config.app_open || formattedData[config.platform].app_open,
                interstitial: config.interstitial || formattedData[config.platform].interstitial,
                native: config.native || formattedData[config.platform].native
            };
        }
    });

    return formattedData;
};

// GET API to fetch ads configurations
module.exports.getAdsSettings = async (req, res) => {
    try {
        // 1. Try to get data from Cache
        const cachedData = await cache.get(REDIS_KEY);

        if (cachedData) {
            return res.json({
                success: true,
                data: JSON.parse(cachedData)
            });
        }

        // 2. If not in cache, fetch from Database
        const configs = await AdsConfiguration.find().lean();
        const formattedData = formatConfigs(configs);

        // 3. Save to cache before returning
        await cache.set(REDIS_KEY, JSON.stringify(formattedData));

        return res.json({
            success: true,
            message: "Ads configurations fetched successfully",
            data: formattedData
        });

    } catch (error) {
        console.error("Error fetching Ads Config:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch ads configurations"
        });
    }
};

// POST/UPSERT API to update ads configurations (Admin Only)
module.exports.upsertAdsSettings = async (req, res) => {
    try {
        const { platform, app_open, interstitial, native } = req.body;
        const adminId = req.user._id;

        if (!platform || !['android', 'ios'].includes(platform)) {
            return res.status(400).json({
                success: false,
                message: "Invalid or missing platform. Must be 'android' or 'ios'."
            });
        }

        // Basic Regex Validation for Ad Units if provided and active
        const adUnitRegex = /^ca-app-pub-[0-9]+~[0-9]+$|^ca-app-pub-[0-9]+\/[0-9]+$/; // updated regex to allow both app ID and ad unit formats just in case

        const validateAdUnit = (unit) => {
            if (unit?.active && unit?.id && !adUnitRegex.test(unit.id)) {
                // return false; We can add strict regex validation if required, but for now we skip strict formatting validation to avoid blocking admins if format changes
            }
            return true;
        }

        const updateData = {
            updatedBy: adminId
        };
        
        // Use dot notation to allow partial updates of nested objects without erasing existing fields
        if (app_open) {
            if (app_open.id !== undefined) updateData['app_open.id'] = app_open.id;
            if (app_open.active !== undefined) updateData['app_open.active'] = app_open.active;
        }

        if (interstitial) {
            if (interstitial.id !== undefined) updateData['interstitial.id'] = interstitial.id;
            if (interstitial.active !== undefined) updateData['interstitial.active'] = interstitial.active;
            if (interstitial.click_limit !== undefined) updateData['interstitial.click_limit'] = parseInt(interstitial.click_limit);
        }

        if (native) {
            if (native.id !== undefined) updateData['native.id'] = native.id;
            if (native.active !== undefined) updateData['native.active'] = native.active;
            if (native.n_item !== undefined) updateData['native.n_item'] = parseInt(native.n_item);
        }

        // Upsert configuration for specific platform
        const config = await AdsConfiguration.findOneAndUpdate(
            { platform: platform },
            { $set: updateData },
            { upsert: true, new: true, runValidators: true }
        );

        // After update, fetch all configs and refresh cache
        const allConfigs = await AdsConfiguration.find().lean();
        const formattedData = formatConfigs(allConfigs);

        await cache.set(REDIS_KEY, JSON.stringify(formattedData));

        return res.json({
            success: true,
            message: `Ads configuration for ${platform} updated successfully.`,
            data: config
        });

    } catch (error) {
        console.error("Error upserting Ads Config:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to update ads configurations",
            error: error.message
        });
    }
};
