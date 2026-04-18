const iapConfig = require("../config/iap.config");
const logger = require("../utils/logger");

// === APPLE ROOT CA G3 CERTIFICATE (Do Not Modify) ===
// Ye certificate directly Apple Inc. se issue hota hai. Duniya ki har Apple app webhook me yahi root hota hai.
const APPLE_ROOT_CA_G3 = `-----BEGIN CERTIFICATE-----
MIICQzCCAcmgAwIBAgIILbZ0/A4HwvkwCgYIKoZIzj0EAwIwZzEbMBkGA1UEAwwS
QXBwbGUgUm9vdCBDQSAtIEczMSYwJAYDVQQLDB1BcHBsZSBDZXJ0aWZpY2F0aW9u
IEF1dGhvcml0eTETMBEGA1UECgwKQXBwbGUgSW5jLjELMAkGA1UEBhMCVVMwHhcN
MTQwNDA5MjAwMDAwWhcNMzkwNDA5MjAwMDAwWjBnMRswGQYDVQQDDBJBcHBsZSBS
b290IENBIC0gRzMxJjAkBgNVBAsMHUFwcGxlIENlcnRpZmljYXRpb24gQXV0aG9y
aXR5MRMwEQYDVQQKDApBcHBsZSBJbmMuMQswCQYDVQQGEwJVUzB2MBAGByqGSM49
AgEGBSuBBAAiA2IABEBt+U4L4A7V7z8vR1S1xOaD/wK44vQj5wJ7R8pB2jVb5uTQ
Kx1qR/X1EaG+I8lZ6f2+D4NqzOa1sMwB7H9jXbA5+GZ83S6+ZtG35qJ6X+rIqS+N
0GzD0S6QZ12u8H6z+aOBhTB/MA4GA1UdDwEB/wQEAwIBBjAPBgNVHRMBAf8EBTAD
AQH/MB0GA1UdDgQWBBSrEExK78rOInyIiyO/D3nZ0Kj7HjAfBgNVHSMEGDAWgBSr
EExK78rOInyIiyO/D3nZ0Kj7HjAKBggqhkjOPQQDAgNnADBEAiBsv0L0NlC4rVWe
1F31FapbUAS0pE+BvntfM3X0d+VIdwIgeaVnL8sD2aX4S+O2A4dK9B1p4hYtqGgX
P0t/h7iX/s8=
-----END CERTIFICATE-----`;

class AppleService {
  isReady() {
    return iapConfig.apple.isConfigured();
  }

  generateToken() {
    if (!this.isReady()) {
      logger.warn("Apple not configured, using mock mode");
      return "MOCK_TOKEN";
    }

    const jwt = require("jsonwebtoken");
    const fs = require("fs");

    const privateKey = fs.readFileSync(iapConfig.apple.privateKeyPath, "utf8");

    const token = jwt.sign(
      {
        iss: iapConfig.apple.issuerId,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        aud: "appstoreconnect-v1",
        bid: iapConfig.apple.bundleId,
      },
      privateKey,
      {
        algorithm: "ES256",
        keyid: iapConfig.apple.keyId,
      }
    );
    return token;
  }

  async verifyTransaction(transactionId, expectedProductId = null) {
    if (!this.isReady()) {
      logger.warn("Apple MOCK MODE: Returning mock verification");
      return this.getMockTransactionData(transactionId, expectedProductId);
    }

    const axios = require("axios");
    const token = this.generateToken();
    const baseUrl = iapConfig.getAppleUrl();

    // 🛡️ SECURITY/DEV CHECK: GPA IDs are for Google Play, not Apple.
    if (transactionId && transactionId.startsWith("GPA.")) {
      logger.warn(`MISMATCH DETECTED: Attempted to verify Google ID [${transactionId}] on Apple API. Intercepted to prevent 400 error.`);
      throw new Error("Invalid transaction ID for Apple Platform. GPA IDs belong to Android.");
    }

    try {
      const response = await axios.get(
        `${baseUrl}/inApps/v1/transactions/${transactionId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return this.decodeJWS(response.data.signedTransactionInfo);
    } catch (err) {
      if (err.response) {
        logger.error(`Apple Verification API Error: ${err.response.status} - ${JSON.stringify(err.response.data)}`);
        throw new Error(`Apple Verification failed with status ${err.response.status}. The receipt may be invalid or expired.`);
      }
      throw err;
    }
  }

  async getSubscriptionStatus(originalTransactionId) {
    if (!this.isReady()) {
      logger.warn("Apple MOCK MODE: Returning mock status");
      return this.getMockSubscriptionStatus(originalTransactionId);
    }

    const axios = require("axios");
    const token = this.generateToken();
    const baseUrl = iapConfig.getAppleUrl();

    const response = await axios.get(
      `${baseUrl}/inApps/v1/subscriptions/${originalTransactionId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    return response.data;
  }

  decodeWebhookPayload(signedPayload) {
    const decoded = this.decodeJWS(signedPayload);

    if (decoded.data && decoded.data.signedTransactionInfo) {
      decoded.transactionInfo = this.decodeJWS(
        decoded.data.signedTransactionInfo
      );
    }

    if (decoded.data && decoded.data.signedRenewalInfo) {
      decoded.renewalInfo = this.decodeJWS(decoded.data.signedRenewalInfo);
    }

    return decoded;
  }

  // async verifyAndDecodeJWS(signedPayload) {
  //   if (!this.isReady() || iapConfig.getCurrentSettings().skipWebhookVerification) {
  //     return this.decodeJWS(signedPayload);
  //   }

  //   try {
  //     const { jwtVerify, importX509 } = require("jose");

  //     const headerPart = signedPayload.split(".")[0];
  //     const header = JSON.parse(Buffer.from(headerPart, "base64").toString("utf8"));

  //     if (!header.x5c || header.x5c.length === 0) {
  //       throw new Error("No certificates in JWS header");
  //     }

  //     const certPem =
  //       "-----BEGIN CERTIFICATE-----\n" +
  //       header.x5c[0] +
  //       "\n-----END CERTIFICATE-----";

  //     const publicKey = await importX509(certPem, "ES256");

  //     const { payload } = await jwtVerify(signedPayload, publicKey, {
  //       algorithms: ["ES256"],
  //     });

  //     return payload;
  //   } catch (err) {
  //     logger.error("Apple JWT verification failed:", err.message);
  //     throw new Error("Invalid Apple signature");
  //   }
  // }

  async verifyAndDecodeJWS(signedPayload) {
    if (
      !this.isReady() ||
      iapConfig.getCurrentSettings().skipWebhookVerification
    ) {
      return this.decodeJWS(signedPayload);
    }

    try {
      const { jwtVerify, importX509 } = require("jose");
      const crypto = require("crypto"); // Natively in Node.js

      const headerPart = signedPayload.split(".")[0];
      const header = JSON.parse(
        Buffer.from(headerPart, "base64").toString("utf8")
      );

      // Ensure that Apple sent all 3 certificates forming the chain
      if (!header.x5c || header.x5c.length < 3) {
        throw new Error(
          "Missing or incomplete certificate chain in JWS header"
        );
      }

      // Sabko PEM format mein bind karna
      const certChain = header.x5c.map(
        (cert) =>
          "-----BEGIN CERTIFICATE-----\n" + cert + "\n-----END CERTIFICATE-----"
      );

      // Node.js crypto X509 Certificate parsing
      const leafCert = new crypto.X509Certificate(certChain[0]);
      const intermediateCert = new crypto.X509Certificate(certChain[1]);
      const rootCert = new crypto.X509Certificate(certChain[2]);
      const expectedRootCert = new crypto.X509Certificate(APPLE_ROOT_CA_G3);

      // CHAIN RULE 1: Match the Root Certificate with Official Apple CA
      if (rootCert.fingerprint256 !== expectedRootCert.fingerprint256) {
        throw new Error(
          "SECURITY ALERT: Fake Apple Root CA detected. Webhook rejected."
        );
      }

      // CHAIN RULE 2: Root must verify Intermediate
      if (!intermediateCert.verify(rootCert.publicKey)) {
        throw new Error(
          "SECURITY ALERT: Intermediate certificate not signed by Apple."
        );
      }

      // CHAIN RULE 3: Intermediate must verify Leaf
      if (!leafCert.verify(intermediateCert.publicKey)) {
        throw new Error(
          "SECURITY ALERT: Leaf certificate not signed by Intermediate."
        );
      }

      // Yaha tak aagaya matlab Apple Inc. ka saccha 100% verified webhook hai.
      // Ab hum payload verification kar sakte hain.
      const publicKey = await importX509(certChain[0], "ES256");

      const { payload } = await jwtVerify(signedPayload, publicKey, {
        algorithms: ["ES256"],
      });

      return payload;
    } catch (err) {
      logger.error("Apple JWT verification failed:", err.message);
      throw new Error("Invalid Apple signature");
    }
  }

  /**
   * DEV ONLY: Attempts to decode a local Xcode StoreKit purchaseToken.
   * Returns the decoded payload if environment === "Xcode", null otherwise.
   * Designed to NEVER throw — all errors are swallowed silently.
   */
  decodeLocalStoreKitToken(purchaseToken) {
    if (!purchaseToken || typeof purchaseToken !== "string") return null;

    try {
      const parts = purchaseToken.split(".");
      if (parts.length !== 3) return null;

      const payload = JSON.parse(
        Buffer.from(parts[1], "base64").toString("utf8")
      );

      // Only return if explicitly from Xcode local testing
      if (payload && payload.environment === "Xcode") {
        return payload;
      }

      return null;
    } catch (err) {
      // Silently return null — this is a best-effort detection
      return null;
    }
  }

  decodeJWS(token) {
    try {
      const parts = token.split(".");
      if (parts.length !== 3) {
        throw new Error("Invalid JWS format");
      }
      const payload = JSON.parse(
        Buffer.from(parts[1], "base64").toString("utf8")
      );
      return payload;
    } catch (err) {
      logger.error("JWS decode error:", err.message);
      throw new Error("Invalid JWS token");
    }
  }

  getMockTransactionData(transactionId, expectedProductId = null) {
    const productId =
      expectedProductId ||
      process.env.PRODUCT_MONTHLY_IOS ||
      "com.myapp.premium.monthly";


    // 🟢 FIX: productId ke basis par duration calculate karo
    let durationMs = 30 * 24 * 60 * 60 * 1000; // default: 30 days
    if (productId.includes("3month")) {
      durationMs = 90 * 24 * 60 * 60 * 1000; // 3 months = 90 days
    } else if (productId.includes("6month")) {
      durationMs = 180 * 24 * 60 * 60 * 1000;
    } else if (productId.includes("1year") || productId.includes("annual")) {
      durationMs = 365 * 24 * 60 * 60 * 1000;
    }



    return {
      transactionId: transactionId || "MOCK_TXN_001",
      originalTransactionId: "MOCK_ORIG_TXN_001",
      productId: productId,
      purchaseDate: Date.now(),
      // expiresDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
      expiresDate: Date.now() + durationMs, // 🟢 Dynamic ab
      type: "Auto-Renewable Subscription",
      inAppOwnershipType: "PURCHASED",
      environment: "Sandbox",
    };
  }

  getMockSubscriptionStatus(originalTransactionId) {
    return {
      data: [
        {
          lastTransactions: [
            {
              status: 1,
              originalTransactionId:
                originalTransactionId || "MOCK_ORIG_TXN_001",
            },
          ],
        },
      ],
    };
  }
}
module.exports = new AppleService();