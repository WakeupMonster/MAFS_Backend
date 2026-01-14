// modules/profile/profile.helpers.js

function calculateAge(dob) {
  if (!dob) return null;
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

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
