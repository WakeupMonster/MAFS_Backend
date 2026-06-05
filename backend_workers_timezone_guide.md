# Backend Workers & Timezone Management Guide

This document explains how background tasks (workers and scheduled jobs) are running in the application backend, and specifically how timezones—like Australian Time (AEST/AEDT)—are handled. 

---

## 1. How We Manage Time in the Backend

Servers by default run on universal time (UTC). To ensure tasks run at the exact local time for your users, we use a robust library called `node-cron`. 
This library allows us to explicitly define a `timezone` parameter for every scheduled task. We also use Environment Variables (`.env`) to manage these timezones securely (e.g., `GIVEAWAY_TIMEZONE="Australia/Sydney"`).

### Two Types of Backend Workers
We use two different systems for background tasks:
1.  **Cron Jobs (Scheduled Tasks):** These run at specific times (e.g., "Every Friday at 7 PM"). **These require a Timezone.**
2.  **Queue Workers (Instant Tasks):** Powered by Redis & BullMQ. These run instantly the moment an event happens (e.g., "Send an OTP right now"). **These do NOT require a Timezone.**

---

## 2. Where Australian Time (Sydney) IS Used

The core interactive features intended for the Australian audience correctly utilize the Australian timezone.

### 🎯 The Giveaway Cron Job (`giveaway.cron.js`)
*   **What it does:** Automatically picks giveaway winners from the spinwheel feature.
*   **Timezone Used:** `Australia/Sydney` (Automatically handles AEST / AEDT daylight savings).
*   **How it works:** We pass `{ timezone: CURRENT_TZ }` directly into the scheduler.
*   **Note on Schedule:** Currently, for testing and development purposes, the schedule is set to run very frequently (every minute: `*/1 * * * *`). For the live launch, we will change this single line to something like `"0 19 * * 5"` (Every Friday at 7:00 PM Sydney time) and it will trigger perfectly.

---

## 3. Where Indian Time (IST) is Currently Used (Needs Update for AU Launch)

During the development phase, some maintenance tasks were scheduled according to the development team's local time (IST - Asia/Kolkata). **These will need to be updated to Australian time before the final app launch.**

### 🔓 Unsuspend Users Job (`unsuspendUsers.job.js`)
*   **What it does:** Scans the database and reactivates accounts where the suspension penalty time has ended.
*   **Current Timezone:** `Asia/Kolkata`
*   **Current Schedule:** Runs daily at 4:55 PM IST. 

### 🎁 Queued Prize Delivery (`queuedPrize.cron.js`)
*   **What it does:** If a suspended user won a prize, the system holds it. Once they are unsuspended, this job delivers their pending prizes.
*   **Current Timezone:** `Asia/Kolkata`
*   **Current Schedule:** Runs daily at 11:45 PM IST.

### 💳 Premium Expiry Reminder (`premiumExpiryReminder.cron.js`)
*   **What it does:** Sends an automated push notification/email to users whose premium subscription is about to expire.
*   **Current Timezone:** `Asia/Kolkata`
*   **Current Schedule:** Runs daily at 3:06 PM IST.

> **Action Item for Launch:** We simply need to change the `Asia/Kolkata` strings in these three files to `Australia/Sydney` and adjust the hours so they run during off-peak Australian night hours (e.g., 2:00 AM Sydney time) so it doesn't slow down the server while people are swiping.

---

## 4. Where Timezone Doesn't Matter (Global & Instant Tasks)

Some tasks run globally or instantly and do not require any timezone setup.

### 🔄 Subscription Management Jobs (`subscriptionCron.js`)
*   **What they do:** Revoke premium access if payment fails, expire cancelled plans, and manage grace periods for Apple/Google payments.
*   **Why no timezone?** These run continuously using relative intervals (e.g., `*/5 * * * *` which means "Every 5 minutes"). They compare absolute UNIX timestamps (e.g., "Is the current exact moment past the user's expiry timestamp?") rather than relying on a local clock.

### ⚡ Instant Background Workers (BullMQ)
These workers process actions instantly in the background so the user's app doesn't freeze while waiting for third-party servers.
*   **`email.worker.js`:** Sends emails (like Welcome emails).
*   **`sms.worker.js`:** Sends OTP SMS codes.
*   **`notification.worker.js`:** Sends Push Notifications.
*   **Why no timezone?** The moment a user requests an OTP, it goes into the queue and is processed in milliseconds. It runs 24/7, completely independent of any timezone.
