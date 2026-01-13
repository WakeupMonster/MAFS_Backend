<!-- # ✅ Admin Dashboard – System Instructions (Mandatory) -->

# 🧠 Admin User Management – Architecture & Backend Design

> **Admin Panel Philosophy**  
> Admin Panel is a **tool**, not a website.  
> Primary goals: **Speed, clarity, control, and safety**.  
> Admin User Management: **Read-heavy + Controlled Write + Fully Audited**

This document defines **non-negotiable backend rules** for the Admin
Dashboard.  
The goal is **speed, clarity, safety, and scalability** — not delight or
experimentation.

---

## 🔷 Core Modules (High Level)

The Admin Dashboard is divided into **4 core modules**.

| Module          | Purpose                                         |
| --------------- | ----------------------------------------------- |
| User Management | View, filter, and control users                 |
| User 360° View  | Full admin-safe snapshot of a user              |
| Moderation      | Reports, blocks, and safety workflows           |
| Admin System    | Roles, permissions, [audit logs -> if possible] |

---

## 🎯 Core Objectives

Admin should be able to:

- 🔍 Search users instantly
- 👁️ Understand a user detail or issues in **one screen**
- ✏️ Perform **limited, reversible actions**
- 📤 Export data **safely & asynchronously**

## Key Rules

### Don't Do's

- ❌ Never reuse User App queries
- ❌ Never allow destructive actions (delete, hard block)

### Do's

- ✅ Build **Admin-specific APIs, indexes & aggregations**
- ✅ Everything must be **audited**

---

## 1️⃣ Data Ownership (Critical Clarity)

You made the **correct architectural decision** 👇

| Concern                               | Model     |
| ------------------------------------- | --------- |
| Authentication, Role, Status, Premium | `User`    |
| Profile, Onboarding, KYC              | `Profile` |

👉 **Admin Panel Rule:**  
We **JOIN (aggregate)** data for admin views — **never merge schemas**.

---

## 🧩 MODULE 1: User Management (DataTable) (List + Control)

### 🎯 Goal

- Fast, scalable user table. It Handle **100k+ users**
- Search response < **300ms**
- **Read-heavy**
- Minimal & safe data exposure
- Pagination & filters are **mandatory**

---

## 📌 APIs Required (Total = 4 API's)

## 2️⃣ Get Users List (Main Admin Data Table)

> **1. API URL:**

```js
GET api/v1/admin/user-management/user-list
```

#### Query Params

```js
GET api/v1/admin/user-management/user-list?page=1
&limit=20
&search=john
&accountStatus=active
&isPremium=true
&gender=female
&kycStatus=approved
&profileComplete=true
&sort=createdAt
&order=desc
```

## 🔍 Search Strategy (Very Important)

### ❌ Wrong Approach

- `$regex` on multiple fields without indexes

### ✅ Correct Approach (MongoDB)

### Step 1: Decide Searchable Fields

#### Admin usually searches by:

- User ID
- Email
- FullName
- isPremium
- etc admin search through many fields.

---

### Step 2: Indexing (🔥 Mandatory)

#### User Model Indexes

```js
userSchema.index({ phone: 1 });
userSchema.index({ email: 1 });
userSchema.index({ accountStatus: 1 });
userSchema.index({ isPremium: 1 });
userSchema.index({ createdAt: -1 });
```

#### Profile Model Indexes

```js
ProfileSchema.index({ nickname: 1 });
ProfileSchema.index({ gender: 1 });
ProfileSchema.index({ isProfileComplete: 1 });
ProfileSchema.index({ "kyc.status": 1 });
```

---

### ✅ Response Type: 1 (Strict & Lightweight)

```json
{
  "success": true,
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 12450
  },
  "data": [
    {
      "userId": "u_123",
      "phone": "+91XXXX",
      "email": "user@mail.com",
      "nickname": "Riya",
      "gender": "female",
      "age": 24,
      "kycStatus": "approved",
      "profileCompletion": 85,
      "isPremium": true,
      "accountStatus": "active",
      "createdAt": "2025-01-01"
    }
  ]
}
```

### ✅ Response Type: 2 Structure (Sectioned)

```json
{
  "success": true,
  "data": {
    "basic": {
      "userId": "u_123",
      "phone": "+91XXXX",
      "email": "user@mail.com",
      "accountStatus": "active",
      "isPremium": true,
      "createdAt": "2025-01-01"
    },

    "profile": {
      "nickname": "Riya",
      "gender": "female",
      "dob": "2001-05-12",
      "age": 24,
      "bio": "Love travel",
      "profileCompletion": 85
    },

    "visibility": {
      "isDiscoverable": true,
      "canSwipe": true,
      "canMessage": true
    },

    "kyc": {
      "status": "approved",
      "verifiedAt": "2025-01-03"
    },

    "stats": {
      "totalMatches": 120,
      "totalLikes": 340,
      "reportsCount": 1,
      "blocksCount": 0
    }
  }
}
```

### ✅ Response Type: 3 Structure (Sectioned)

```json
{
  // =========================
  // USER MODEL DATA
  // =========================
  "_id": "65b1f8c2e9f4a1c9d1234567",
  "role": "USER",

  "phone": "+919876543210",
  "email": "riya.sharma@example.com",
  "authMethod": "EMAIL",

  "accountStatus": "active", // active | deactivated | banned
  "isPremium": true,

  "lastProfileUpdate": "2025-01-15T10:12:44.000Z",

  "createdAt": "2024-11-20T08:45:10.000Z",
  "updatedAt": "2025-01-15T10:12:44.000Z",

  // =========================
  // PROFILE MODEL DATA
  // =========================
  "profile": {
    "userId": "65b1f8c2e9f4a1c9d1234567",

    "avatar": "https://cdn.app.com/profiles/u_123/avatar.jpg",

    "fullName": "Riya Sharma",
    "nickname": "Riya",

    "gender": "female",
    "dob": "2001-05-12",
    "age": 24,

    "bio": "Love traveling, coffee dates, and deep conversations.",

    "visibility": {
      "isDiscoverable": true,
      "canSwipe": true,
      "canMessage": true
    },

    "onboardingProgress": {
      "basicInfo": true,
      "photosUploaded": true,
      "bioAdded": true,
      "preferencesSet": true,
      "kycCompleted": true,
      "totalCompletion": 85
    },

    "isProfileComplete": true,

    "kyc": {
      "status": "approved", // pending | approved | rejected
      "verifiedAt": "2025-01-03T14:22:10.000Z",
      "rejectedReason": null
    },

    "flags": {
      "isReported": false,
      "reportsCount": 1,
      "blocksCount": 0
    },

    "createdAt": "2024-11-20T08:50:00.000Z",
    "updatedAt": "2025-01-15T10:12:44.000Z"
  }
}
```

---

## 3️⃣ ADMIN DATATABLE COLUMNS (RECOMMENDED)

Show only what admin needs 👇

| Column            | Source or model   |
| ----------------- | ----------------- |
| User ID           | User              |
| Avatar or Pro-Img | Profile           |
| Email             | User              |
| FullName          | Profile           |
| Gender            | Profile           |
| Age               | Profile           |
| DOB               | Profile           |
| KYC Status        | Profile           |
| Profile %         | Profile           |
| Premium           | User              |
| AuthMethod        | User              |
| Account Status    | User              |
| Created At        | User              |
| LastProfileUpdate | User              |
| Actions           | View, Edit, Block |

❌ Photos, interests, preferences = details page only

---

## 4️⃣ ADMIN ACTIONS (SAFE DESIGN)

### 1️⃣ View User Details

> **2. API URL:**

```js
GET api/v1/admin/user-management/:userId
```

👉 This API:

- Aggregates User + Profile
- Read-only
- Shows:
  - Onboarding progress
  - KYC docs
  - Flags (discoverable, swipe access)

---

### 2️⃣ Edit User Details (VERY LIMITED) (Soft Control Only)

**Rule**: Admin profile edit nahi karega (dating app me dangerous) ❗ This API
must NOT delete or hard block users.

Allowed:

- Correct email/phone (rare)
- Fix visibility
- Fix accountStatus

> **3. API URLs:**

```js
PATCH api/v1/admin/user-management/:userId
PATCH api/v1/admin/user-management/:userId/status
```

### Payload

```json
{
  "accountStatus": "deactivated",
  "reason": "Multiple reports"
}
```

### Response

```json
{
  "success": true,
  "message": "User status updated"
}
```

---

### 3️⃣ Block User (CRITICAL FLOW)

### ❌ Galat

Delete user / profile

### ✅ Correct (Soft Block)

```json
// User
accountStatus = "deactivated"

// Profile
visibility = "nobody"
canAccessSwipe = false
isDiscoverable = false
```

👉 Always reversible.

### 4️⃣ Export Users (Asynchronous Only)

⚠️ Export must never run on live UI queries.

> **4 API URL:**

```js
POST api/v1/admin/user-management/export
```

### Payload

```json
{
  "filters": {
    "gender": "female",
    "accountStatus": "active"
  }
}
```

### Response

```json
{
  "success": true,
  "exportId": "exp_456",
  "status": "processing"
}
```

---

## ⚡ Performance Rules (User Management)

### ✅ Mandatory

- Server-side pagination
- Field projection (return only required fields)
- Aggregation with indexed `$match` first
- Read-only by default

### ❌ Strictly Forbidden

- Returning full profile data in list
- populate() inside loops
- Hard delete of users
- Blocking users without audit logs

---

### 🧠 Architectural Reminder

- User Management is table-first, not profile-first
- Admin actions must be limited, reversible, and audited
- Assume 100k+ users at all times
- If it works only for 1k users — it is already broken.

---

### ⚡ Performance Rules (360° View)

- ✅ Aggregation by userId (single-document response)
- ✅ Stats via $lookup + $count
- ❌ Never load chat messages
- ❌ Never load exact location coordinates

==================================================================================

---

# [Not Complete Right now]

## 🧩 MODULE 2: MODERATION WORKFLOW (Reports & Blocks)

**🎯 Goal**

Platform safety ensure karna without deleting users.

## 📌 APIs REQUIRED (Count = 4)

### 5️⃣ Get Reports List

`GET /admin/reports`

```json
{
  "success": true,
  "data": [
    {
      "reportId": "r_101",
      "reportedUserId": "u_123",
      "reason": "Abusive language",
      "status": "open",
      "createdAt": "2025-01-05"
    }
  ]
}
```

---

### 6️⃣ Get Report Details

`GET /admin/reports/:reportId`

---

### 7️⃣ Take Moderation Action

`POST /admin/reports/:reportId/action`

### Payload

```json
{
  "action": "BLOCK_USER",
  "reason": "Confirmed violation"
}
```

---

### 8️⃣ Block / Unblock User

`PATCH /admin/users/:userId/block`

Payload

```json
{
  "blocked": true,
  "reason": "Policy violation"
}
```

---

## ⚡ Moderation Performance Rules

- ✅ Soft block only (reversible)
- ✅ Status-based workflow
- ✅ Every action logged
- ❌ Never auto-delete user

---

## 🧩 MODULE 4: ADMIN ROLES & PERMISSIONS

**🎯 Goal**

Koi bhi admin god-access na rakhe.

### 📌 APIs REQUIRED (Count = 3)

---

### 9️⃣ Get Admin Roles

```js
GET / admin / roles;
```

---

### 🔟 Assign Role to Admin

```js
PATCH /admin/admins/:adminId/role
```

---

### 1️⃣1️⃣ Get Admin Activity Logs

```js
GET / admin / logs;
```

```json
{
  "adminId": "a_1",
  "action": "BLOCK_USER",
  "targetId": "u_123",
  "timestamp": "2025-01-05"
}
```

## 📊 TOTAL API COUNT (Final)

| Module          | APIs        |
| --------------- | ----------- |
| User Management | 3           |
| User 360° View  | 1           |
| Moderation      | 4           |
| Admin System    | 3           |
| TOTAL           | **11 APIs** |

---

## 🚀 Scalability & Performance – Golden Rules

### 🧠 Data Rules

- Read APIs ≠ Write APIs
- Admin queries ≠ User app queries
- Aggregation + projection mandatory

### ⚡ Infrastructure

- Redis for admin filters cache
- Background jobs for exports
- Index before feature

### 🔐 Security

- RBAC middleware mandatory
- Audit log compulsory for all write actions
- IP allowlist for super-admin access

### 🧠 Final Architect Note

User app ban chuka hai — ab admin panel surgery tool hai:

- Clean
- Controlled
- Reversible
- Auditable

Admin mistakes should be undoable, but admin negligence should be traceable.

### 🚀 Next Modules (Defined Separately)

- User 360° View
- Moderation System
- Admin Roles & Audit Logs

If you want, next I can:

- Write **controller + service code** for `/admin/users`
- Design **User 360° View APIs**
- Define **Moderation workflows**
- Design **Admin RBAC permission matrix**

Just say the next module 🔥
