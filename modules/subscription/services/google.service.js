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

    const client = await this.getClient();

    const result = await client.purchases.subscriptions.get({
      packageName: iapConfig.google.packageName,
      subscriptionId: subscriptionId,
      token: purchaseToken,
    });

    return result.data;
  }

  async acknowledgePurchase(subscriptionId, purchaseToken) {
    if (!this.isReady()) {
      logger.warn("Google MOCK MODE: Skipping acknowledge");
      return;
    }

    const client = await this.getClient();

    await client.purchases.subscriptions.acknowledge({
      packageName: iapConfig.google.packageName,
      subscriptionId: subscriptionId,
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

  // eslint-disable-next-line no-unused-vars
  getMockSubscriptionData(subscriptionId) {
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
}

module.exports = new GoogleService();