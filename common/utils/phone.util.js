const crypto = require("crypto");

function normalizePhone(phone) {
  if (!phone || typeof phone !== "string") return null;

  // 1️⃣ Sabhi spaces, brackets aur hyphens hatao
  let cleaned = phone.replace(/[\s\-\(\)]/g, "");

  // 2️⃣ Agar user ne galti se +61 ke baad 0 laga diya (e.g. +610412...)
  if (cleaned.startsWith("+610")) {
    cleaned = "+61" + cleaned.substring(4);
  }
  // 3️⃣ Agar '0' se start hota hai, toh usko '+61' se replace karo
  else if (cleaned.startsWith("0")) {
    cleaned = "+61" + cleaned.substring(1);
  }
  // 4️⃣ Agar number mein '+' nahi hai (e.g. sirf 412... likha ho), toh '+61' prepend karo
  else if (!cleaned.startsWith("+")) {
    cleaned = "+61" + cleaned;
  }

  // Agar already +61412... jaisa hai ya koi testing number +1000.. hai, toh wo yahan theek hi rahega 
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