const jwt = require("jsonwebtoken");
const User = require("../auth/auth.model");

// Returns user or null
module.exports = async function verifyTokenAndGetUser(token) {
  try {
    if (!token) return null;

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // decoded.id or decoded.userId depending on your JWT payload
    const user = await User.findById(decoded.id).lean();
    return user || null;
  } catch (err) {
    return null;
  }
};
