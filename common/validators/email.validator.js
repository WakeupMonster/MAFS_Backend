const dns = require("dns").promises;

module.exports.validateEmailDomain = async (email) => {
  const domain = email.split("@")[1];

  if (!domain) return false;

  try {
    const records = await dns.resolveMx(domain);
    return records && records.length > 0;
  // eslint-disable-next-line no-unused-vars
  } catch (err) {
    return false;
  }
};