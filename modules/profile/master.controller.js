/* eslint-disable no-unused-vars */
// /* eslint-disable no-unused-vars */
// const MasterData = require("./master.model");

// // 1. Get All Enums for Frontend (The Master API)
// module.exports.getAppMetadata = async (req, res) => {
//   try {
//     // Lean use karne se query 5x fast ho jati hai
//     const allData = await MasterData.find().select("category label value").lean();

//     // Data ko group karna category wise
//     const grouped = allData.reduce((acc, item) => {
//       if (!acc[item.category]) acc[item.category] = [];
//       acc[item.category].push({ label: item.label, value: item.value });
//       return acc;
//     }, {});

//     res.status(200).json({
//       success: true,
//       data: grouped
//     });
//   } catch (err) {
//     res.status(500).json({ success: false, message: "Metadata fetch failed" });
//   }
// };

// // 2. Admin: Bulk Add (Figma ki saari list ek sath daalne ke liye)
// module.exports.adminBulkAdd = async (req, res) => {
//   try {
//     const { items } = req.body; 
//     // items example: [{category: 'music', label: 'Pop 🎵', value: 'pop'}, ...]
//     await MasterData.insertMany(items, { ordered: false });
//     res.status(201).json({ success: true, message: "Items added" });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// };


const MasterData = require("./master.model");
const AppSettings = require("../AppConfiguration/appSettings.model");
const { getFormattedAdsConfig } = require("../AppConfiguration/adsConfig.controller");

module.exports.getAppConfig = async (req, res) => {
  try {
    const SubscriptionConfig = require("../subscription/models_v3/SubscriptionConfig");

    const [allItems, versionConfig, generalSettings, subConfig, adsConfig] = await Promise.all([
      MasterData.find().sort({ order: 1 }).lean(),
      AppSettings.findOne({ key: "app_version_config" }).lean(),
      AppSettings.findOne({ key: "general" }).lean(),
      SubscriptionConfig.getOrCreate(),
      getFormattedAdsConfig().catch((err) => {
        console.error("Ads config fetch error in getAppConfig:", err);
        return {
          android: { app_open: { id: "", active: false }, interstitial: { id: "", active: false }, native: { id: "", active: false } },
          ios: { app_open: { id: "", active: false }, interstitial: { id: "", active: false }, native: { id: "", active: false } }
        };
      }),
    ]);

    // 1. Grouping Logic
    const groupedData = allItems.reduce((acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];

      const itemObj = {
        id: item.value, // 
        label: item.label
      };

      // Agar subtitle hai toh hi add karo
      if (item.subtitle) itemObj.subtitle = item.subtitle;
      if (item.link) itemObj.link = item.link

      acc[item.category].push(itemObj);
      return acc;
    }, {});

    // 2. Extract API Keys from groupedData if they exist (added via bulkAdd)
    const dbApiKeys = {};
    if (groupedData.apiKeys) {
      groupedData.apiKeys.forEach((keyItem) => {
        dbApiKeys[keyItem.label] = keyItem.id; // label is key name, id is the value
      });
      // Remove from groupedData so it's only in config
      delete groupedData.apiKeys;
    }

    const config = {
      distance: { min: 1, max: 500, unit: "km" },
      age: { min: 18, max: 60 }
    };

    // 3. Version and Store Links from AppSettings (fetched above in Promise.all)
    const version = versionConfig?.value || {
      ios: {
        minSupported: "1.0.0",
        latest: "1.0.0",
        forceUpgrade: false,
        message: "A new version is available with bug fixes and improvements."
      },
      android: {
        minSupported: "1.0.0",
        latest: "1.0.0",
        forceUpgrade: false,
        message: "A new version is available with bug fixes and improvements."
      }
    };

    const storeLinks = {
      ios: generalSettings?.value?.appStoreUrl || "https://apps.apple.com/",
      android: generalSettings?.value?.playStoreUrl || "https://play.google.com/store"
    };

    // 4. Dynamic Premium Features (subConfig fetched above in Promise.all)
    const premiumFeatures = subConfig.dynamicFeatures ? subConfig.dynamicFeatures.map(feature => ({
      key: feature.key,
      name: feature.name,
      description: feature.description,
      icon: feature.icon,
      isPremiumOnly: feature.isPremiumOnly,
      isActive: feature.isActive,
      enabled: false // Default for config API. Actual status is provided via /subscription/status
    })) : [];

    // 5. Ads Configuration (fetched above in Promise.all, with the same fallback)

    return res.status(200).json({
      success: true,
      message: "App configuration fetched successfully",
      data: {
        ...groupedData,
        apiKeys: {
          googlePlaces: dbApiKeys.googlePlaces || process.env.GOOGLE_PLACES_API_KEY || "YOUR_GOOGLE_API_KEY",
          giphy: dbApiKeys.giphy || process.env.GIPHY_API_KEY || "YOUR_GIPHY_API_KEY"
        },
        config: config,
        version: version,
        storeLinks: storeLinks,
        PremiumFeatures: premiumFeatures,
        ads: adsConfig
      }
    });
  } catch (err) {
    console.error("getAppConfig error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};



module.exports.bulkAddMasterData = async (req, res) => {
  try {
    let { items, apiKeys } = req.body;

    // Agar apiKeys object hai toh use items mein convert kar do
    if (apiKeys && typeof apiKeys === "object") {
      if (!items) items = [];
      Object.entries(apiKeys).forEach(([key, value]) => {
        items.push({
          category: "apiKeys",
          label: key,
          value: value,
        });
      });
    }

    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ success: false, message: "Invalid data format" });
    }

    // Auto-assign order from array index if not provided
    items = items.map((item, index) => ({
      ...item,
      order: item.order !== undefined ? item.order : index
    }));

    // "bulkWrite" use karna best hai production mein speed ke liye
    const operations = items.map((item) => ({
      updateOne: {
        filter: { category: item.category, value: item.value, link: item.link },
        update: { $set: item },
        upsert: true, // Agar nahi mila toh create kar dega
      },
    }));

    await MasterData.bulkWrite(operations);

    res.status(201).json({
      success: true,
      message: `${items.length} items processed and updated in database!`,
    });
  } catch (err) {
    console.error("Bulk Add Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};