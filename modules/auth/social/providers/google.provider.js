/**
 * Google OAuth Provider
 * Verifies Google ID tokens and extracts user information
 */

const { OAuth2Client } = require("google-auth-library");

// Initialize Google OAuth client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);


// const googleClient = new OAuth2Client();

// const getValidAudiences = () => {
//   return [
//     process.env.GOOGLE_WEB_CLIENT_ID,
//     process.env.GOOGLE_ANDROID_CLIENT_ID,
//     process.env.GOOGLE_IOS_CLIENT_ID
//   ].filter(Boolean);
// };

async function verifyGoogleToken(idToken) {
  try {
    if (!idToken) {
      throw new Error("ID token is required");
    }
//  const validAudiences = getValidAudiences();
    // Verify token signature and expiration
    //  if (!validAudiences.length) {
    //   throw new Error("No Google client IDs configured");
    // }

    // // Verify token (Web + Android + iOS)
    // const ticket = await googleClient.verifyIdToken({
    //   idToken,
    //   audience: validAudiences
    // });

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    // Extract payload
    const payload = ticket.getPayload();

    //  if (!payload) {
    //   throw new Error("Invalid Google token payload");
    // }

    // Validate required fields
    if (!payload.email) {
      throw new Error("Email not found in Google token");
    }

    if (!payload.email_verified) {
      throw new Error("Email not verified in Google account");
    }

    // Return standardized user info
    return {
      provider: "google",
      id: payload.sub,                    // Google user ID
      email: payload.email,
      name: payload.name || "",
      picture: payload.picture || null,
      email_verified: payload.email_verified,
      raw: payload                        // Keep raw payload for debugging
    };

  } catch (error) {
    console.error("❌ Google token verification failed:", error.message);
    
    // Handle specific errors
    if (error.message.includes("Token used too late")) {
      throw new Error("Token expired. Please login again.");
    }
    
    if (error.message.includes("audience")) {
      throw new Error("Invalid token audience. Check GOOGLE_CLIENT_ID.");
    }

    throw new Error(`Google verification failed: ${error.message}`);
  }
}

async function getGoogleUserInfo(accessToken) {
  try {
    // ✅ FIX: Use dynamic import for node-fetch (ES Module)
    const fetch = (await import("node-fetch")).default;
    
    const response = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Google API error: ${response.statusText}`);
    }

    const userInfo = await response.json();

    return {
      provider: "google",
      id: userInfo.id,
      email: userInfo.email,
      name: userInfo.name || "",
      picture: userInfo.picture || null,
      email_verified: userInfo.verified_email
    };

  } catch (error) {
    console.error("❌ Failed to get Google user info:", error.message);
    throw new Error(`Failed to fetch Google user info: ${error.message}`);
  }
}

module.exports = {
  verifyGoogleToken,
  getGoogleUserInfo
};
