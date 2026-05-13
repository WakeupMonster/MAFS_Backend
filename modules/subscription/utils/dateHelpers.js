const { DateTime } = require('luxon');

/**
 * Helper functions for AEST (Australia/Sydney) timezone calculations.
 * Ensures all logic adheres to the client requirement of AEST-based resets.
 */
const dateHelpers = {
    /**
     * Get current time in Australia/Sydney
     */
    getAESTNow: () => {
        const tz = process.env.APP_TIMEZONE || 'Australia/Sydney';
        return DateTime.now().setZone(tz);
    },

    /**
     * Get Daily Key for usage tracking (e.g., "2026-03-07")
     */
    getDateKey: () => {
        return dateHelpers.getAESTNow().toFormat('yyyy-LL-dd');
    },

    /**
     * Get Weekly Key for usage tracking (e.g., "2026-10" for week 10)
     * We use ISO week numbering which starts on Monday.
     */
    getWeekKey: () => {
        return dateHelpers.getAESTNow().toFormat('kkkk-WW');
    },

    /**
     * Get Monthly Key for usage tracking (e.g., "2026-03")
     */
    getMonthKey: () => {
        return dateHelpers.getAESTNow().toFormat('yyyy-LL');
    },

    /**
     * Get UTC Reset Time for the next period (Daily/Weekly/Monthly)
     * Critical for Flutter apps to show "Resets in X hours" countdown.
     */
    getDailyResetTime: () => {
        return dateHelpers.getAESTNow().plus({ days: 1 }).startOf('day').toJSDate();
    },

    getWeeklyResetTime: () => {
        // Start of next Monday (ISO Week)
        return dateHelpers.getAESTNow().plus({ weeks: 1 }).startOf('week').toJSDate();
    },

    getMonthlyResetTime: () => {
        // Start of next calendar month
        return dateHelpers.getAESTNow().plus({ months: 1 }).startOf('month').toJSDate();
    }
};

module.exports = dateHelpers;
