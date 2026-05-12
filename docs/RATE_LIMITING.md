# 🛡️ MAFS Backend — API Rate Limiting Documentation

**Version:** 1.0  
**Date:** 11 May 2026  
**Author:** Backend Team  
**Status:** ✅ Implemented & Live  

---

## 📌 Overview

Rate limiting has been implemented across **all MAFS backend APIs** to protect against abuse, brute-force attacks, spam, and excessive resource consumption. The system uses **Redis-based distributed rate limiting**, ensuring limits are enforced consistently across all server instances.

### How It Works

- Every API endpoint has a configured **maximum number of requests** allowed within a **time window**
- Limits are tracked **per user** (authenticated routes) or **per IP address** (public/auth routes)
- When a user exceeds the limit, the API returns a **`429 Too Many Requests`** response
- Limits automatically reset after the time window expires

### 429 Response Format

When rate limited, the API returns:

```json
{
  "success": false,
  "message": "You are doing this too fast. Please wait a moment."
}
```

> **Frontend Action Required:** The app should catch `429` status codes and display a user-friendly message like *"Please wait a moment before trying again"* instead of showing a generic error.

---

## 🔐 1. Authentication Module

These limits protect login and OTP endpoints from brute-force attacks.

| Endpoint | Method | Limit | Window | Tracked By | Why |
|----------|--------|-------|--------|------------|-----|
| `/api/v1/auth/phone` | POST | 3 requests | 5 minutes | User ID / IP | Prevents OTP SMS spam (costs money per SMS) |
| `/api/v1/auth/verify` | POST | 5 requests | 5 minutes | User ID / IP | Prevents OTP brute-force guessing |
| `/api/v1/auth/phonetest` | POST | 3 requests | 5 minutes | User ID / IP | Same as phone OTP |
| `/api/v1/auth/verifytestotp` | POST | 5 requests | 5 minutes | User ID / IP | Same as verify |
| `/api/v1/auth/register/email` | POST | 3 requests | 5 minutes | User ID / IP | Prevents email OTP spam |
| `/api/v1/auth/verify/email` | POST | 5 requests | 5 minutes | User ID / IP | Prevents email OTP brute-force |
| `/api/v1/auth/resend/phone` | POST | 3 requests | 5 minutes | User ID / IP | Prevents resend spam |
| `/api/v1/auth/resend/email` | POST | 3 requests | 5 minutes | User ID / IP | Prevents resend spam |
| `/api/v1/auth/refresh` | POST | 10 requests | 1 minute | User ID / IP | Prevents token refresh abuse |
| `/api/v1/auth/logout` | POST | No limit | — | — | Low risk action |

### Social Authentication

| Endpoint | Method | Limit | Window | Tracked By | Why |
|----------|--------|-------|--------|------------|-----|
| `/api/v1/auth/social/login` | POST | 10 requests | 5 minutes | User ID / IP | Prevents credential stuffing attacks |

---

## 👤 2. Profile Module

These limits protect against data scraping and excessive profile modifications.

### Profile Read Operations

| Endpoint | Method | Limit | Window | Tracked By | Why |
|----------|--------|-------|--------|------------|-----|
| `/api/v1/profile/me` | GET | 30 requests | 1 minute | User ID | Prevents excessive polling |
| `/api/v1/profile/status` | GET | 30 requests | 1 minute | User ID | Prevents excessive polling |
| `/api/v1/profile/:userId` | GET | 60 requests | 1 minute | User ID | Prevents mass profile scraping |
| `/api/v1/profile/config` | GET | 20 requests | 1 minute | User ID | Prevents config polling abuse |
| `/api/v1/profile/verification-status` | GET | 20 requests | 1 minute | User ID | Prevents polling abuse |

### Profile Write Operations

| Endpoint | Method | Limit | Window | Tracked By | Why |
|----------|--------|-------|--------|------------|-----|
| `/api/v1/profile/update` | PATCH | 40 requests | 1 hour | User ID | Prevents rapid profile manipulation |
| `/api/v1/profile/photos` | POST | 10 requests | 1 hour | User ID | Prevents upload abuse (storage costs) |
| `/api/v1/profile/photos` | DELETE | 10 requests | 1 hour | User ID | Prevents mass photo deletion |
| `/api/v1/profile/photos/reorder` | PATCH | 10 requests | 1 hour | User ID | Prevents excessive reordering |
| `/api/v1/profile/selfie` | POST | 5 requests | 1 hour | User ID | Prevents selfie upload spam |
| `/api/v1/profile/id-document` | POST | 3 requests | 1 hour | User ID | Prevents KYC document spam |
| `/api/v1/profile/location` | POST | 20 requests | 1 minute | User ID | Prevents location spamming |
| `/api/v1/profile/visibility` | PATCH | 10 requests | 1 minute | User ID | Prevents rapid toggling |
| `PATCH /` (preferences) | PATCH | 20 requests | 1 minute | User ID | Prevents rapid preference changes |

### Discovery Preferences

| Endpoint | Method | Limit | Window | Tracked By | Why |
|----------|--------|-------|--------|------------|-----|
| `/api/v1/profile/discovery-preference` | PATCH | 10 requests | 1 minute | User ID | Prevents filter spam |
| `/api/v1/profile/discovery-preference/reset` | PATCH | 10 requests | 1 minute | User ID | Prevents reset spam |

### Block & Report Actions

| Endpoint | Method | Limit | Window | Tracked By | Why |
|----------|--------|-------|--------|------------|-----|
| `/api/v1/profile/block/:id` | POST | 10 requests | 1 hour | User ID | Prevents mass blocking abuse |
| `/api/v1/profile/unblock/:id` | DELETE | 10 requests | 1 hour | User ID | Prevents mass unblock abuse |
| `/api/v1/profile/blocked/all` | GET | 20 requests | 1 minute | User ID | Prevents list polling |
| `/api/v1/profile/block-list` | GET | 20 requests | 1 minute | User ID | Prevents list polling |
| `/api/v1/profile/report/:id` | POST | 5 requests | 1 hour | User ID | Prevents false mass reporting |

---

## 💘 3. Swipe & Matching Module

These limits control core dating features to maintain fair usage and prevent automated swiping.

| Endpoint | Method | Limit | Window | Tracked By | Why |
|----------|--------|-------|--------|------------|-----|
| `/api/v1/swipe/feed` | GET | 30 requests | 1 minute | User ID | Prevents feed scraping / data harvesting |
| `/api/v1/swipe/action` | POST | 40 requests | 1 minute | User ID | Controls swipe speed (anti-bot) |
| `/api/v1/swipe/unmatch` | POST | 5 requests | 1 hour | User ID | Prevents mass unmatch abuse |
| `/api/v1/swipe/undo` | POST | 5 requests | 1 minute | User ID | Prevents undo feature abuse |
| `/api/v1/swipe/matches` | GET | 30 requests | 1 minute | User ID | Prevents match list scraping |
| `/api/v1/swipe/keen` | GET | 20 requests | 1 minute | User ID | Prevents keen list scraping |
| `/api/v1/swipe/superkeen` | GET | 20 requests | 1 minute | User ID | Prevents superkeen list scraping |

---

## 💬 4. Chat Module

These limits protect against chat spam and upload abuse.

| Endpoint | Method | Limit | Window | Tracked By | Why |
|----------|--------|-------|--------|------------|-----|
| `/api/v1/chat/messages/:matchId` | GET | 30 requests | 1 minute | User ID | Prevents chat history scraping |
| `/api/v1/chat/list` | GET | 30 requests | 1 minute | User ID | Prevents chat list scraping |
| `/api/v1/chat/send` | POST | 30 requests | 1 minute | User ID | Prevents message spam / flooding |
| `/api/v1/chat/upload-media` | POST | 10 requests | 1 minute | User ID | Prevents media upload abuse (storage costs) |

---

## 🚀 5. Boost Module

Tight limits to prevent feature abuse.

| Endpoint | Method | Limit | Window | Tracked By | Why |
|----------|--------|-------|--------|------------|-----|
| `/api/v1/boost/activate` | POST | 3 requests | 1 hour | User ID | Prevents boost spam / feature abuse |
| `/api/v1/boost/deactivate` | POST | 3 requests | 1 hour | User ID | Prevents rapid toggle abuse |

---

## 🎁 6. Giveaway Module

Critical limits to prevent prize fraud.

| Endpoint | Method | Limit | Window | Tracked By | Why |
|----------|--------|-------|--------|------------|-----|
| `/api/v1/giveaway/claim` | POST | 3 requests | 1 minute | User ID | **Critical:** Prevents prize claim fraud |
| `/api/v1/giveaway/info` | GET | 20 requests | 1 minute | User ID | Prevents polling abuse |
| `/api/v1/giveaway/my-giveaways` | GET | 20 requests | 1 minute | User ID | Prevents polling abuse |

---

## 📱 7. Notifications Module

| Endpoint | Method | Limit | Window | Tracked By | Why |
|----------|--------|-------|--------|------------|-----|
| `/api/v1/notifications/register-token` | POST | 5 requests | 1 hour | User ID | Prevents token registration spam |
| `/api/v1/notifications/unregister-token` | DELETE | 5 requests | 1 hour | User ID | Prevents token removal spam |
| `/api/v1/notifications` | GET | 20 requests | 1 minute | User ID | Prevents settings polling |
| `/api/v1/notifications` | PATCH | 10 requests | 1 minute | User ID | Prevents rapid settings changes |

---

## 📇 8. Contacts Module

| Endpoint | Method | Limit | Window | Tracked By | Why |
|----------|--------|-------|--------|------------|-----|
| `/api/v1/contacts/import` | POST | 3 requests | 1 hour | User ID | Heavy operation; prevents server overload |
| `/api/v1/contacts/block` | POST | 10 requests | 1 hour | User ID | Prevents mass contact blocking |
| `/api/v1/contacts/blocked` | GET | 20 requests | 1 minute | User ID | Prevents list polling |
| `/api/v1/contacts/unblock` | DELETE | 10 requests | 1 hour | User ID | Prevents mass unblocking |
| `/api/v1/contacts/unblock/user` | DELETE | 10 requests | 1 hour | User ID | Prevents mass unblocking |

---

## 🎫 9. Support / Contact Module

| Endpoint | Method | Limit | Window | Tracked By | Why |
|----------|--------|-------|--------|------------|-----|
| `/api/v1/contact` | POST | 3 requests | 1 hour | User ID | Prevents support ticket spam |
| `/api/v1/contact/alltickets` | GET | 20 requests | 1 minute | User ID | Prevents list polling |
| `/api/v1/contact/ticket/:id` | GET | 20 requests | 1 minute | User ID | Prevents polling |
| `/api/v1/contact/adminreply` | POST | 10 requests | 1 minute | User ID | Prevents reply spam |
| `/api/v1/contact/my-ticket` | GET | 20 requests | 1 minute | User ID | Prevents polling |
| `/api/v1/contact/ticket/:id` | DELETE | 5 requests | 1 hour | User ID | Prevents mass deletion |

---

## 🔒 10. Account Module

Very strict limits on destructive account actions.

| Endpoint | Method | Limit | Window | Tracked By | Why |
|----------|--------|-------|--------|------------|-----|
| `/api/v1/account/deactivate` | POST | 2 requests | 24 hours | User ID | Irreversible action — tight limit |
| `/api/v1/account/reactivate` | POST | 2 requests | 24 hours | User ID | Prevents toggle abuse |
| `/api/v1/account/delete` | DELETE | 2 requests | 24 hours | User ID | Destructive action — very tight limit |
| `/api/v1/account/delete/restore` | POST | 2 requests | 24 hours | User ID | Prevents restore abuse |
| `/api/v1/account/found-the-right-one` | POST | 2 requests | 24 hours | User ID | One-time life event action |

---

## 💳 11. Subscription / IAP Module

| Endpoint | Method | Limit | Window | Tracked By | Why |
|----------|--------|-------|--------|------------|-----|
| `/api/v1/subscription/verify` | POST | 10 requests | 1 minute | User ID | Purchase verification |
| `/api/v1/subscription/restore` | POST | 5 requests | 1 minute | User ID | Restore purchases |
| `/api/v1/subscription/status` | GET | 30 requests | 1 minute | User ID | Subscription status check |
| `/api/v1/subscription/catalog` | GET | 20 requests | 1 minute | User ID | Product catalog |
| `/api/v1/subscription/history` | GET | 20 requests | 1 minute | User ID | Purchase history |
| `/api/v1/subscription/details` | GET | 20 requests | 1 minute | User ID | Subscription details |
| `/api/v1/subscription/test-premium` | POST | 3 requests | 1 hour | User ID | Test route — tight limit |

### Webhook Routes (Server-to-Server)

| Endpoint | Method | Limit | Window | Tracked By | Why |
|----------|--------|-------|--------|------------|-----|
| `/webhook/apple` | POST | 200 requests | 1 minute | IP | Apple server webhook callbacks |
| `/webhook/google` | POST | 200 requests | 1 minute | IP | Google server webhook callbacks |

---

## 🔧 12. Admin Panel Auth

Brute-force protection for admin login.

| Endpoint | Method | Limit | Window | Tracked By | Why |
|----------|--------|-------|--------|------------|-----|
| `/api/v1/admin/auth/login` | POST | 5 requests | 5 minutes | IP | Prevents admin login brute-force |
| `/api/v1/admin/auth/request-otp` | POST | 3 requests | 5 minutes | IP | Prevents OTP spam |
| `/api/v1/admin/auth/verify-otp` | POST | 5 requests | 5 minutes | IP | Prevents OTP brute-force |
| `/api/v1/admin/auth/forgot-password` | PATCH | 3 requests | 5 minutes | IP | Prevents password reset abuse |

---

## 📋 Frontend Implementation Guide

### 1. Handling 429 Responses

```dart
// Flutter Example
if (response.statusCode == 429) {
  // Show user-friendly message
  showSnackBar("Please wait a moment before trying again.");
  
  // Optional: disable the button temporarily
  setState(() => isButtonDisabled = true);
  Future.delayed(Duration(seconds: 30), () {
    setState(() => isButtonDisabled = false);
  });
}
```

### 2. Best Practices for Frontend

| Scenario | Recommendation |
|----------|---------------|
| OTP Send button | Disable for 30 seconds after tap, show countdown timer |
| OTP Verify | After 5 failed attempts, show "Too many attempts. Wait 5 minutes" |
| Swipe actions | No UI change needed — 40/min is generous |
| Chat send | No UI change needed — 30/min is generous |
| Photo upload | Show progress indicator, disable upload button during upload |
| Profile update | Debounce auto-save to max 1 request per 5 seconds |
| Boost activate | After activation, disable button and show active status |
| Giveaway claim | After claim, show result immediately, disable re-claim |
| Support ticket | After submission, redirect to ticket list, disable submit |

### 3. Endpoints That DO NOT Have Rate Limits

These public/static endpoints have no rate limits:

| Endpoint | Reason |
|----------|--------|
| `GET /api/v1/content/faq` | Static content, publicly cacheable |
| `GET /api/v1/content/privacy-policy` | Static content, publicly cacheable |
| `GET /api/v1/content/terms-conditions` | Static content, publicly cacheable |
| `GET /api/v1/app-settings/social-links` | Static config |
| `GET /api/v1/app-settings/general` | Static config |
| `GET /api/v1/health` | Monitoring endpoint |

---

## ⚙️ Technical Details (For Developers)

| Property | Detail |
|----------|--------|
| **Technology** | Redis-based distributed rate limiting |
| **Library** | Custom middleware using Redis `INCR` + `EXPIRE` (atomic) |
| **Failure Mode** | **Fail-open** — if Redis is down, requests are allowed through |
| **Multi-Instance** | ✅ Works across multiple server instances (shared Redis) |
| **Persistence** | Limits survive server restarts (stored in Redis) |
| **Key Format** | `{action_name}:{user_id}` or `{action_name}:{ip_address}` |

---

> **Questions?** Contact the Backend Team for any rate limit adjustments or clarifications.
