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



// // common/utils/phone.util.js
// function normalizePhone(phone) {
//   if (!phone || typeof phone !== "string") return null;

//   // 1️⃣ Sabhi spaces, brackets aur hyphens hatao
//   let cleaned = phone.replace(/[\s\-\(\)]/g, "");

//   // 2️⃣ Agar number local Australian format mein hai start with '04'
//   if (cleaned.startsWith("0")) {
//     cleaned = "61" + cleaned.substring(1); // '0' hatakar '61' prepend karo
//   }
//   // 3️⃣ Agar '0' ke bina sirf 9 digits enter kiye hain (eg. 412345678)
//   else if (cleaned.length === 9 && cleaned.startsWith("4")) {
//     cleaned = "61" + cleaned;
//   }

//   // 4️⃣ Ensure it starts with '+'
//   if (!cleaned.startsWith("+")) {
//     cleaned = `+${cleaned}`;
//   }

//   return cleaned; // Hamesha +61412345678 format dega
// }
