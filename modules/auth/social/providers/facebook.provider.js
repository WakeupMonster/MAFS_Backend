/**
 * Facebook OAuth Provider
 * Verifies Facebook access tokens and extracts user information
 */

// const fetch = require("node-fetch");

// let fetch;
// (async () => {
//   fetch = (await import("node-fetch")).default;
// })();

// async function verifyFacebookToken(accessToken) {
//   try {
//     if (!accessToken) {
//       throw new Error("Access token is required");
//     }

//     // Step 1: Verify token is valid
//     const debugResponse = await fetch(
//       `https://graph.facebook.com/debug_token?input_token=${accessToken}&access_token=${process.env.FACEBOOK_APP_ID}|${process.env.FACEBOOK_APP_SECRET}`
//     );

//     if (!debugResponse.ok) {
//       throw new Error("Failed to verify token with Facebook");
//     }

//     const debugData = await debugResponse.json();

//     // Check if token is valid
//     if (!debugData.data || !debugData.data.is_valid) {
//       throw new Error("Invalid or expired Facebook token");
//     }

//     // Check if app ID matches
//     if (debugData.data.app_id !== process.env.FACEBOOK_APP_ID) {
//       throw new Error("Token issued for different app");
//     }

//     // Step 2: Get user info
//     const userResponse = await fetch(
//       `https://graph.facebook.com/me?fields=id,email,name,picture.type(large)&access_token=${accessToken}`
//     );

//     if (!userResponse.ok) {
//       throw new Error("Failed to fetch user info from Facebook");
//     }

//     const userData = await userResponse.json();

//     // Validate required fields
//     if (!userData.id) {
//       throw new Error("User ID not found in Facebook response");
//     }

//     if (!userData.email) {
//       throw new Error("Email not found in Facebook account. Please enable email permission.");
//     }

//     // Return standardized user info
//     return {
//       provider: "facebook",
//       id: userData.id,
//       email: userData.email,
//       name: userData.name || "",
//       picture: userData.picture?.data?.url || null,
//       raw: userData
//     };

//   } catch (error) {
//     console.error("❌ Facebook token verification failed:", error.message);
    
//     // Handle specific errors
//     if (error.message.includes("expired")) {
//       throw new Error("Facebook token expired. Please login again.");
//     }

//     throw new Error(`Facebook verification failed: ${error.message}`);
//   }
// }



let fetch;
(async () => {
  fetch = (await import("node-fetch")).default;
})();

async function verifyFacebookToken(accessToken) {
  try {
    if (!accessToken) {
      throw new Error("Access token is required");
    }

    // ✅ Step 1: Verify token using FACEBOOK Graph API
    const debugResponse = await fetch(
      `https://graph.facebook.com/debug_token?input_token=${accessToken}&access_token=${process.env.FACEBOOK_APP_ID}|${process.env.FACEBOOK_APP_SECRET}`
    );

    if (!debugResponse.ok) {
      throw new Error("Failed to verify token with Facebook");
    }

    const debugData = await debugResponse.json();

    if (!debugData.data || !debugData.data.is_valid) {
      throw new Error("Invalid or expired Facebook token");
    }

    // ✅ Check token belongs to same app
    if (debugData.data.app_id !== process.env.FACEBOOK_APP_ID) {
      throw new Error("Token issued for different Facebook app");
    }

    // ✅ Step 2: Fetch user profile
    const userResponse = await fetch(
      `https://graph.facebook.com/me?fields=id,email,name,picture.type(large)&access_token=${accessToken}`
    );

    if (!userResponse.ok) {
      throw new Error("Failed to fetch user info from Facebook");
    }

    const userData = await userResponse.json();

    if (!userData.id) {
      throw new Error("User ID not found in Facebook response");
    }

    // ⚠️ Email can be null (Facebook limitation)
    return {
      provider: "facebook",
      providerId: userData.id,
      email: userData.email || null,
      name: userData.name || "",
      profilePic: userData.picture?.data?.url || null,
      raw: userData
    };

  } catch (error) {
    console.error("❌ Facebook token verification failed:", error.message);
    throw new Error(`Facebook verification failed: ${error.message}`);
  }
}






async function getFacebookUserInfo(accessToken) {
  try {
    const response = await fetch(
      `https://graph.facebook.com/me?fields=id,email,name,picture.type(large),first_name,last_name&access_token=${accessToken}`
    );

    if (!response.ok) {
      throw new Error(`Facebook API error: ${response.statusText}`);
    }

    const userInfo = await response.json();

    return {
      provider: "facebook",
      id: userInfo.id,
      email: userInfo.email,
      name: userInfo.name || "",
      firstName: userInfo.first_name || "",
      lastName: userInfo.last_name || "",
      picture: userInfo.picture?.data?.url || null
    };

  } catch (error) {
    console.error("❌ Failed to get Facebook user info:", error.message);
    throw new Error(`Failed to fetch Facebook user info: ${error.message}`);
  }
}

module.exports = {
  verifyFacebookToken,
  getFacebookUserInfo
};
