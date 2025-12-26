/**
 * Social Authentication Controller
 * Handles HTTP requests for social login
 */

const socialService = require("./social.service");

/**
 * POST /api/v1/auth/social/login
 * Unified endpoint for Google, Facebook, and Apple login
 * 
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
module.exports.socialLogin = async (req, res) => {
  try {
    const { provider, idToken, accessToken, deviceId, fcmToken } = req.body;

    // ============ VALIDATION ============
    if (!provider) {
      return res.status(400).json({
        success: false,
        message: "Provider is required",
        code: "MISSING_PROVIDER"
      });
    }

    const validProviders = ["google", "facebook", "apple"];
    if (!validProviders.includes(provider.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `Invalid provider. Must be one of: ${validProviders.join(", ")}`,
        code: "INVALID_PROVIDER"
      });
    }

    // Validate tokens based on provider
    if (provider.toLowerCase() === "facebook") {
      if (!accessToken) {
        return res.status(400).json({
          success: false,
          message: "Access token is required for Facebook",
          code: "MISSING_ACCESS_TOKEN"
        });
      }
    } else {
      if (!idToken) {
        return res.status(400).json({
          success: false,
          message: "ID token is required",
          code: "MISSING_ID_TOKEN"
        });
      }
    }

    // ============ PROCESS LOGIN ============
    const result = await socialService.socialLogin(
      provider,
      idToken,
      accessToken
    );

    // ============ OPTIONAL: SAVE FCM TOKEN ============
    if (fcmToken && deviceId) {
      // This would be handled in a separate endpoint or middleware
      // For now, just log it
      console.log(`📱 FCM Token received: ${deviceId}`);
    }

    // ============ RESPONSE ============
    return res.status(200).json({
      success: true,
      message: `${provider} login successful`,
      data: {
        userId: result.userId,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        isNewUser: result.isNewUser,
        isPhoneVerified: result.isPhoneVerified,
        isEmailVerified: result.isEmailVerified,
        nextStep: result.nextStep,
        authMethod: result.authMethod
      }
    });

  } catch (error) {
    console.error("❌ Social login error:", error.message);

    // ============ ERROR HANDLING ============
    const statusCode = error.message.includes("Invalid") ? 400 : 500;
    const errorCode = getErrorCode(error.message);

    return res.status(statusCode).json({
      success: false,
      message: error.message,
      code: errorCode
    });
  }
};

/**
 * POST /api/v1/auth/social/link
 * Link a social account to existing user
 * Requires authentication
 * 
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
module.exports.linkSocialAccount = async (req, res) => {
  try {
    const { provider, idToken, accessToken } = req.body;
    const userId = req.user._id; // From auth middleware

    // ============ VALIDATION ============
    if (!provider) {
      return res.status(400).json({
        success: false,
        message: "Provider is required",
        code: "MISSING_PROVIDER"
      });
    }

    if (provider.toLowerCase() === "facebook") {
      if (!accessToken) {
        return res.status(400).json({
          success: false,
          message: "Access token is required for Facebook",
          code: "MISSING_ACCESS_TOKEN"
        });
      }
    } else {
      if (!idToken) {
        return res.status(400).json({
          success: false,
          message: "ID token is required",
          code: "MISSING_ID_TOKEN"
        });
      }
    }

    // ============ PROCESS LINKING ============
    const result = await socialService.linkSocialAccount(
      userId,
      provider,
      idToken,
      accessToken
    );

    // ============ RESPONSE ============
    return res.status(200).json({
      success: true,
      message: result.message,
      data: {
        provider: result.provider,
        email: result.email
      }
    });

  } catch (error) {
    console.error("❌ Link social account error:", error.message);

    const statusCode = error.message.includes("already") ? 409 : 400;
    const errorCode = getErrorCode(error.message);

    return res.status(statusCode).json({
      success: false,
      message: error.message,
      code: errorCode
    });
  }
};

/**
 * POST /api/v1/auth/social/unlink
 * Unlink a social account from user
 * Requires authentication
 * 
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
module.exports.unlinkSocialAccount = async (req, res) => {
  try {
    const { provider } = req.body;
    const userId = req.user._id; // From auth middleware

    // ============ VALIDATION ============
    if (!provider) {
      return res.status(400).json({
        success: false,
        message: "Provider is required",
        code: "MISSING_PROVIDER"
      });
    }

    // ============ PROCESS UNLINKING ============
    const result = await socialService.unlinkSocialAccount(userId, provider);

    // ============ RESPONSE ============
    return res.status(200).json({
      success: true,
      message: result.message
    });

  } catch (error) {
    console.error("❌ Unlink social account error:", error.message);

    const statusCode = error.message.includes("not linked") ? 404 : 400;
    const errorCode = getErrorCode(error.message);

    return res.status(statusCode).json({
      success: false,
      message: error.message,
      code: errorCode
    });
  }
};

/**
 * GET /api/v1/auth/social/accounts
 * Get user's linked social accounts
 * Requires authentication
 * 
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
module.exports.getLinkedAccounts = async (req, res) => {
  try {
    const userId = req.user._id; // From auth middleware

    // ============ FETCH ACCOUNTS ============
    const linkedAccounts = await socialService.getLinkedAccounts(userId);

    // ============ RESPONSE ============
    return res.status(200).json({
      success: true,
      data: linkedAccounts
    });

  } catch (error) {
    console.error("❌ Get linked accounts error:", error.message);

    return res.status(500).json({
      success: false,
      message: error.message,
      code: "INTERNAL_ERROR"
    });
  }
};

// ✅ ADD THIS TO: modules/auth/social/social.controller.js

/**
 * GET /api/v1/auth/social/callback
 * Handles OAuth callback from providers
 * This is for server-side OAuth flow (optional)
 */
module.exports.handleCallback = async (req, res) => {
  try {
    const { code, error } = req.query;
    const { provider } = req.query;

    // Error handling
    if (error) {
      return res.redirect(
        `http://localhost:3000/login?error=${error}&error_description=${req.query.error_description || ''}`
      );
    }

    if (!code || !provider) {
      return res.redirect('http://localhost:3000/login?error=missing_code');
    }

    // Note: This is a placeholder for server-side OAuth flow
    // For frontend-based flow, this endpoint is not needed
    
    return res.redirect('http://localhost:3000/login?success=true');

  } catch (error) {
    console.error("❌ Callback error:", error.message);
    return res.redirect(`http://localhost:3000/login?error=${error.message}`);
  }
};

/**
 * Helper function to map error messages to error codes
 * 
 * @param {string} message - Error message
 * @returns {string} Error code
 */
function getErrorCode(message) {
  if (message.includes("expired")) return "TOKEN_EXPIRED";
  if (message.includes("Invalid")) return "INVALID_TOKEN";
  if (message.includes("already")) return "ALREADY_LINKED";
  if (message.includes("not linked")) return "NOT_LINKED";
  if (message.includes("not found")) return "NOT_FOUND";
  if (message.includes("Unsupported")) return "UNSUPPORTED_PROVIDER";
  return "UNKNOWN_ERROR";
}
