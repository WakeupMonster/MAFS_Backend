/**
 * Apple OAuth Provider
 * Verifies Apple ID tokens and extracts user information
 */

const jwt = require("jsonwebtoken");

// ✅ FIX: Use dynamic import for node-fetch (ES Module)
let fetch;

(async () => {
  fetch = (await import("node-fetch")).default;
})();

/**
 * Get Apple's public keys for token verification
 * Apple publishes their public keys at a well-known URL
 * 
 * @returns {Promise<Object>} Apple's public keys
 */
async function getApplePublicKeys() {
  try {
    const response = await fetch("https://appleid.apple.com/auth/keys");
    
    if (!response.ok) {
      throw new Error("Failed to fetch Apple public keys");
    }

    const data = await response.json();
    return data.keys;

  } catch (error) {
    console.error("❌ Failed to get Apple public keys:", error.message);
    throw new Error(`Failed to fetch Apple keys: ${error.message}`);
  }
}

/**
 * Find the correct public key for token verification
 * 
 * @param {Array} keys - Apple's public keys
 * @param {string} kid - Key ID from token header
 * @returns {Object} The matching public key
 */
function findPublicKey(keys, kid) {
  const key = keys.find(k => k.kid === kid);
  
  if (!key) {
    throw new Error(`Public key with kid ${kid} not found`);
  }

  return key;
}

/**
 * Convert Apple's JWK to PEM format
 * 
 * @param {Object} key - Apple's public key in JWK format
 * @returns {string} PEM formatted public key
 */
function jwkToPem(key) {
  try {
    // Use jsonwebtoken's built-in support for JWK
    // Or use a library like 'jwk-to-pem'
    const crypto = require("crypto");
    
    // For RS256, we need to construct the PEM from JWK
    // This is a simplified version - in production, use 'jwk-to-pem' package
    const publicKey = crypto.createPublicKey({
      key: {
        kty: key.kty,
        n: key.n,
        e: key.e
      },
      format: "jwk"
    });

    return publicKey.export({ format: "pem", type: "spki" });

  } catch (error) {
    console.error("❌ Failed to convert JWK to PEM:", error.message);
    throw new Error("Failed to process Apple public key");
  }
}

/**
 * Verify Apple ID Token
 * 
 * @param {string} idToken - Apple ID token from frontend
 * @returns {Promise<Object>} User info from Apple
 * 
 * @example
 * const userInfo = await verifyAppleToken(idToken);
 * // Returns: { id, email, name }
 */
async function verifyAppleToken(idToken) {
  try {
    if (!idToken) {
      throw new Error("ID token is required");
    }

    // Step 1: Decode token header to get key ID
    const decoded = jwt.decode(idToken, { complete: true });
    
    if (!decoded) {
      throw new Error("Invalid token format");
    }

    const { header, payload } = decoded;
    const kid = header.kid;

    // Step 2: Get Apple's public keys
    const appleKeys = await getApplePublicKeys();
    const publicKey = findPublicKey(appleKeys, kid);

    // Step 3: Convert JWK to PEM
    const pem = jwkToPem(publicKey);

    // Step 4: Verify token signature
    const verified = jwt.verify(idToken, pem, {
      algorithms: ["RS256"],
      audience: process.env.APPLE_BUNDLE_ID,
      issuer: "https://appleid.apple.com"
    });

    // Step 5: Validate required fields
    if (!verified.sub) {
      throw new Error("User ID (sub) not found in Apple token");
    }

    // Apple may not always provide email in token
    // Email is only provided on first login
    const email = verified.email || null;

    // Return standardized user info
    return {
      provider: "apple",
      id: verified.sub,                  // Apple user ID
      email: email,
      name: verified.name || "",         // May be null
      email_verified: verified.email_verified || false,
      raw: verified
    };

  } catch (error) {
    console.error("❌ Apple token verification failed:", error.message);
    
    // Handle specific errors
    if (error.message.includes("expired")) {
      throw new Error("Apple token expired. Please login again.");
    }

    if (error.message.includes("audience")) {
      throw new Error("Invalid token audience. Check APPLE_BUNDLE_ID.");
    }

    if (error.message.includes("issuer")) {
      throw new Error("Invalid token issuer.");
    }

    throw new Error(`Apple verification failed: ${error.message}`);
  }
}

/**
 * Generate Apple client secret (JWT)
 * Required for server-to-server communication with Apple
 * 
 * @returns {string} Apple client secret JWT
 */
function generateAppleClientSecret() {
  try {
    if (!process.env.APPLE_PRIVATE_KEY || !process.env.APPLE_KEY_ID || !process.env.APPLE_TEAM_ID) {
      throw new Error("Missing Apple credentials in environment");
    }

    const now = Math.floor(Date.now() / 1000);
    const expiresIn = now + 15 * 60; // 15 minutes

    const payload = {
      iss: process.env.APPLE_TEAM_ID,
      iat: now,
      exp: expiresIn,
      aud: "https://appleid.apple.com",
      sub: process.env.APPLE_BUNDLE_ID
    };

    const privateKey = process.env.APPLE_PRIVATE_KEY.replace(/\\n/g, "\n");

    const clientSecret = jwt.sign(payload, privateKey, {
      algorithm: "ES256",
      keyid: process.env.APPLE_KEY_ID
    });

    return clientSecret;

  } catch (error) {
    console.error("❌ Failed to generate Apple client secret:", error.message);
    throw new Error(`Failed to generate client secret: ${error.message}`);
  }
}

module.exports = {
  verifyAppleToken,
  generateAppleClientSecret
};
