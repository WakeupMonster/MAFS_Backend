# MAFS Dating App - Codebase Analysis & Social Login Implementation Guide

## 📋 Executive Summary

This is a **Node.js + Express dating application** with a comprehensive backend architecture. The app currently uses **phone OTP + email OTP authentication**. You're planning to add **Google, Facebook, and Apple social login**.

---

## 🏗️ Architecture Overview

### Tech Stack
- **Runtime**: Node.js
- **Framework**: Express.js v5.1.0
- **Database**: MongoDB (Mongoose v8.20.2)
- **Cache/Pub-Sub**: Redis (ioredis v5.8.2)
- **Real-time**: Socket.IO v4.8.1
- **Authentication**: JWT + OTP
- **File Upload**: Cloudinary
- **SMS**: Twilio
- **Email**: Nodemailer (SMTP)
- **Push Notifications**: Firebase Admin SDK
- **Job Queue**: BullMQ v5.64.1

### Key Dependencies for Social Login
```json
{
  "google-auth-library": "^10.5.0",  // ✅ Already installed
  "firebase": "^12.6.0",              // ✅ Already installed
  "firebase-admin": "^13.6.0",        // ✅ Already installed
  "jsonwebtoken": "^9.0.2",           // ✅ Already installed
  "node-fetch": "^3.3.2"              // ✅ Already installed
}
```

---

## 📁 Project Structure

```
c:\MAFS\mafswm-dating-app\
├── modules/
│   ├── auth/                    # 🔐 Authentication (MAIN FOCUS)
│   │   ├── auth.controller.js   # API endpoints
│   │   ├── auth.service.js      # Business logic
│   │   ├── auth.model.js        # User schema
│   │   ├── auth.routes.js       # Route definitions
│   │   ├── auth.utils.js        # JWT, OTP, SMS, Email
│   │   ├── auth.validation.js   # Input validation
│   │   └── verifyTokenAndGetUser.js
│   │
│   ├── profile/                 # 👤 User Profile
│   │   ├── profile.model.js     # Profile schema (comprehensive)
│   │   ├── profile.service.js
│   │   ├── profile.controller.js
│   │   └── profile.routes.js
│   │
│   ├── matches/swipe/           # 💕 Matching & Swiping
│   │   ├── swipe.model.js
│   │   ├── swipe.service.js
│   │   ├── swipe.controller.js
│   │   └── BlockReport/
│   │
│   ├── matches/chat/            # 💬 Messaging
│   │   ├── chat.controller.js
│   │   ├── chat.route.js
│   │   └── chat.message.model.js
│   │
│   ├── notifications/           # 🔔 Push Notifications
│   │   ├── notification.service.js
│   │   ├── firebase-admin.js
│   │   └── notification.routes.js
│   │
│   ├── kyc/                     # ✅ KYC Verification
│   ├── email/                   # 📧 Email Service
│   ├── discovery/               # 🔍 Feed & Discovery
│   └── fwb/                     # Friends with Benefits
│
├── common/
│   ├── middlewares/
│   │   ├── auth.middleware.js   # JWT verification
│   │   ├── asyncHandler.js
│   │   ├── validate.js
│   │   └── rateLimit.js
│   ├── utils/
│   │   ├── jwt.js
│   │   ├── validators.js
│   │   └── crypto.js
│   ├── constants/
│   │   ├── roles.js
│   │   ├── permissions.js
│   │   └── match.js
│   ├── errors/
│   │   ├── ApiError.js
│   │   ├── errorCodes.js
│   │   └── errorHandler.js
│   ├── redis.js                 # Redis client
│   └── queues.js                # BullMQ setup
│
├── config/
│   ├── database.js              # MongoDB connection
│   ├── cache.js                 # Redis cache
│   ├── cloudinaryConfig.js
│   ├── firebase.js
│   ├── logger.js
│   └── enums.js
│
├── sockets/
│   ├── chat.socket.js           # Socket.IO handlers
│   └── socket-server.js
│
├── routes/
│   ├── v1/
│   │   ├── index.js             # Main router
│   │   └── socket.routes.js
│   └── public/
│       ├── health.routes.js
│       └── docs.routes.js
│
├── workers/                     # Background jobs
│   ├── email.worker.js
│   ├── messageDelivery.worker.js
│   └── readReceipt.worker.js
│
├── jobs/
│   ├── cron/
│   │   └── fwbCron.js
│   ├── analytics.job.js
│   ├── cleanup.job.js
│   └── subscriptionRenewal.job.js
│
├── app.js                       # Express app setup
├── index.js                     # Server entry point
└── package.json
```

---

## 🔐 Current Authentication Flow

### 1. **Phone OTP Registration/Login**
```
POST /api/v1/auth/phone
├─ Input: { phone }
├─ Process:
│  ├─ Rate limit check (3 OTP per 60 sec)
│  ├─ Generate 6-digit OTP
│  ├─ Store in Redis: `login:{phone}` (5 min TTL)
│  ├─ Send via Twilio SMS
│  └─ Create user if new
└─ Response: { success: true, message: "OTP sent" }

POST /api/v1/auth/verify
├─ Input: { phone, otp }
├─ Process:
│  ├─ Verify OTP from Redis
│  ├─ Mark phone as verified
│  ├─ Generate JWT tokens
│  ├─ Store refresh token hash in DB
│  └─ Update profile onboarding progress
└─ Response: {
     userId, accessToken, refreshToken,
     isNewUser, isPhoneVerified, nextStep
   }
```

### 2. **Email OTP Verification**
```
POST /api/v1/auth/register/email
├─ Input: { userId, email }
├─ Process:
│  ├─ Verify phone first (required)
│  ├─ Check email not in use
│  ├─ Generate OTP
│  ├─ Store in User model (10 min TTL)
│  └─ Send via Nodemailer SMTP
└─ Response: { success: true, message: "Email OTP sent" }

POST /api/v1/auth/verify/email
├─ Input: { userId, otp }
├─ Process:
│  ├─ Verify OTP
│  ├─ Mark email as verified
│  ├─ Generate tokens
│  └─ Update profile progress
└─ Response: { userId, accessToken, refreshToken, nextStep }
```

### 3. **Token Management**
```
POST /api/v1/auth/refresh
├─ Input: { userId, refreshToken }
├─ Process:
│  ├─ Hash incoming refresh token
│  ├─ Find matching hash in DB
│  ├─ Generate new access token
│  └─ Keep refresh token valid
└─ Response: { accessToken }

POST /api/v1/auth/logout
├─ Input: { userId, refreshToken }
├─ Process:
│  ├─ Remove refresh token from DB
│  └─ Invalidate session
└─ Response: { success: true, message: "Logged out" }
```

---

## 👤 User Model (auth.model.js)

```javascript
{
  _id: ObjectId,
  
  // Phone Authentication
  phone: String (unique, required),
  isPhoneVerified: Boolean,
  phoneOtp: String,
  phoneOtpExpires: Date,
  
  // Email Authentication
  email: String (unique, sparse),
  isEmailVerified: Boolean,
  emailOtp: String,
  emailOtpExpires: Date,
  
  // Tokens
  refreshTokens: [{
    tokenHash: String,
    expiresAt: Date
  }],
  
  // Notifications
  fcmTokens: [{
    token: String,
    deviceId: String,
    createdAt: Date
  }],
  notificationSettings: {
    likes: Boolean,
    messages: Boolean,
    matches: Boolean
  },
  
  // Status
  isNewUser: Boolean,
  isProfileCompleted: Boolean,
  
  // Timestamps
  createdAt: Date,
  updatedAt: Date
}
```

---

## 📊 Profile Model (profile.model.js)

The profile model is **comprehensive** with:
- **Tier 1 (Mandatory - 60%)**: Phone, Email, Basic Info, Photos, Preferences
- **Tier 2 (Optional - 40%)**: Bio, Lifestyle, Languages, Education, Music, Travel
- **KYC**: Selfie + ID Document verification
- **Onboarding Progress**: Tracks completion percentage
- **Discovery Filters**: For feed algorithm

---

## 🔄 Current Authentication Routes

```
POST   /api/v1/auth/phone                    # Send OTP to phone
POST   /api/v1/auth/verify                   # Verify phone OTP
POST   /api/v1/auth/register/email           # Send email OTP
POST   /api/v1/auth/verify/email             # Verify email OTP
POST   /api/v1/auth/refresh                  # Refresh access token
POST   /api/v1/auth/logout                   # Logout
```

**Commented out (ready for implementation):**
```javascript
// router.post("/social/google", controller.googleLogin);
// router.post("/social/facebook", controller.facebookLogin);
// router.post("/social/apple", controller.appleLogin);
```

---

## 🔑 JWT & Token Strategy

### Access Token
- **Payload**: `{ userId, role }`
- **TTL**: 1200 minutes (20 hours) - configurable via `ACCESS_TOKEN_TTL`
- **Secret**: `process.env.JWT_SECRET`
- **Signing**: `jsonwebtoken` library

### Refresh Token
- **Type**: Random 48-byte hex string
- **Storage**: Hash stored in DB (never raw token)
- **TTL**: 30 days (configurable)
- **Hash Method**: SHA256

### Token Verification
```javascript
// File: modules/auth/verifyTokenAndGetUser.js
const decoded = jwt.verify(token, process.env.JWT_SECRET);
const user = await User.findById(decoded.userId);
```

---

## 🔌 Socket.IO Authentication

The app uses **Socket.IO with Redis adapter** for real-time chat:

```javascript
// index.js - Socket authentication middleware
io.use(async (socket, next) => {
  // Token from: socket.handshake.auth.token OR query param OR Authorization header
  const user = await verifyTokenAndGetUser(token);
  socket.user = user;
  // Mark user online in Redis
  await redisClient.set(`user:online:${user._id}`, "1");
});
```

---

## 📧 Email & SMS Configuration

### Email (Nodemailer)
```javascript
// auth.utils.js
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: 465,
  secure: true,
  auth: {
    user: process.env.SMTP_MAIL,
    pass: process.env.SMTP_PASSWORD
  }
});
```

**Required ENV vars:**
- `SMTP_HOST`
- `SMTP_MAIL`
- `SMTP_PASSWORD`

### SMS (Twilio)
```javascript
// auth.utils.js
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);
```

**Required ENV vars:**
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM` (phone number)

---

## 🔔 Push Notifications (Firebase)

```javascript
// modules/notifications/firebase-admin.js
const admin = require('firebase-admin');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Send to FCM tokens
await admin.messaging().sendMulticast({
  tokens: fcmTokens,
  notification: { title, body },
  data: { type, matchId }
});
```

**Required ENV vars:**
- `FIREBASE_PROJECT_ID`
- `FIREBASE_PRIVATE_KEY`
- `FIREBASE_CLIENT_EMAIL`

---

## 🎯 Matching & Discovery Algorithm

### Feed Generation (swipe.service.js)
1. **Hard Filters** (MongoDB query):
   - Gender preference
   - Age range (calculated from DOB)
   - Distance range (geospatial query)
   - Exclude: Already swiped, matched, blocked users

2. **Soft Scoring** (in-memory):
   - Superlike status: +1000 points
   - Common interests: +10 per match
   - Bio present: +5 points
   - Fresh profile (< 7 days): +5 points

3. **Sorting**:
   - Superliked first
   - Then by match score (descending)
   - Then by recency

4. **Caching**:
   - Redis cache: `feed:{userId}` (5 min TTL)
   - Invalidated on: swipe, match, preference change

---

## 💾 Redis Usage

```
Keys used:
├─ login:{phone}              # OTP for phone verification (5 min)
├─ rl:login:{ip}              # Rate limit counter (60 sec)
├─ feed:{userId}              # Cached feed (5 min)
├─ user:online:{userId}       # User online status
├─ sockets:{userId}           # Socket IDs for user
├─ swipe_queue:{userId}       # Prefetched candidates
└─ swiped:{userId}            # Set of swiped user IDs
```

---

## 🚀 Deployment & Environment

### Required Environment Variables
```bash
# Server
PORT=3000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/mafs_dev
MONGO_POOL_SIZE=10

# Cache
REDIS_URL=redis://127.0.0.1:6379

# Authentication
JWT_SECRET=your-secret-key
ACCESS_TOKEN_TTL=1200m

# SMS (Twilio)
TWILIO_ACCOUNT_SID=your-sid
TWILIO_AUTH_TOKEN=your-token
TWILIO_FROM=+1234567890

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_MAIL=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# File Upload (Cloudinary)
CLOUDINARY_CLOUD_NAME=your-cloud
CLOUDINARY_API_KEY=your-key
CLOUDINARY_API_SECRET=your-secret

# Firebase
FIREBASE_PROJECT_ID=your-project
FIREBASE_PRIVATE_KEY=your-key
FIREBASE_CLIENT_EMAIL=your-email

# Social Login (TO BE ADDED)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-secret
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-secret
APPLE_TEAM_ID=your-apple-team-id
APPLE_KEY_ID=your-apple-key-id
APPLE_PRIVATE_KEY=your-apple-private-key
```

---

## 🔐 Security Considerations

### Current Implementation
✅ **Good practices:**
- JWT with expiration
- Refresh token rotation (hash stored, not raw)
- Rate limiting on OTP requests
- OTP expiration (5-10 min)
- Password hashing with bcryptjs
- Redis for sensitive data (OTP)

⚠️ **Areas to improve:**
- CORS configuration (currently `*`)
- No HTTPS enforcement
- No request validation middleware on all routes
- No API key authentication for admin endpoints

### For Social Login
- Validate ID tokens server-side
- Store provider IDs securely
- Implement account linking (phone + social)
- Add provider-specific rate limiting

---

## 📈 Scalability Features

✅ **Already implemented:**
- Redis caching for feed
- MongoDB indexing (geospatial, compound)
- BullMQ for background jobs
- Socket.IO with Redis adapter (horizontal scaling)
- Connection pooling (MongoDB)

---

## 🧪 Testing

```bash
npm run test              # Run Jest tests
npm run test:user         # Create test user
npm run lint              # ESLint check
```

**Test files:**
- `tests/auth.test.js`
- `tests/profile.test.js`
- `tests/feed.test.js`

---

## 📝 Key Files to Modify for Social Login

1. **auth.model.js** - Add social provider fields
2. **auth.service.js** - Add social auth handlers
3. **auth.controller.js** - Add social login endpoints
4. **auth.routes.js** - Add social routes
5. **auth.utils.js** - Add token verification utilities
6. **auth.validation.js** - Add social login validation
7. **.env** - Add social provider credentials

---

## 🎯 Next Steps for Social Login Implementation

### Phase 1: Setup
- [ ] Add social provider credentials to `.env`
- [ ] Install additional packages if needed
- [ ] Create social auth service module

### Phase 2: Google Login
- [ ] Implement Google ID token verification
- [ ] Create/update user on first login
- [ ] Link existing phone account to Google

### Phase 3: Facebook Login
- [ ] Implement Facebook Graph API integration
- [ ] Handle Facebook access token validation
- [ ] Account linking logic

### Phase 4: Apple Login
- [ ] Implement Apple ID token verification
- [ ] Handle private email relay
- [ ] Account linking logic

### Phase 5: Integration
- [ ] Add routes for all three providers
- [ ] Implement account linking UI flow
- [ ] Add tests for social login
- [ ] Update API documentation

---

## 📚 Additional Resources

### Commented Code References
The codebase has **commented implementations** for social login:

**auth.service.js (lines ~400-450):**
```javascript
// async function socialAuthHandler(email, provider, providerId) { ... }
// module.exports.googleLogin = async (idToken) => { ... }
// module.exports.facebookLogin = async (accessToken) => { ... }
// module.exports.appleLogin = async (idToken) => { ... }
```

**auth.controller.js (lines ~200-250):**
```javascript
// module.exports.googleLogin = async (req, res) => { ... }
// module.exports.facebookLogin = async (req, res) => { ... }
// module.exports.appleLogin = async (req, res) => { ... }
```

**auth.routes.js (lines ~20-25):**
```javascript
// router.post("/social/google", controller.googleLogin);
// router.post("/social/facebook", controller.facebookLogin);
// router.post("/social/apple", controller.appleLogin);
```

These can be used as a starting point!

---

## 🔗 API Endpoints Summary

### Current Endpoints
```
POST   /api/v1/auth/phone                    # Send phone OTP
POST   /api/v1/auth/verify                   # Verify phone OTP
POST   /api/v1/auth/register/email           # Send email OTP
POST   /api/v1/auth/verify/email             # Verify email OTP
POST   /api/v1/auth/refresh                  # Refresh token
POST   /api/v1/auth/logout                   # Logout

GET    /api/v1/profile                       # Get profile
PUT    /api/v1/profile                       # Update profile
POST   /api/v1/profile/photos                # Upload photos

POST   /api/v1/swipe                         # Like/Pass/Superlike
GET    /api/v1/swipe/feed                    # Get feed
POST   /api/v1/swipe/undo                    # Undo swipe

POST   /api/v1/chat/messages                 # Send message
GET    /api/v1/chat/conversations            # Get chats

POST   /api/v1/notifications/subscribe       # Subscribe to push
```

### To Be Added (Social Login)
```
POST   /api/v1/auth/social/google            # Google login
POST   /api/v1/auth/social/facebook          # Facebook login
POST   /api/v1/auth/social/apple             # Apple login
POST   /api/v1/auth/social/link              # Link social to phone
POST   /api/v1/auth/social/unlink            # Unlink social account
```

---

## 💡 Key Insights

1. **Hybrid Authentication**: The app supports both phone-based and email-based verification. Social login should integrate seamlessly.

2. **User Creation**: Users are created on first phone OTP verification. Social login should follow the same pattern.

3. **Profile Completion**: After auth, users must complete profile (60% mandatory, 40% optional). Social login should skip to profile completion.

4. **Token Strategy**: Uses JWT + refresh tokens. Social login should use the same token generation.

5. **Real-time Features**: Socket.IO with Redis adapter for chat. Social login doesn't affect this.

6. **Scalability**: Already designed for horizontal scaling with Redis adapter.

7. **Rate Limiting**: Implemented for OTP. Should also apply to social login attempts.

---

## 🎓 Recommendations

### For Social Login Implementation:

1. **Create a new service file**: `modules/auth/social.service.js`
   - Centralize all social auth logic
   - Handle provider-specific token verification
   - Implement account linking logic

2. **Extend User Model**:
   ```javascript
   social: {
     google: { id: String, email: String, linkedAt: Date },
     facebook: { id: String, email: String, linkedAt: Date },
     apple: { id: String, email: String, linkedAt: Date }
   }
   ```

3. **Create Social Auth Middleware**:
   - Validate provider tokens
   - Extract user info
   - Handle errors gracefully

4. **Implement Account Linking**:
   - Allow users to link multiple providers
   - Prevent duplicate accounts
   - Handle email conflicts

5. **Add Comprehensive Tests**:
   - Mock provider responses
   - Test token validation
   - Test account linking scenarios

6. **Update Documentation**:
   - Add social login flow diagrams
   - Document provider setup steps
   - Add troubleshooting guide

---

**Generated**: 2024
**Status**: Ready for Social Login Implementation
