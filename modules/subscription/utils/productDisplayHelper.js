const Product = require("../models_v3/Product");

class ProductDisplayHelper {
    constructor() {
        this.cache = null;
        this.cacheExpires = 0;
        this.TTL = 5 * 60 * 1000; // 5 minutes
    }

    async getProductMap() {
        if (!this.cache || Date.now() > this.cacheExpires) {
            const products = await Product.find().select('productKey appleProductId googleProductId displayName planType').lean();
            const map = {};
            products.forEach(p => {
                if (p.productKey) map[p.productKey] = p.displayName;
                if (p.appleProductId) map[p.appleProductId] = p.displayName;
                if (p.googleProductId) map[p.googleProductId] = p.displayName;
            });
            this.cache = map;
            this.cacheExpires = Date.now() + this.TTL;
        }
        return this.cache;
    }

    /**
     * Resolves the display name for a given productId.
     * Uses the cached Product catalog, with fallbacks for legacy/test IDs.
     */
    async resolveDisplayName(productId, customDisplayName = null, source = null) {
        if (customDisplayName && (source === 'GIVEAWAY' || source === 'MILESTONE')) {
            return customDisplayName;
        }

        const map = await this.getProductMap();
        
        if (productId && map[productId]) {
            return map[productId];
        }

        // Fallbacks for dynamically generated or legacy IDs not in Product catalog
        if (!productId) return "Unknown Product";

        // Map manual/legacy IDs to standard names
        if (productId.startsWith("manual_")) {
            const suffix = productId.replace("manual_", "").toLowerCase();
            if (["monthly", "1_month", "1 month"].includes(suffix)) return "1 Month Premium";
            if (["quarterly", "3_months", "3_month", "3 month", "3 months"].includes(suffix)) return "3 Months Premium";
            if (["biannually", "6_months", "6_month", "6 month", "6 months"].includes(suffix)) return "6 Months Premium";
            if (["annually", "yearly", "12_months", "12_month", "12 month", "12 months"].includes(suffix)) return "12 Months Premium";
            
            const parts = productId.split("_").slice(1);
            if (parts.length > 0) {
                const planName = parts.map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(" ");
                return `Manual ${planName}`;
            }
            return "Manual Grant";
        }

        if (productId === "giveaway_prize") {
            return customDisplayName || "Giveaway Winner";
        }

        if (productId.startsWith("test_")) {
            return "Test Plan";
        }

        // Default: just format the raw ID nicely if possible, or return as is
        return productId;
    }

    /**
     * Enriches an array of records with `displayName` in-place or returns a new array.
     */
    async enrichWithDisplayName(records, idField = 'productId') {
        if (!records || !Array.isArray(records) || records.length === 0) return records;
        
        const map = await this.getProductMap();

        return records.map(record => {
            let displayName = "Unknown Product";
            const pid = record[idField];

            if (record.customDisplayName && (record.source === 'GIVEAWAY' || record.source === 'MILESTONE')) {
                displayName = record.customDisplayName;
            } else if (pid && map[pid]) {
                displayName = map[pid];
            } else if (pid) {
                if (pid.startsWith("manual_")) {
                    const parts = pid.split("_").slice(1);
                    if (parts.length > 0) {
                        const planName = parts.map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(" ");
                        displayName = `Manual ${planName}`;
                    } else {
                        displayName = "Manual Grant";
                    }
                } else if (pid === "giveaway_prize") {
                    displayName = record.customDisplayName || "Giveaway Winner";
                } else if (pid.startsWith("test_")) {
                    displayName = "Test Plan";
                } else {
                    displayName = pid;
                }
            }

            return {
                ...record,
                displayName
            };
        });
    }
}

module.exports = new ProductDisplayHelper();
