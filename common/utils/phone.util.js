const crypto = require("crypto");

function normalizePhone(phone) {
  // 🛡️ Defensive check
  if (!phone || typeof phone !== "string") return null;

  // 1️⃣ Clean phone
  let cleaned = phone
    .trim()
    .replace(/\s+/g, "")
    .replace(/[-()]/g, "")
    .replace(/^0+/, "");

  if (!cleaned.startsWith("+")) {
    cleaned = `+${cleaned}`;
  }

  return cleaned;
}

function hashPhone(phone) {
  if (!phone || typeof phone !== "string") return null;

  return crypto
    .createHash("sha256")
    .update(phone)
    .digest("hex");
}

module.exports = {
  normalizePhone,
  hashPhone
};