const path = require("path");
const fs = require("fs");

const config = {
  apple: {
    bundleId: process.env.APPLE_BUNDLE_ID,
    keyId: process.env.APPLE_KEY_ID,
    issuerId: process.env.APPLE_ISSUER_ID,
    privateKeyPath: process.env.APPLE_PRIVATE_KEY_PATH
      ? path.resolve(process.env.APPLE_PRIVATE_KEY_PATH)
      : null,
    sharedSecret: process.env.APPLE_SHARED_SECRET,
    environment: process.env.APPLE_ENVIRONMENT || "sandbox",
    urls: {
      sandbox: "https://api.storekit-sandbox.itunes.apple.com",
      production: "https://api.storekit.itunes.apple.com",
    },
    isConfigured() {
      return (
        this.keyId &&
        this.keyId !== "PLACEHOLDER" &&
        this.issuerId &&
        this.issuerId !== "PLACEHOLDER" &&
        this.privateKeyPath &&
        fs.existsSync(this.privateKeyPath)
      );
    },
  },

  google: {
    packageName: process.env.GOOGLE_PACKAGE_NAME,
    serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH
      ? path.resolve(process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH)
      : null,
    environment: process.env.GOOGLE_ENVIRONMENT || "sandbox",
    isConfigured() {
      return (
        this.serviceAccountKeyPath && fs.existsSync(this.serviceAccountKeyPath)
      );
    },
  },

  products: {},

  getProductDetails(productId) {
    return this.products[productId] || null;
  },

  getAppleUrl() {
    return this.apple.environment === "production"
      ? this.apple.urls.production
      : this.apple.urls.sandbox;
  },

  isMockMode() {
    return !this.apple.isConfigured() && !this.google.isConfigured();
  },

  getCurrentSettings() {
    const env = process.env.NODE_ENV || "development";
    const settings = {
      development: {
        allowMockMode: true,
        skipWebhookVerification: true,
        skipStoreVerification: true,
      },
      staging: {
        allowMockMode: false,
        skipWebhookVerification: false,
        skipStoreVerification: false,
      },
      production: {
        allowMockMode: false,
        skipWebhookVerification: false,
        skipStoreVerification: false,
      },
    };
    return settings[env] || settings.development;
  },
};

// Products dynamically set karo
const monthlyIos =
  process.env.PRODUCT_MONTHLY_IOS || "com.myapp.premium.monthly";
const yearlyIos = process.env.PRODUCT_YEARLY_IOS || "com.myapp.premium.yearly";
const monthlyAndroid =
  process.env.PRODUCT_MONTHLY_ANDROID || "com.myapp.premium.monthly";
const yearlyAndroid =
  process.env.PRODUCT_YEARLY_ANDROID || "com.myapp.premium.yearly";

config.products[monthlyIos] = {
  planType: "monthly",
  platform: "ios",
  price: 9.99,
  currency: "USD",
};
config.products[yearlyIos] = {
  planType: "yearly",
  platform: "ios",
  price: 49.99,
  currency: "USD",
};
config.products[monthlyAndroid] = {
  planType: "monthly",
  platform: "android",
  price: 9.99,
  currency: "USD",
};
config.products[yearlyAndroid] = {
  planType: "yearly",
  platform: "android",
  price: 49.99,
  currency: "USD",
};

module.exports = config;
