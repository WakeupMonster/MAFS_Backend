// modules/profile/profile.helpers.js

// Delegates to the single shared, Australia/Sydney-aware age calculation
// in common/utils/calculate.age.js — was previously a separate fixed-ms-divisor
// implementation that could disagree by a year with the rest of the app.
const { calculateAge } = require("../../common/utils/calculate.age");

function calculateCompletion(profile) {
  const fields = [
    profile.nickname,
    profile.dob,
    profile.gender,
    profile.height,
    profile.about,
    profile.jobTitle,
    profile.company,
    profile.school
  ];

  const filled = fields.filter(Boolean).length;
  return Math.round((filled / fields.length) * 100);
}

module.exports = {
  calculateAge,
  calculateCompletion
};
