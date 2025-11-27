const User = require("../auth/auth.model");

const checkPhoneVerified = async (req, res, next) => {
  const { phone } = req.body;
  const user = await User.findOne({ phone });
  
  if (user?.isPhoneVerified) {
    return res.status(400).json({
      success: false,
      code: 'ALREADY_VERIFIED',
      message: 'This phone number is already verified'
    });
  }
  next();
};

const checkEmailVerified = async (req, res, next) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  
  if (user?.isEmailVerified) {
    return res.status(400).json({
      success: false,
      code: 'ALREADY_VERIFIED',
      message: 'This email is already verified'
    });
  }
  next();
};
module.exports = { checkPhoneVerified, checkEmailVerified };