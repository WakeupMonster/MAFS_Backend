const ENUMS = require("../../config/enums");
const redis = require("redis");

const client = redis.createClient({ url: process.env.REDIS_URL || "redis://127.0.0.1:6379" });
client.connect().catch(console.error);

// Generic standardized response handlers
const sendSuccess = (res, data, source = "api") => res.json({ success: true, source, data });
const sendError = (res, status, code, message, errors = null) =>
  res.status(status).json({ success: false, code, message, errors });

module.exports.getAllEnums = async (req, res) => {
  try {
    const version = req.query.v || "1";
    const cacheKey = `profile_enums_v_${version}`;

    // 1. Redis se try fetch
    const cached = await client.get(cacheKey);
    if (cached) {
      return sendSuccess(res, JSON.parse(cached), "cache");
    }

    // 2. Enums ko optimized + duplicate free format me map karo
    const format = (list = []) => [...new Set(list.map(e => `${e.label}${e.emoji}`))];

    const data = {
      gender: format(ENUMS.gender),
      genderPreference: format(ENUMS.genderPreference),
      religion: format(ENUMS.religion),
      relationshipGoals: format(ENUMS.relationshipGoals),
      interests: format(ENUMS.interests)
    };

    // 3. Redis me cache (24h)
    await client.set(cacheKey, JSON.stringify(data), { EX: 86400 }).catch(console.error);

    return sendSuccess(res, data, "api");
  } catch (err) {
    console.error("enum load crash →", err);
    return sendError(res, 500, "ENUM_SERVER_ERROR", "failed loading enums");
  }
};
