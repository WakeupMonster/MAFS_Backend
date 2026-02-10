const iapConfig = require("../config/iap.config");
// eslint-disable-next-line no-unused-vars
const { decodeBase64 } = require("../utils/iap.helpers");

class AppleService {
  // ─── Check if Apple is configured ───
  isReady() {
    return iapConfig.apple.isConfigured();
  }

  // ─── Generate API token ───
  generateToken() {
    if (!this.isReady()) {
      console.warn("Apple not configured, using mock mode");
      return "MOCK_TOKEN";
    }

    const jwt = require("jsonwebtoken");
    const fs = require("fs");

    const privateKey = fs.readFileSync(
      iapConfig.apple.privateKeyPath,
      "utf8"
    );

    return jwt.sign(
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
  }

  // ─── Verify transaction with Apple ───
  async verifyTransaction(transactionId) {
    // MOCK MODE - keys nahi hain
    if (!this.isReady()) {
      console.warn("Apple MOCK MODE: Returning mock verification");
      return this.getMockTransactionData(transactionId);
    }

    // REAL MODE - keys hain
    const axios = require("axios");
    const token = this.generateToken();
    const baseUrl = iapConfig.getAppleUrl();

    const response = await axios.get(
      `${baseUrl}/inApps/v1/transactions/${transactionId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    return this.decodeJWS(response.data.signedTransactionInfo);
  }

  // ─── Get subscription status from Apple ───
  async getSubscriptionStatus(originalTransactionId) {
    if (!this.isReady()) {
      console.warn("Apple MOCK MODE: Returning mock status");
      return this.getMockSubscriptionStatus(originalTransactionId);
    }

    const axios = require("axios");
    const token = this.generateToken();
    const baseUrl = iapConfig.getAppleUrl();

    const response = await axios.get(
      `${baseUrl}/inApps/v1/subscriptions/${originalTransactionId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    return response.data;
  }

  // ─── Decode webhook payload ───
  decodeWebhookPayload(signedPayload) {
    const decoded = this.decodeJWS(signedPayload);

    if (decoded.data?.signedTransactionInfo) {
      decoded.transactionInfo = this.decodeJWS(
        decoded.data.signedTransactionInfo
      );
    }

    if (decoded.data?.signedRenewalInfo) {
      decoded.renewalInfo = this.decodeJWS(
        decoded.data.signedRenewalInfo
      );
    }
    return decoded;
  }

  // ─── Decode JWS token ───
  decodeJWS(token) {
    try {
      const parts = token.split(".");
      const payload = JSON.parse(
        Buffer.from(parts[1], "base64").toString("utf8")
      );
      return payload;
    } catch (err) {
      console.error("JWS decode error:", err.message);
      throw new Error("Invalid JWS token");
    }
  }

  // ═══════════════════════════════
  //  MOCK DATA (Testing ke liye)
  // ═══════════════════════════════
  getMockTransactionData(transactionId) {
    return {
      transactionId: transactionId || "MOCK_TXN_001",
      originalTransactionId: "MOCK_ORIG_TXN_001",
      productId: process.env.PRODUCT_MONTHLY_IOS || "com.myapp.premium.monthly",
      purchaseDate: Date.now(),
      expiresDate: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
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
              status: 1, // 1 = active
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