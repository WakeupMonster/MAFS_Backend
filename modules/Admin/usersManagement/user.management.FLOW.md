# 🧠 Admin User Management – Architecture & Backend Design

> **Philosophy:**  
> Admin Panel ≠ User App  
> Admin User Management is **Read-heavy + Controlled Write + Fully Audited**

The goal is **speed, clarity, safety, and scalability** — not delight or
experimentation.

---

## 🎯 Core Objectives

Admin should be able to:

- 🔍 Search users instantly
- 👁️ Understand a user in **one screen**
- ✏️ Perform **limited, reversible actions**
- 📤 Export data **safely & asynchronously**

### Key Rules

- ❌ Never reuse User App queries
- ✅ Build **Admin-specific APIs, indexes & aggregations**
- ❌ Never allow destructive actions (delete, hard block)
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

## 2️⃣ Admin User List (DataTable) – Backend Design

### 🎯 Goal

- Handle **100k+ users**
- Search response < **300ms**
- Pagination & filters are **mandatory**

---

### ✅ API: Get Users List (Admin)

`GET api/v1/admin/user-management/user-list`

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

---

## 🔍 Search Strategy (Very Important)

### ❌ Wrong Approach

- `$regex` on multiple fields without indexes

### ✅ Correct Approach (MongoDB)

#### Step 1: Decide Searchable Fields

Admin usually searches by:

- User ID
- Email
- FullName
- isPremium
- etc admin search through many fields.

#### Step 2: Indexing (🔥 Mandatory)

### User Model Indexes

```js
userSchema.index({ phone: 1 });
userSchema.index({ email: 1 });
userSchema.index({ accountStatus: 1 });
userSchema.index({ isPremium: 1 });
userSchema.index({ createdAt: -1 });
```

### Profile Model Indexes

```js
ProfileSchema.index({ nickname: 1 });
ProfileSchema.index({ gender: 1 });
ProfileSchema.index({ isProfileComplete: 1 });
ProfileSchema.index({ "kyc.status": 1 });
```

---

### 🔄 QUERY PATTERN (Aggregation Pipeline)

#### Why aggregation?

Because:

- Two collections
- Filters on both
- One response for admin table

Example: Admin User List Query

```js
db.users.aggregate([
  {
    $match: {
      role: "USER",
      accountStatus: "active",
    },
  },
  {
    $lookup: {
      from: "profiles",
      localField: "_id",
      foreignField: "userId",
      as: "profile",
    },
  },
  {
    $unwind: {
      path: "$profile",
      preserveNullAndEmptyArrays: true,
    },
  },
  {
    $match: {
      "profile.gender": "female",
      "profile.isProfileComplete": true,
    },
  },
  {
    $project: {
      phone: 1,
      email: 1,
      accountStatus: 1,
      isPremium: 1,
      createdAt: 1,

      "profile.nickname": 1,
      "profile.gender": 1,
      "profile.age": 1,
      "profile.kyc.status": 1,
      "profile.isProfileComplete": 1,
    },
  },
  { $sort: { createdAt: -1 } },
  { $skip: 0 },
  { $limit: 20 },
]);
```

👉 Admin table sirf ye fields dikhaye, full profile nahi.

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

## 4️⃣ ADMIN ACTIONS (SAFE DESIGN)

### 1️⃣ View User Details

> **3 API URL:**
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

### 2️⃣ Edit User Details (VERY LIMITED)

**Rule**: Admin profile edit nahi karega (dating app me dangerous)

Allowed:

- Correct email/phone (rare)
- Fix visibility
- Fix accountStatus


> **4 API URL:**
```js
PATCH api/v1/admin/user-management/:userId
```

#### Payload example:

```json
{
  "accountStatus": "deactivated",
  "visibility": "nobody"
}
```

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

### 🔐 Audit Log (MUST)

Every admin action:

```js
AdminLog {
  adminId,
  action: "BLOCK_USER",
  targetId: userId,
  changes: { before, after },
  reason
}
```

---

### 5️⃣ BULK EXPORT USERS (CSV)

## ⚠️ Never export from UI query

### Correct design:

- Background job
- Stream data
- Email or download link

---

### API Design

```js
POST api/v1/admin/user-management/export
```

### Payload:

```js
{
  "filters": {
    "accountStatus": "active",
    "gender": "female",
    "kycStatus": "approved"
  }
}
```

### Backend flow:

- Save export request
- Run aggregation cursor
- Stream to CSV
- Upload to S3
- Notify admin

---

## CSV Columns (Admin Safe)

- UserID
- Avatar or Pro-Img
- Email
- FullName
- Gender
- Age
- DOB
- KYC Status
- Profile Completion %
- Premium
- AuthMethod
- Account Status
- Created At
- LastProfileUpdate

❌ Messages

❌ Exact location coordinates

❌ Preferences JSON

---

### 6️⃣ PERFORMANCE & SAFETY RULES (VERY IMPORTANT)

## ✅ DO

- Pagination mandatory
- Projection mandatory
- Index before filter
- Read-only by default

## ❌ DON’T

- Populate inside loop
- Return full profile in list
- Allow admin login as user
- Allow delete user

---

## 🧠 FINAL ARCHITECT THOUGHT

Your **models are strong**.

Ab success depend karta hai how disciplined admin backend rahega.

Tumne jo Profile model banaya hai:

- 🔥 Production-grade

- 🔥 Admin-friendly

- 🔥 Analytics-ready
