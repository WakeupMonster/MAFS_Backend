const MasterData = require("../../modules/profile/master.model");
const redis = require("../../config/cache");

/**
 * Fetches all MasterData from DB or Redis and returns a grouped map.
 * Format: { categoryName: { itemValue: { id, label, subtitle, link } } }
 */

let localMasterDataMap = null;
let lastFetchTime = 0;
const MEMORY_CACHE_TTL = 5 * 60 * 1000; // 5 minutes in ms

const getMasterDataMap = async () => {
  try {
    const now = Date.now();
    // 1. Check Local Memory Cache (0ms latency)
    if (localMasterDataMap && (now - lastFetchTime < MEMORY_CACHE_TTL)) {
      return localMasterDataMap;
    }

    const cacheKey = "master_data_map_v1";

    // 2. Check Redis (Network latency)
    let cached = await redis.get(cacheKey);

    if (cached) {
      const parsed = typeof cached === "string" ? JSON.parse(cached) : cached;
      // Update local cache
      localMasterDataMap = parsed;
      lastFetchTime = now;
      return parsed;
    }

    // 3. Fallback to DB
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

    // Update both caches
    await redis.set(cacheKey, map, { EX: 3600 }); // 1 hour in Redis
    localMasterDataMap = map;
    lastFetchTime = now;

    return map;
  } catch (error) {
    console.error("Error in getMasterDataMap:", error);
    // If cache fails, return the last known good local map instead of empty object
    return localMasterDataMap || {};
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