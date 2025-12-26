/**
 * Social Authentication Service
 * Handles Google, Facebook, and Apple login
 */

const User = require("../auth.model");
const profileModel = require("../../profile/profile.model");
const authUtils = require("../auth.utils");

// Import provider verification functions
const { verifyGoogleToken } = require("./providers/google.provider");
const { verifyFacebookToken } = require("./providers/facebook.provider");
const { verifyAppleToken } = require("./providers/apple.provider");

const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

async function socialLogin(provider, idToken, accessToken) {
  try {
    // ================= STEP 1: VERIFY TOKEN =================
    let providerUserInfo;

    switch (provider.toLowerCase()) {
      case "google":
        providerUserInfo = await verifyGoogleToken(idToken);
        break;

      case "facebook":
        providerUserInfo = await verifyFacebookToken(accessToken);
        break;

      case "apple":
        providerUserInfo = await verifyAppleToken(idToken);
        break;

      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }

    if (!providerUserInfo || !providerUserInfo.providerId) {
      throw new Error("Invalid provider user info");
    }

    console.log(`✅ ${provider} token verified`);

    // ================= STEP 2: FIND OR CREATE USER =================
    const { user, isNewUser } = await findOrCreateSocialUser(
      provider,
      providerUserInfo
    );

    if (!user) {
      throw new Error("User creation failed");
    }

    // ================= STEP 3: UPDATE LAST LOGIN =================
    user.lastLoginAt = new Date();
    await user.save(); // ✅ SAFE: user is guaranteed

    // ================= STEP 4: GENERATE TOKENS =================
    const { accessToken: jwtAccess, refreshToken } = generateTokens(user);

    // ================= STEP 5: RETURN RESPONSE =================
    return {
      userId: user._id,
      accessToken: jwtAccess,
      refreshToken,
      isNewUser,
      isPhoneVerified: user.isPhoneVerified || false,
      isEmailVerified: user.isEmailVerified || false,
      nextStep: getNextStep(user),
      authMethod: provider
    };

  } catch (error) {
    console.error(`❌ Social login error (${provider}):`, error.message);
    throw error;
  }
}


// async function socialLogin(provider, idToken, accessToken) {
//   try {
//     // Step 1: Verify token with provider
//     let providerUserInfo;

//     switch (provider.toLowerCase()) {
//       case "google":
//         providerUserInfo = await verifyGoogleToken(idToken);
//         break;

//       case "facebook":
//         providerUserInfo = await verifyFacebookToken(accessToken);
//         break;

//       case "apple":
//         providerUserInfo = await verifyAppleToken(idToken);
//         break;

//       default:
//         throw new Error(`Unsupported provider: ${provider}`);
//     }

//     console.log(`✅ ${provider} token verified for:`, providerUserInfo.email);

//     // Step 2: Find or create user
//     const result = await findOrCreateSocialUser(provider, providerUserInfo);

//     // Step 3: Generate tokens
//     const tokens = generateTokens(result.user);

//     // Step 4: Update last login
//     // result.user.social[provider].lastLoginAt = new Date();
//     await result.user.save();

//     // Step 5: Return response
//     return {
//       userId: result.user._id,
//       accessToken: tokens.accessToken,
//       refreshToken: tokens.refreshToken,
//       isNewUser: result.isNewUser,
//       isPhoneVerified: result.user.isPhoneVerified,
//       isEmailVerified: result.user.isEmailVerified,
//       nextStep: getNextStep(result.user),
//       authMethod: provider
//     };

//   } catch (error) {
//     console.error(`❌ Social login error (${provider}):`, error.message);
//     throw error;
//   }
// }

async function findOrCreateSocialUser(provider, providerUserInfo) {
  try {
    // Step 1: Try to find user by provider ID
    let user = await User.findOne({
      [`social.${provider}.id`]: providerUserInfo.id
    });

    if (user) {
      console.log(`✅ Found existing user with ${provider} account`);
      return { user, isNewUser: false };
    }

    // Step 2: Try to find user by email
    if (providerUserInfo.email) {
      user = await User.findOne({ email: providerUserInfo.email });

      if (user) {
        console.log(`✅ Found existing user with email: ${providerUserInfo.email}`);
        
        // Link social account to existing user
        user.social[provider] = {
          id: providerUserInfo.id,
          email: providerUserInfo.email,
          name: providerUserInfo.name,
          picture: providerUserInfo.picture,
          linkedAt: new Date()
        };

        user.isEmailVerified = true;
        await user.save();

        return { user, isNewUser: false };
      }
    }

    // Step 3: Create new user
    console.log(`✅ Creating new user with ${provider} account`);

    user = new User({
      email: providerUserInfo.email,
      isEmailVerified: true,
      authMethod: provider,
      social: {
        [provider]: {
          id: providerUserInfo.id,
          email: providerUserInfo.email,
          name: providerUserInfo.name,
          picture: providerUserInfo.picture,
          linkedAt: new Date()
        }
      }
    });

    await user.save();

    // Create profile document with photos initialized as empty array
    await profileModel.create({
      userId: user._id,
      photos: [],
      onboardingProgress: {
        emailVerified: true
      }
    });

    return { user, isNewUser: true };

  } catch (error) {
    console.error("❌ Error in findOrCreateSocialUser:", error.message);
    throw new Error(`Failed to process user: ${error.message}`);
  }
}


function generateTokens(user) {
  try {
    // Generate access token
    const accessToken = authUtils.generateAccessToken(user);

    // Generate refresh token
    const refreshTokenRaw = authUtils.generateRefreshToken();
    const refreshTokenHash = authUtils.hashToken(refreshTokenRaw);

    // Store refresh token hash in DB
    user.refreshTokens.push({
      tokenHash: refreshTokenHash,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS)
    });

    return {
      accessToken,
      refreshToken: refreshTokenRaw
    };

  } catch (error) {
    console.error("❌ Error generating tokens:", error.message);
    throw new Error("Failed to generate tokens");
  }
}

function getNextStep(user) {
  // If phone not verified, ask for phone
  if (!user.isPhoneVerified) {
    return {
      screen: "phone_verification",
      message: "Verify your phone number to continue"
    };
  }

  // If profile not completed, go to profile setup
  if (!user.isProfileCompleted) {
    return {
      screen: "profile_setup",
      message: "Complete your profile to start swiping"
    };
  }

  // All done
  return {
    screen: "home",
    message: "Welcome back!"
  };
}

async function linkSocialAccount(userId, provider, idToken, accessToken) {
  try {
    // Step 1: Verify token with provider
    let providerUserInfo;

    switch (provider.toLowerCase()) {
      case "google":
        providerUserInfo = await verifyGoogleToken(idToken);
        break;

      case "facebook":
        providerUserInfo = await verifyFacebookToken(accessToken);
        break;

      case "apple":
        providerUserInfo = await verifyAppleToken(idToken);
        break;

      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }

    // Step 2: Find user
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Step 3: Check if provider already linked
    if (user.social[provider]?.id) {
      throw new Error(`${provider} account already linked`);
    }

    // Step 4: Check if provider ID already used by another user
    const existingUser = await User.findOne({
      [`social.${provider}.id`]: providerUserInfo.id
    });

    if (existingUser && existingUser._id.toString() !== userId) {
      throw new Error(`This ${provider} account is already linked to another user`);
    }

    // Step 5: Link account
    user.social[provider] = {
      id: providerUserInfo.id,
      email: providerUserInfo.email,
      name: providerUserInfo.name,
      picture: providerUserInfo.picture,
      linkedAt: new Date()
    };

    await user.save();

    console.log(`✅ ${provider} account linked for user ${userId}`);

    return {
      success: true,
      message: `${provider} account linked successfully`,
      provider,
      email: providerUserInfo.email
    };

  } catch (error) {
    console.error(`❌ Error linking ${provider} account:`, error.message);
    throw error;
  }
}

async function unlinkSocialAccount(userId, provider) {
  try {
    // Step 1: Find user
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Step 2: Check if provider is linked
    if (!user.social[provider]?.id) {
      throw new Error(`${provider} account not linked`);
    }

    // Step 3: Check if user has other auth methods
    const hasPhone = Boolean(user.isPhoneVerified);
    const hasEmail = Boolean(user.isEmailVerified);
    const linkedProviders = Object.keys(user.social).filter(
      p => user.social[p]?.id && p !== provider
    );

    if (!hasPhone && !hasEmail && linkedProviders.length === 0) {
      throw new Error("Cannot unlink last authentication method");
    }

    // Step 4: Unlink account
    user.social[provider] = undefined;
    await user.save();

    console.log(`✅ ${provider} account unlinked for user ${userId}`);

    return {
      success: true,
      message: `${provider} account unlinked successfully`
    };

  } catch (error) {
    console.error(`❌ Error unlinking ${provider} account:`, error.message);
    throw error;
  }
}

async function getLinkedAccounts(userId) {
  try {
    const user = await User.findById(userId).select("social email isPhoneVerified");

    if (!user) {
      throw new Error("User not found");
    }

    const linkedAccounts = {
      phone: user.isPhoneVerified,
      email: user.email ? true : false,
      google: user.social.google ? {
        email: user.social.google.email,
        linkedAt: user.social.google.linkedAt
      } : null,
      facebook: user.social.facebook ? {
        email: user.social.facebook.email,
        linkedAt: user.social.facebook.linkedAt
      } : null,
      apple: user.social.apple ? {
        email: user.social.apple.email,
        linkedAt: user.social.apple.linkedAt
      } : null
    };

    return linkedAccounts;

  } catch (error) {
    console.error("❌ Error getting linked accounts:", error.message);
    throw error;
  }
}

module.exports = {
  socialLogin,
  linkSocialAccount,
  unlinkSocialAccount,
  getLinkedAccounts,
  findOrCreateSocialUser,
  generateTokens
};
