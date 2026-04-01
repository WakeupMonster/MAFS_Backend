// k6/lib/constants.js

export const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000/api/v1';

export const ENDPOINTS = {
    AUTH_PHONE: `${BASE_URL}/auth/phone`,
    AUTH_VERIFY: `${BASE_URL}/auth/verify`,
};

export const TEST_CONFIG = {
    PHONE_PREFIX: '+1000',
};
