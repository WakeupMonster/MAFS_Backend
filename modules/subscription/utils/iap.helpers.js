const crypto = require("crypto");

const generatePayloadHash = (payload) => {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex");
};

const generateIdempotencyKey = (platform, eventType, identifier) => {
  return `${platform}_${eventType}_${identifier}`;
};

const getPlanType = (productId) => {
  if (!productId) return "unknown";
  if (productId.includes("weekly")) return "weekly";
  if (productId.includes("monthly")) return "monthly";
  if (productId.includes("yearly")) return "yearly";
  if (productId.includes("lifetime")) return "lifetime";
  return "unknown";
};

const msToDate = (ms) => {
  if (!ms) return null;
  return new Date(parseInt(ms));
};

const safeJsonParse = (str) => {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
};

const decodeBase64 = (str) => {
  try {
    return Buffer.from(str, "base64").toString("utf8");
  } catch {
    return null;
  }
};

const GOOGLE_EVENT_MAP = {
  1: "RECOVERED",
  2: "RENEWED",
  3: "CANCELED",
  4: "PURCHASED",
  5: "ON_HOLD",
  6: "IN_GRACE_PERIOD",
  7: "RESTARTED",
  8: "PRICE_CHANGE_CONFIRMED",
  9: "DEFERRED",
  12: "REVOKED",
  13: "EXPIRED",
  20: "PAUSED",
};

module.exports = {
  generatePayloadHash,
  generateIdempotencyKey,
  getPlanType,
  msToDate,
  safeJsonParse,
  decodeBase64,
  GOOGLE_EVENT_MAP,
};