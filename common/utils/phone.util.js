const crypto = require("crypto");

function normalizePhone(phone) {
  if (!phone) return null;

  return phone
    .replace(/\s+/g, "")
    .replace(/-/g, "")
    .replace(/\(/g, "")
    .replace(/\)/g, "")
    .replace(/^0+/, "")
    .startsWith("+")
    ? phone
    : `+${phone}`;
}


function hashPhone(phone) {
  return crypto
    .createHash("sha256")
    .update(phone)
    .digest("hex");
}

module.exports = {
  normalizePhone,
  hashPhone
};