# Developer Integration Guide & API Changelog
**Date:** May 04, 2026
**Target Audience:** Frontend Team & Backend Developers

This document details the recent backend updates, where the code was changed, and what actions the Frontend team needs to take to align with these updates.

---

## 1. KYC Approval/Rejection Push Notifications
**What Changed (Backend):**
- **File:** `modules/Admin/moderation/moderation.controller.js` (or related admin module).
- **Logic:** Integrated the push notification queue (`addNotificationJob`) when an admin updates the verification status to `approved` or `rejected`.
**Frontend Action Required:** 
- The frontend doesn't need to change any API payloads for this. Just ensure that the mobile app is actively listening for Firebase/APNs Push Notifications regarding KYC statuses so it can redirect the user to the profile page when tapped.

## 2. Account Deletion Workflow (OTP Removed)
**What Changed (Backend):**
- **File:** `modules/Account/deactivate & active/account.routes.js` and `account.controller.js`
- **Logic:** The requirement to send and verify an OTP before deleting an account has been removed. The user now only needs to provide a reason.
**Frontend Action Required:**
- **Remove** the OTP screen from the account deletion flow.
- Ensure the Delete Account API is called directly with just the `reason` in the body. Example:
  ```json
  POST /api/v1/account/delete
  {
    "reason": "I found someone"
  }
  ```

## 3. Admin Notification Campaign Fix
**What Changed (Backend):**
- **File:** `modules/Admin/adminNotificationCampaigns/adminNotification.controller.js`
- **Logic:** Fixed the validation issue that caused the "Missing required fields" error when sending broadcast emails. The expected payload (`campaignName`, `target`, etc.) is now correctly parsed.
**Frontend Action Required:**
- No changes needed if you are sending `{ "campaignName": "test", "target": "premium" }`. The API will now process this payload successfully without throwing a 400 error.

## 4. Public Profile Labels (VVIP for Frontend)
**What Changed (Backend):**
- **Files Modified:** 
  - `common/utils/masterData.util.js` (Added Redis mapper utility)
  - `modules/profile/profile.userFormatter.js` (Updated formatter)
  - `modules/profile/profile.controller.js` (Injected mapper into `getUserProfile`)
- **Logic:** For the **Public Profile View ONLY** (`GET /api/v1/profile/:userId`), the backend no longer returns raw attribute IDs (like `"dating"` or `"gym"`). Instead, it maps them directly to human-readable strings with icons (e.g., `"Dating 👩‍❤️‍👨"`, `"Gym 🏋️"`).
**Frontend Action Required:**
- **CRITICAL:** When fetching another user's profile (`GET /api/v1/profile/:userId`), do NOT try to look up the ID in your local frontend dictionary anymore. 
- The `attributes` object will now contain the final formatted strings. You can render them directly in your UI Chips/Tags.
  *Example Response:*
  ```json
  "attributes": {
    "interests": ["Music 🎵", "Travel ✈️"],
    "zodiac": "Aries ♈",
    "relationshipGoals": "Dating 👩‍❤️‍👨"
  }
  ```
- *Note:* Your own profile (`/me`) and the Profile Update APIs still use standard raw IDs (`dating`, `gym`). This change only affects viewing *other* users.

## 5. API Rate Limiting (Anti-Spam & Anti-Scraping)
**What Changed (Backend):**
- **Files Modified:** 
  - `common/middlewares/apiLimiter.js` (New centralized Redis rate limiter)
  - `modules/profile/profile.routes.js`
  - `modules/matches/swipe/swipe.routes.js`
  - `modules/matches/chat/chat.route.js`
- **Logic:** We have protected critical endpoints to prevent bot abuse and server crashes.
**Frontend Action Required:**
- The frontend MUST handle `HTTP 429 Too Many Requests` responses globally. 
- When an API returns a 429 status code, show a user-friendly toast/snackbar. 
- **Limits Applied:**
  - **Photo Uploads (`POST /api/v1/profile/photos`):** Max 10 uploads per hour.
  - **Profile Updates (`PATCH /api/v1/profile/update`):** Max 30 updates per hour.
  - **Target Profile Views (`GET /api/v1/profile/:userId`):** Max 60 views per minute.
  - **Swipe Actions (`POST /api/v1/matches/action`):** Max 40 swipes per minute.
  - **Chat Messages (`POST /api/v1/chat/send`):** Max 30 messages per minute.
- **Error Response Format:**
  ```json
  {
    "success": false,
    "message": "You are doing this too fast. Please wait a moment."
  }
  ```

---
*Generated securely for the MAFS Development Team.*
