const MasterData = require("../../modules/profile/master.model");
const redis = require("../../config/cache");

/**
 * Fetches all MasterData from DB or Redis and returns a grouped map.
 * Format: { categoryName: { itemValue: { id, label, subtitle, link } } }
 */

const getMasterDataMap = async () => {
  try {
    const cacheKey = "master_data_map_v1";
    let cached = await redis.get(cacheKey);

    if (cached) {
      // safeGet already handles JSON.parse if it was a string, 
      // but let's be extra safe based on config/cache.js implementation
      return typeof cached === "string" ? JSON.parse(cached) : cached;
    }

    const allItems = await MasterData.find().lean();
    const map = {};

    allItems.forEach((item) => {
      const category = item.category;
      if (!map[category]) map[category] = {};

      map[category][item.value] = {
        id: item.value,
        label: item.label,
        ...(item.subtitle && { subtitle: item.subtitle }),
        ...(item.link && { link: item.link }),
      };
    });

    await redis.set(cacheKey, map, { EX: 3600 }); // 1 hour
    return map;
  } catch (error) {
    console.error("Error in getMasterDataMap:", error);
    return {};
  }
};

/**
 * Maps IDs to full master data objects
 * @param {string|string[]} ids - Single ID or array of IDs
 * @param {string} category - Category name in MasterData
 * @param {Object} masterMap - The map returned by getMasterDataMap
 */
const mapIdsToLabels = (ids, category, masterMap) => {
  if (!ids || (Array.isArray(ids) && ids.length === 0)) {
    return Array.isArray(ids) ? [] : null;
  }

  if (!masterMap || !masterMap[category]) {
    // If no map, return original ID/IDs as fallback
    return ids;
  }

  const categoryMap = masterMap[category];

  if (Array.isArray(ids)) {
    return ids.map((id) => (categoryMap[id] ? categoryMap[id].label : id));
  }

  return categoryMap[ids] ? categoryMap[ids].label : ids;
};

module.exports = {
  getMasterDataMap,
  mapIdsToLabels,
};
