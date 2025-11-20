const authService = require("./auth.service");
const User = require("../auth/auth.model")
// module.exports.registerPhone = async (req, res) => {
//   try {
//     const { phone } = req.body;
//     await authService.sendPhoneOtp(phone);
//     return res.json({ success: true, message: "OTP sent to phone" });
//   } catch (err) {
//     return res.status(400).json({ success: false, message: err.message });
//   }
// };
module.exports.registerPhone = async (req, res) => {
  try {
    const { phone } = req.body;
    // find user by phone
    let user = await User.findOne({ phone });
    // if user does not exist → create one
    if (!user) {
      user = await User.create({ phone });
    }
    // send OTP
    await authService.sendPhoneOtp(phone);
    return res.json({
      success: true,
      message: "Phone OTP sent",
      userId: user._id
    });

  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};


module.exports.verifyPhone = async (req, res) => {
  try {
    const { phone, otp } = req.body;
    const user = await authService.verifyPhoneOtp(phone, otp);
    return res.json({ success: true, message: "Phone verified", data: { userId: user._id } });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

module.exports.registerEmail = async (req, res) => {
  try {
    const { userId, email } = req.body;
    await authService.sendEmailOtp(userId, email);
    return res.json({ success: true, message: "Email OTP sent" });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};


module.exports.verifyEmail = async (req, res) => {
  try {
    const { userId, otp } = req.body;
    const result = await authService.verifyEmailOtp(userId, otp);
    return res.json({ success: true, message: "Email verified", data: { userId: result.user._id, accessToken: result.accessToken, refreshToken: result.refreshToken } });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

// Login flow (phone-based)
module.exports.loginSendOtp = async (req, res) => {
  try {
    const { phone } = req.body;
    await authService.loginSendOtp(phone);
    return res.json({ success: true, message: "OTP sent to phone" });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

module.exports.loginVerify = async (req, res) => {
  try {
    const { phone, otp } = req.body;
    const { user, accessToken, refreshToken } = await authService.loginVerifyOtp(phone, otp);
    return res.json({ success: true, message: "Login successful", data: { userId: user._id, accessToken, refreshToken } });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

module.exports.refreshToken = async (req, res) => {
  try {
    const { userId, refreshToken } = req.body;
    const data = await authService.refreshAccessToken(userId, refreshToken);
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

module.exports.logout = async (req, res) => {
  try {
    const { userId, refreshToken } = req.body;
    await authService.logout(userId, refreshToken);
    return res.json({ success: true, message: "Logged out" });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};




// module.exports.googleLogin = async (req, res) => {
//   try {
//     const { idToken } = req.body;
//     const response = await authService.googleLogin(idToken);

//     return res.json({
//       success: true,
//       message: "Google login successful",
//       data: response
//     });
//   } catch (err) {
//     return res.status(400).json({ success: false, message: err.message });
//   }
// };

// module.exports.facebookLogin = async (req, res) => {
//   try {
//     const { accessToken } = req.body;
//     const response = await authService.facebookLogin(accessToken);

//     return res.json({
//       success: true,
//       message: "Facebook login successful",
//       data: response
//     });
//   } catch (err) {
//     return res.status(400).json({ success: false, message: err.message });
//   }
// };

// module.exports.appleLogin = async (req, res) => {
//   try {
//     const { idToken } = req.body;
//     const response = await authService.appleLogin(idToken);

//     return res.json({
//       success: true,
//       message: "Apple login successful",
//       data: response
//     });
//   } catch (err) {
//     return res.status(400).json({ success: false, message: err.message });
//   }
// };
