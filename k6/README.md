# k6 Load Testing: /auth/phone Starter

This folder contains the k6 load testing scripts and data for the Authentication flow.

## 1. Prerequisites

- **k6**: [Install k6](https://k6.io/docs/getting-started/installation/)
- **Node.js**: Required for helper scripts.
- **Environment**: Add `AUTH_TEST_BYPASS_SMS=true` to your `.env` for non-production environments.

---

## 2. Setup & Data Generation

Before running the test, generate the test phone numbers:

```bash
# Default (100 users)
node scripts/generate_k6_data.js

# Custom (e.g., 10,000 users)
set COUNT=10000 && node scripts/generate_k6_data.js
```

---

## 3. Running the Tests

### Local Smoke Test (100 Users)
Simulates 100 users ramping up to test the OTP generation logic.

```bash
k6 run k6/scripts/auth_phone.js --env BASE_URL=http://localhost:5000/api/v1
```

### Staging / Perf Environment
Run the test against your staging or performance cluster.

```bash
k6 run k6/scripts/auth_phone.js --env BASE_URL=https://staging.api.mafs.com/api/v1
```

### Scaling User Count
To scale to 1,000 or 10,000 users:
1. Update `stages` in `k6/scripts/auth_phone.js`.
2. Generate more test data: `set COUNT=10000 && node scripts/generate_k6_data.js`.
3. Increase `maxVUs` and `preAllocatedVUs` in the k6 script `options`.

---

## 4. Cleanup Strategy

Keep your database and Redis clean after tests.

### Soft Cleanup (Preserve users, clear sessions/OTP)
Recommended for repeated runs.

```bash
node scripts/purge_test_data.js
```

### Hard Cleanup (Full purge of test users)
Use this when you want to reset the environment completely.

```bash
node scripts/purge_test_data.js --hard
```

---

## 5. Safeguards

This setup uses a **bypass** for SMS messages:
- Only active if `NODE_ENV !== 'production'`.
- Only active if `AUTH_TEST_BYPASS_SMS === 'true'`.
- Only triggers for numbers starting with **`+1000`**.

This prevents accidental SMS costs and production pollution.
