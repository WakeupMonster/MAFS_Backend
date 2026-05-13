const iapConfig = require("../config/iap.config");
const logger = require("../utils/logger");
const { GOOGLE_EVENT_MAP } = require("../utils/iap.helpers");

class GoogleService {
  constructor() {
    this.androidPublisher = null;
  }

  isReady() {
    return iapConfig.google.isConfigured();
  }

  async getClient() {
    if (!this.isReady()) {
      logger.warn("Google not configured, using mock mode");
      return null;
    }

    if (this.androidPublisher) return this.androidPublisher;

    const { google } = require("googleapis");

    const auth = new google.auth.GoogleAuth({
      keyFile: iapConfig.google.serviceAccountKeyPath,
      scopes: ["https://www.googleapis.com/auth/androidpublisher"],
    });

    this.androidPublisher = google.androidpublisher({ version: "v3", auth });
    return this.androidPublisher;
  }

  async verifySubscription(subscriptionId, purchaseToken) {
    if (!this.isReady()) {
      logger.warn("Google MOCK MODE: Returning mock verification");
      return this.getMockSubscriptionData(subscriptionId);
    }

    console.log("=== GOOGLE SUBSCRIPTION VERIFY ===");
    console.log("Package Name:", iapConfig.google.packageName);
    console.log("Subscription ID:", subscriptionId);
    console.log("Token:", purchaseToken ? purchaseToken.substring(0, 15) + "..." : "null");

    try {
      const client = await this.getClient();

      const result = await client.purchases.subscriptions.get({
        packageName: iapConfig.google.packageName,
        subscriptionId: subscriptionId,
        token: purchaseToken,
      });

      console.log("✅ Google API Success:", result.data.orderId || "OK");
      return result.data;
    } catch (error) {
      console.log("❌ Google API Error:", error.message);
      console.log("Error Code:", error.code);
      console.log("Status:", error.status);
      throw error;
    }
  }

  async acknowledgePurchase(subscriptionId, purchaseToken) {
    if (!this.isReady()) {
      logger.warn("Google MOCK MODE: Skipping acknowledge");
      return;
    }

    console.log("📍 Google API: Attempting Acknowledge...");
    try {
      const client = await this.getClient();

      await client.purchases.subscriptions.acknowledge({
        packageName: iapConfig.google.packageName,
        subscriptionId: subscriptionId,
        token: purchaseToken,
      });
      console.log("✅ Google API: Acknowledge Success");
    } catch (error) {
      console.log("⚠️ Google API Acknowledge Warning:", error.message);
      // Agar pehle se acknowledged hai toh error ignore karo taaki verification fail na ho
      if (error.message.includes("already owned") || error.code === 400) {
        console.log("ℹ️ Purchase might already be acknowledged, proceeding...");
        return;
      }
      throw error;
    }
  }

  async verifyConsumable(productId, purchaseToken) {
    if (!this.isReady()) {
      logger.warn("Google MOCK MODE: Returning mock consumable verification");
      return this.getMockConsumableData(productId);
    }

    console.log("=== GOOGLE CONSUMABLE VERIFY ===");
    console.log("Package Name:", iapConfig.google.packageName);
    console.log("Product ID:", productId);
    console.log("Token:", purchaseToken ? purchaseToken.substring(0, 15) + "..." : "null");

    try {
      const client = await this.getClient();

      const result = await client.purchases.products.get({
        packageName: iapConfig.google.packageName,
        productId: productId,
        token: purchaseToken,
      });

      console.log("✅ Google API Success:", result.data.orderId || "OK");
      return result.data;
    } catch (error) {
      console.log("❌ Google API Error:", error.message);
      console.log("Error Code:", error.code);
      console.log("Status:", error.status);
      throw error;
    }
  }

  async acknowledgeConsumable(productId, purchaseToken) {
    if (!this.isReady()) {
      logger.warn("Google MOCK MODE: Skipping consumable acknowledge");
      return;
    }

    const client = await this.getClient();

    // The acknowledge request body might require developerPayload, but commonly just token is enough for simple ack.
    // Ensure that it's actually required to call acknowledge for one-time products. Yes, it's recommended or Google may refund.
    await client.purchases.products.acknowledge({
      packageName: iapConfig.google.packageName,
      productId: productId,
      token: purchaseToken,
    });
  }

  decodeWebhookPayload(messageData) {
    const decoded = JSON.parse(Buffer.from(messageData, "base64").toString("utf8"));
    return decoded;
  }

  getEventName(notificationType) {
    return GOOGLE_EVENT_MAP[notificationType] || "UNKNOWN";
  }

  getMockSubscriptionData() {
    return {
      startTimeMillis: String(Date.now()),
      expiryTimeMillis: String(Date.now() + 30 * 24 * 60 * 60 * 1000),
      autoRenewing: true,
      paymentState: 1,
      orderId: "GPA.MOCK-1111-2222-3333",
      cancelReason: 0,
      acknowledgementState: 1,
    };
  }

  getMockConsumableData() {
    return {
      purchaseTimeMillis: String(Date.now()),
      purchaseState: 0,
      consumptionState: 0,
      orderId: "GPA.MOCK-CONSUMABLE-9999",
      acknowledgementState: 0,
    };
  }
}

module.exports = new GoogleService();
