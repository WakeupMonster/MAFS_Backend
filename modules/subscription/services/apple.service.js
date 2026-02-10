const iapConfig = require("../config/iap.config");
const logger = require("../utils/logger");

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

  async verifyTransaction(transactionId) {
    if (!this.isReady()) {
      logger.warn("Apple MOCK MODE: Returning mock verification");
      return this.getMockTransactionData(transactionId);
    }

    const axios = require("axios");
    const token = this.generateToken();
    const baseUrl = iapConfig.getAppleUrl();

    const response = await axios.get(
      `${baseUrl}/inApps/v1/transactions/${transactionId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    return this.decodeJWS(response.data.signedTransactionInfo);
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
      decoded.transactionInfo = this.decodeJWS(decoded.data.signedTransactionInfo);
    }

    if (decoded.data && decoded.data.signedRenewalInfo) {
      decoded.renewalInfo = this.decodeJWS(decoded.data.signedRenewalInfo);
    }

    return decoded;
  }

  async verifyAndDecodeJWS(signedPayload) {
    if (!this.isReady() || iapConfig.getCurrentSettings().skipWebhookVerification) {
      return this.decodeJWS(signedPayload);
    }

    try {
      const { jwtVerify, importX509 } = require("jose");

      const headerPart = signedPayload.split(".")[0];
      const header = JSON.parse(Buffer.from(headerPart, "base64").toString("utf8"));

      if (!header.x5c || header.x5c.length === 0) {
        throw new Error("No certificates in JWS header");
      }

      const certPem =
        "-----BEGIN CERTIFICATE-----\n" +
        header.x5c[0] +
        "\n-----END CERTIFICATE-----";

      const publicKey = await importX509(certPem, "ES256");

      const { payload } = await jwtVerify(signedPayload, publicKey, {
        algorithms: ["ES256"],
      });

      return payload;
    } catch (err) {
      logger.error("Apple JWT verification failed:", err.message);
      throw new Error("Invalid Apple signature");
    }
  }

  decodeJWS(token) {
    try {
      const parts = token.split(".");
      if (parts.length !== 3) {
        throw new Error("Invalid JWS format");
      }
      const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf8"));
      return payload;
    } catch (err) {
      logger.error("JWS decode error:", err.message);
      throw new Error("Invalid JWS token");
    }
  }

  getMockTransactionData(transactionId) {
    const productId = process.env.PRODUCT_MONTHLY_IOS || "com.myapp.premium.monthly";
    return {
      transactionId: transactionId || "MOCK_TXN_001",
      originalTransactionId: "MOCK_ORIG_TXN_001",
      productId: productId,
      purchaseDate: Date.now(),
      expiresDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
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
              originalTransactionId: originalTransactionId || "MOCK_ORIG_TXN_001",
            },
          ],
        },
      ],
    };
  }
}

module.exports = new AppleService();