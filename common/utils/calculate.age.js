// Single source of truth for age calculation — delegates to the shared
// Australia/Sydney-aware calendar math in common/utils/time.js so every
// caller of `calculateAge` reports the same age, computed the same way.
const { calculateAge: calculateAgeAU } = require("./time");

const calculateAge = (dob) => {
  if (!dob) return null;
  const birthDate = new Date(dob);
  if (isNaN(birthDate.getTime())) return null; // ✅ Handle invalid dates
  return calculateAgeAU(dob);
};

module.exports = { calculateAge };
