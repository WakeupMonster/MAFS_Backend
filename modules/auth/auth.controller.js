const authService = require("./auth.service");
// const redis = require("../../common/redis");
// const { smsQueue } = require("../../common/queues");
// const User = require("../auth/auth.model");
// const utils = require("../auth/auth.utils");
const { rateLimit } = require("../../common/middlewares/rateLimit");
// const profileModel = require("../profile/profile.model");

/*==================================================
1. POST For Send OTP on Phone no.
===================================================*/



module.exports.sendOtp = async (req, res) => {
  try {
    const { phone } = req.body;

    const ip = req.ip;
    if (!phone)
      return res
        .status(400)
        .json({ success: false, message: "Phone is required" });

    // RATE LIMIT (optional, same rehta hai)
    const isLimited = await rateLimit(`otp:${ip}`, 3, 60);
    if (isLimited) {
      return res.status(429).json({
        success: false,
        message: "Too many requests. Try again later.",
      });
    }

    // ✅ Unified OTP send (login + register dono ke liye same service)
    await authService.sendPhoneOtp(phone);

    return res.json({
      success: true,
      message: "If the number is valid, OTP has been sent.",
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};



module.exports.verifyOtp = async (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      return res.status(400).json({ success: false, message: "Phone and OTP are required" });
    }

    const result = await authService.verifyPhoneOtpUnified(phone, otp);

    return res.json({
      success: true,
      message: result.isNewUser
        ? "Welcome! Phone verified successfully"
        : "Welcome back! Login successful",
      data: {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        user: result.user // Poora format iske andar hai
      }
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};


/*==================================================
2. POST For  Verify OTP on through Phone no.
===================================================*/
// module.exports.verifyOtp = async (req, res) => {
//   try {
//     const { phone, otp } = req.body;
//     if (!phone || !otp) {
//       return res
//         .status(400)
//         .json({ success: false, message: "Phone and OTP are required" });
//     }

//     const result = await authService.verifyPhoneOtpUnified(phone, otp);

    
//     return res.json({
//       success: true,
//       message: result.isNewUser
//         ? "Welcome! Phone verified successfully"
//         : "Welcome back! Login successful",
//          data: result
//       // data: {
//       //   userId: result.userId,
//       //   accessToken: result.accessToken, // ✅ Token
//       //   refreshToken: result.refreshToken, // ✅ Token
//       //   isNewUser: result.isNewUser, // ✅ NEW!
//       //   isPhoneVerified: result.isPhoneVerified,
//       //   isEmailVerified: result.isEmailVerified,
//       //   nextStep: result.nextStep,
//       // },
//     });
//   } catch (err) {
//     return res.status(400).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };

// module.exports.sendOtp = async (req, res) => {
//   try {
//     const { phone,action } = req.body;

//     const ip = req.ip || req.headers["x-forwarded-for"] || "unknown";

//     const key = `rate:${ip}`;
//     const isLimited = await rateLimit(key, 2, 60);

//     if (isLimited) {
//       return res.status(429).json({
//         success: false,
//         message: "Too many requests. Try again after 1 minute."
//       });
//     }

//     // Rate limit OTP requests
// // const phoneLimit = await rateLimit(`otp:${phone}`, 5, 60 * 60); // 5 OTP per hour

// // if (!phoneLimit) {
// //   return res.status(429).json({
// //     success: false,
// //     message: "Too many OTP requests. Please wait 1 hour."
// //   });
// // }

// // // Also limit fast spam (30 sec)
// // const phoneFastLimit = await rateLimit(`otp_fast:${phone}`, 1, 30);

// // if (!phoneFastLimit) {
// //   return res.status(429).json({
// //     success: false,
// //     message: "Please wait 30 seconds before requesting a new OTP."
// //   });
// // }

//     // const user = await User.findOneAndUpdate(
//     //   { phone },
//     //   { $setOnInsert: { phone } },
//     //   { upsert: true, new: true, lean: true }
//     // );

//     const userExists = await User.findOne({ phone }).lean();

//     // Validation logic
//     if (action === "register" && userExists?.isPhoneVerified) {
//       return res.status(400).json({
//         success: false,
//         message: "Phone already registered. Please login."
//       });
//     }

//     if (action === "login" && !userExists) {
//       return res.status(404).json({
//         success: false,
//         message: "User not found. Please register first."
//       });
//     }

//     // Create user if registering
//     // if (action === "register" && !userExists) {
//     //   await User.create({ phone });
//     // }

//     // const otp = utils.generateOtp();
//     // const redisKey = `otp:${phone}`;

//     // await redis.set(redisKey, otp, "EX", 300); // expires in 5 min

//     // await smsQueue.add("send-otp", { phone, otp });

//       if (action === "register") {
//       // Uses authService.sendPhoneOtp (stores in User model)
//       await authService.sendPhoneOtp(phone);
//     } else if (action === "login") {
//       // Uses authService.loginSendOtp (stores in Redis)
//       await authService.loginSendOtp(phone, ip);
//     }

//     return res.json({
//       success: true,
//       message: "OTP sent successfully"
//     });
//   } catch (err) {
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };

// module.exports.verifyOtp = async (req, res) => {
//   try {
//     const { phone, otp, action } = req.body;

//     const redisKey = `otp:${phone}`;
//     const savedOtp = await redis.get(redisKey);

//     if (!savedOtp) {
//       return res.status(400).json({ success: false, message: "OTP expired" });
//     }

//     if (savedOtp !== otp) {
//       return res.status(400).json({ success: false, message: "Invalid OTP" });
//     }

//      if (savedOtp !== otp) {
//       return res.status(400).json({ success: false, message: "Invalid OTP" });
//     }

//     await redis.del(redisKey);

//     const user = await User.findOne({ phone });

//     if (!user) {
//       return res.status(404).json({ success: false, message: "User not found" });
//     }

//     // Register flow
//     if (action === "register") {
//       await User.findOneAndUpdate(
//         { phone },
//         { $set: { isPhoneVerified: true } }
//       );

//       await profileModel.findOneAndUpdate(
//         { userId: user._id },
//         { $set: { "onboardingProgress.phoneVerified": true } },
//         { upsert: true }
//       );

//       return res.json({
//         success: true,
//         message: "Phone verified successfully",
//         userId: user._id
//       });
//     }

//     // Login flow
//     if (action === "login") {
//       const result = await authService.loginVerifyOtp(phone, otp);

//       return res.json({
//         success: true,
//         message: "Login successful",
//         data: {
//            userId: result.user._id,
//           accessToken: result.accessToken,
//           refreshToken: result.refreshToken
//         }
//       });
//     }

//     // const user = await User.findOneAndUpdate(
//     //   { phone },
//     //   { $set: { isPhoneVerified: true } },
//     //   { new: true }
//     // );
//     //  if (!user) {
//     //   return res.status(404).json({ success: false, message: "User not found" });
//     // }

//     // // Update onboarding progress in Profile
//     // await profileModel.findOneAndUpdate(
//     //   { userId: user._id },
//     //   {
//     //     $set: {
//     //       "onboardingProgress.phoneVerified": true
//     //     }
//     //   },
//     //   { upsert: true }
//     // );

//     // await redis.del(redisKey);

//     // return res.json({ success: true, message: "Phone Verified", userId: user._id });
//   } catch (err) {
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };

// module.exports.verifyOtp = async (req, res) => {
//   try {
//     const { phone, otp, action } = req.body;

//     // REGISTER FLOW
//     if (action === "register") {
//       // Uses authService.verifyPhoneOtp (checks User model)
//       const user = await authService.verifyPhoneOtp(phone, otp);

//       // Update profile onboarding progress
//       await profileModel.findOneAndUpdate(
//         { userId: user._id },
//         { $set: { "onboardingProgress.phoneVerified": true } },
//         { upsert: true }
//       );

//       return res.json({
//         success: true,
//         message: "Phone verified successfully",
//         userId: user._id
//       });
//     }

//     // LOGIN FLOW
//     if (action === "login") {
//       // Uses authService.loginVerifyOtp (checks Redis)
//       const result = await authService.loginVerifyOtp(phone, otp);

//       return res.json({
//         success: true,
//         message: "Login successful",
//         data: {
//           userId: result.user._id,
//           accessToken: result.accessToken,
//           refreshToken: result.refreshToken
//         }
//       });
//     }

//   } catch (err) {
//     console.error('Verify OTP Error:', err);

//     // Handle specific error messages
//     if (err.message.includes("expired") || err.message.includes("not found")) {
//       return res.status(400).json({
//         success: false,
//         message: "OTP expired or not found. Please request a new OTP."
//       });
//     }

//     if (err.message.includes("Invalid")) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid OTP. Please check and try again."
//       });
//     }

//     return res.status(400).json({
//       success: false,
//       message: err.message || "Verification failed"
//     });
//   }
// };

/*==================================================
3. POST For register Email Id with userId
===================================================*/
// module.exports.registerEmail = async (req, res) => {
//   try {
//     const { userId, email } = req.body;
//     await authService.sendEmailOtp(userId, email);

//     return res.json({ success: true, message: "Email OTP sent" });
//   } catch (err) {
//     console.log("Error hai");
//     return res.status(400).json({ success: false, message: err.message });
//   }
// };



/*==================================================
3. POST For register Email Id with token
===================================================*/
module.exports.registerEmail = async (req, res) => {
  try {
    const { email } = req.body;
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication token is required' 
      });
    }
    
    await authService.sendEmailOtp(token, email);
    
    return res.json({ 
      success: true, 
      message: "Email OTP sent successfully" 
    });
  } catch (err) {
    return res.status(400).json({ 
      success: false, 
      message: err.message 
    });
  }
};


/*==================================================
4. POST For  Verify userId with otp
===================================================*/
// module.exports.verifyEmail = async (req, res) => {
//   try {
//     const { userId, otp } = req.body;
//     const result = await authService.verifyEmailOtp(userId, otp);
//     await profileModel.findOneAndUpdate(
//       { userId: result.user._id },
//       {
//         $set: {
//           "onboardingProgress.emailVerified": true,
//         },
//       },
//       { upsert: true }
//     );
//     return res.json({
//       success: true,
//       message: "Email verified",
//       data: {
//         userId: result.user._id,
//         accessToken: result.accessToken,
//         refreshToken: result.refreshToken,
//         isEmailVerified: result.isEmailVerified,
//         nextStep: result.nextStep,
//       },
//     });
//   } catch (err) {
//     return res.status(400).json({ success: false, message: err.message });
//   }
// };

/*==================================================
4. POST For Verify Email with OTP
===================================================*/
module.exports.verifyEmail = async (req, res) => {
  try {
    const {  otp } = req.body;
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication token is required' 
      });
    }
    
    const result = await authService.verifyEmailOtp(token, otp);
    
    // await profileModel.findOneAndUpdate(
    //   { userId: result.user._id },
    //   {
    //     $set: {
    //       "onboardingProgress.emailVerified": true,
    //     },
    //   },
    //   { upsert: true }
    // );
    
   return res.json({
      success: true,
      message: "Email verified successfully",
      data: {
        // accessToken: result.accessToken,
        user: result.user // Manager wala format yahan aa gaya
      }
    });
  } catch (err) {
    return res.status(400).json({ 
      success: false, 
      message: err.message 
    });
  }
};


/*==================================================
5. POST Login For Send OTP on Phone no.
===================================================*/
module.exports.loginSendOtp = async (req, res) => {
  try {
    const { phone } = req.body;
    const ip = req.ip;

    await authService.loginSendOtp(phone, ip);

    return res.json({
      success: true,
      message: "OTP sent successfully",
    });
  } catch (err) {
    return res.status(429).json({
      success: false,
      message: err.message,
    });
  }
};

/*==================================================
6. POST Login For Verify OTP on through Phone no.
===================================================*/
module.exports.loginVerify = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    const { user, accessToken, refreshToken } =
      await authService.loginVerifyOtp(phone, otp);

    return res.json({
      success: true,
      message: "Login successful",
      data: {
        userId: user._id,
        accessToken,
        refreshToken,
      },
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

/*==================================================
7. POST Referesh Token
===================================================*/
// module.exports.refreshToken = async (req, res) => {
//   try {
//     const { refreshToken } = req.body;
//     const data = await authService.refreshAccessToken(refreshToken);
//     return res.json({
//       success: true,
//       data
//     });
//   } catch (err) {
//     return res.status(401).json({
//       success: false,
//       message: err.message
//     });
//   }
// };

module.exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const result = await authService.refreshAccessToken(refreshToken);

    return res.json({
      success: true,
      data: {
        accessToken: result.accessToken,
        user: result.user // Same consistency!
      }
    });
  } catch (err) {
    return res.status(401).json({ success: false, message: err.message });
  }
};
/*==================================================
8. POST For Logout API
===================================================*/
// module.exports.logout = async (req, res) => {
//   try {
//     const { userId, refreshToken } = req.body;
//     await authService.logout(userId, refreshToken);
//     return res.json({ success: true, message: "Logged out" });
//   } catch (err) {
//     return res.status(400).json({ success: false, message: err.message });
//   }
// };


// auth.controller.js
module.exports.logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    await authService.logout(refreshToken);

    return res.json({
      success: true,
      message: "Logged out successfully"
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
};


// const User = require("../auth/auth.model")

// module.exports.registerPhone = async (req, res) => {
//   try {
//     const { phone } = req.body;
//     await authService.sendPhoneOtp(phone);
//     return res.json({ success: true, message: "OTP sent to phone" });
//   } catch (err) {
//     return res.status(400).json({ success: false, message: err.message });
//   }
// };
// module.exports.registerPhone = async (req, res) => {
//   try {
//     const { phone } = req.body;
//     // find user by phone
//     let user = await User.findOne({ phone });
//     // if user does not exist → create one
//     if (!user) {
//       user = await User.create({ phone });
//     }
//     // send OTP
//     await authService.sendPhoneOtp(phone);
//     return res.json({
//       success: true,
//       message: "Phone OTP sent",
//       userId: user._id
//     });

//   } catch (err) {
//     return res.status(400).json({ success: false, message: err.message });
//   }
// };

// module.exports.verifyPhone = async (req, res) => {
//   try {
//     const { phone, otp } = req.body;
//     const user = await authService.verifyPhoneOtp(phone, otp);
//     return res.json({ success: true, message: "Phone verified", data: { userId: user._id } });
//   } catch (err) {
//     return res.status(400).json({ success: false, message: err.message });
//   }
// };

// Login flow (phone-based)
// module.exports.loginSendOtp = async (req, res) => {
//   try {
//     const { phone } = req.body;

//     await authService.loginSendOtp(phone);
//     return res.json({ success: true, message: "OTP sent to phone" });
//   } catch (err) {
//     return res.status(400).json({ success: false, message: err.message });
//   }
// };

// module.exports.loginVerify = async (req, res) => {
//   try {
//     const { phone, otp } = req.body;
//     const { user, accessToken, refreshToken } = await authService.loginVerifyOtp(phone, otp);
//     return res.json({ success: true, message: "Login successful", data: { userId: user._id, accessToken, refreshToken } });
//   } catch (err) {
//     return res.status(400).json({ success: false, message: err.message });
//   }
// };

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




// In auth.controller.js - Add a new test endpoint
// module.exports.sendTestOtp = async (req, res) => {
//   try {
//     const { phone } = req.body;
//     const ip = req.ip;

//     if (!phone) {
//       return res.status(400).json({
//         success: false,
//         message: "Phone is required"
//       });
//     }

//     // Rate limiting
//     const isLimited = await rateLimit(`otp:test:${ip}`, 10, 60); // More generous limits for testing
//     if (isLimited) {
//       return res.status(429).json({
//         success: false,
//         message: "Too many test requests. Try again later."
//       });
//     }

//     // Send OTP in test mode
//     const result = await authService.sendPhoneOtpTest(phone, true); // true = test mode

//     return res.json({
//       success: true,
//       message: `Test OTP: ${result.otp}`,
//       otp: result.otp
//     });
//   } catch (err) {
//     console.error("Error in sendTestOtp:", err);
//     return res.status(400).json({
//       success: false,
//       message: err.message
//     });
//   }
// };

// Update the routes to include the new test endpoint
// In your auth.routes.js or wherever routes are defined
// router.post('/test/otp', authController.sendTestOtp);

const { normalizePhone, hashPhone } = require("../../common/utils/phone.util");

module.exports.sendTestOtp = async (req, res) => {
  try {
    let { phone } = req.body;
    const ip = req.ip;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: "Phone is required"
      });
    }

    // 🔹 Normalize phone (VERY IMPORTANT)
    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) {
      return res.status(400).json({
        success: false,
        message: "Invalid phone number"
      });
    }

    // 🔹 Hash phone (future consistency)
    const phoneHash = hashPhone(normalizedPhone);

    // Rate limiting
    const isLimited = await rateLimit(`otp:test:${ip}`, 10, 60);
    if (isLimited) {
      return res.status(429).json({
        success: false,
        message: "Too many test requests. Try again later."
      });
    }

    // ✅ OTP send (NO DB WRITE HERE)
    const result = await authService.sendPhoneOtpTest(normalizedPhone, true);

    return res.json({
      success: true,
      message: `Test OTP: ${result.otp}`,
      otp: result.otp,

      // ⚠️ TESTING ONLY (REMOVE IN PROD RESPONSE)
      debug: {
        normalizedPhone,
        phoneHash
      }
    });
  } catch (err) {
    console.error("Error in sendTestOtp:", err);
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
};





module.exports.resendPhoneOtp = async (req, res) => {
  try {
    const { phone } = req.body;
    const ip = req.ip;

    if (!phone) {
      return res.status(400).json({ 
        success: false, 
        message: "Phone number is required" 
      });
    }

    // Rate limiting
    const isLimited = await rateLimit(`resend:phone:${ip}`, 3, 60);
    if (isLimited) {
      return res.status(429).json({
        success: false,
        message: "Too many resend attempts. Please try again later.",
      });
    }

    // Check if user exists
    const User = require('./auth.model');
    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No account found with this phone number.",
      });
    }

    // Send OTP using the existing sendPhoneOtp function
    await authService.sendPhoneOtp(phone);

    return res.json({
      success: true,
      message: "OTP resent successfully",
    });
  } catch (err) {
    return res.status(500).json({ 
      success: false, 
      message: err.message 
    });
  }
};

/*==================================================
10. POST Resend OTP to Email

===================================================*/

module.exports.resendEmailOtp = async (req, res) => {
  try {
    const { email } = req.body;
    const authHeader = req.headers.authorization;
    
    // 1. Token Check
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication token is required' 
      });
    }
    const token = authHeader.split(' ')[1];

    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    // 2. Rate limiting (Optional but good)
    const isLimited = await rateLimit(`resend:email:${req.ip}`, 3, 60);
    if (isLimited) {
      return res.status(429).json({
        success: false,
        message: "Too many attempts. Please try again after a minute.",
      });
    }

    // 3. SERVICE CALL (Exactly like registerEmail)
    // Hum token aur email bhej rahe hain
    await authService.sendEmailOtp(token, email);

    return res.json({
      success: true,
      message: "Verification email resent successfully",
    });
  } catch (err) {
    // Agar token invalid hoga toh yahan error throw hoga
    return res.status(400).json({ 
      success: false, 
      message: err.message 
    });
  }
};



// module.exports.resendEmailOtp = async (req, res) => {
//   try {
//     const { email } = req.body;
//     const ip = req.ip;

//     if (!email) {
//       return res.status(400).json({ 
//         success: false, 
//         message: "Email is required" 
//       });
//     }

//     // Rate limiting
//     const isLimited = await rateLimit(`resend:email:${ip}`, 3, 60);
//     if (isLimited) {
//       return res.status(429).json({
//         success: false,
//         message: "Too many resend attempts. Please try again later.",
//       });
//     }

//     // Check if user exists and has this email
//     const User = require('./auth.model');
//     const user = await User.findOne({ email });
//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         message: "No account found with this email.",
//       });
//     }

//     // Check if email is already verified
//     if (user.isEmailVerified) {
//       return res.status(400).json({
//         success: false,
//         message: "Email is already verified.",
//       });
//     }

//     // Send email OTP
//     await authService.sendEmailOtp(user._id, email);

//     return res.json({
//       success: true,
//       message: "Verification email resent successfully",
//     });
//   } catch (err) {
//     return res.status(500).json({ 
//       success: false, 
//       message: err.message 
//     });
//   }
// };