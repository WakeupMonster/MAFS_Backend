# 🔐 Social Login Implementation Guide - Step by Step

## 📚 Table of Contents
1. [Overview & Architecture](#overview)
2. [Provider Setup (Google, Facebook, Apple)](#provider-setup)
3. [File Structure](#file-structure)
4. [Implementation Steps](#implementation-steps)
5. [API Endpoints](#api-endpoints)
6. [Testing Guide](#testing-guide)
7. [Troubleshooting](#troubleshooting)

---

## Overview & Architecture

### What is Social Login?
Social login allows users to authenticate using their existing accounts from Google, Facebook, or Apple instead of creating new credentials.

### Flow Diagram
```
User clicks "Login with Google/Facebook/Apple"
        ↓
Frontend gets ID Token from provider
        ↓
Frontend sends ID Token to backend
        ↓
Backend validates token with provider
        ↓
Backend checks if user exists
        ├─ YES → Generate JWT tokens & return
        └─ NO → Create user & return
        ↓
Frontend stores JWT tokens
        ↓
User can now access app
```

### Why Unified API?
- **Single endpoint** for all providers
- **Cleaner code** - less duplication
- **Easier maintenance** - one place to update logic
- **Better error handling** - consistent responses

### API Design
```
POST /api/v1/auth/social/login
{
  "provider": "google",  // or "facebook", "apple"
  "idToken": "...",      // Token from provider
  "accessToken": "..."   // Optional, for Facebook
}

Response:
{
  "success": true,
  "data": {
    "userId": "...",
    "accessToken": "...",
    "refreshToken": "...",
    "isNewUser": true,
    "nextStep": "profile_setup"
  }
}
```

---

## Provider Setup

### 1️⃣ Google Setup

#### Step 1: Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project: "MAFS Dating App"
3. Enable "Google+ API"

#### Step 2: Create OAuth 2.0 Credentials
1. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
2. Choose "Web application"
3. Add authorized redirect URIs:
   ```
   http://localhost:3000
   http://localhost:3000/auth/callback
   https://yourdomain.com
   https://yourdomain.com/auth/callback
   ```
4. Copy: **Client ID** and **Client Secret**

#### Step 3: For Mobile/Web Frontend
- Use Google Sign-In SDK
- Get ID Token from frontend
- Send to backend

#### Environment Variables
```bash
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```

---

### 2️⃣ Facebook Setup

#### Step 1: Create Facebook App
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create new app → "Consumer"
3. App name: "MAFS Dating"
4. App purpose: "Apps for Pages"

#### Step 2: Configure Facebook Login
1. Add product: "Facebook Login"
2. Go to Settings → Basic
3. Copy: **App ID** and **App Secret**

#### Step 3: Configure OAuth Redirect URIs
1. Go to Facebook Login → Settings
2. Add Valid OAuth Redirect URIs:
   ```
   http://localhost:3000
   http://localhost:3000/auth/callback
   https://yourdomain.com
   https://yourdomain.com/auth/callback
   ```

#### Step 4: Get User Fields
1. Go to Tools → Graph API Explorer
2. Select your app
3. Get access token
4. Query: `me?fields=id,email,name,picture`

#### Environment Variables
```bash
FACEBOOK_APP_ID=your-app-id
FACEBOOK_APP_SECRET=your-app-secret
```

---

### 3️⃣ Apple Setup

#### Step 1: Apple Developer Account
1. Go to [Apple Developer](https://developer.apple.com/)
2. Enroll in Apple Developer Program ($99/year)

#### Step 2: Create App ID
1. Go to Certificates, Identifiers & Profiles
2. Create new Identifier (App ID)
3. Bundle ID: `com.mafs.dating`

#### Step 3: Create Service ID
1. Create new Service ID
2. Enable "Sign in with Apple"
3. Configure return URLs:
   ```
   https://yourdomain.com
   https://yourdomain.com/auth/callback
   ```

#### Step 4: Create Private Key
1. Go to Keys
2. Create new key
3. Enable "Sign in with Apple"
4. Download `.p8` file (keep safe!)

#### Environment Variables
```bash
APPLE_TEAM_ID=your-team-id
APPLE_KEY_ID=your-key-id
APPLE_PRIVATE_KEY=your-private-key-content
APPLE_BUNDLE_ID=com.mafs.dating
```

---

## File Structure

### New Files to Create
```
modules/auth/
├── social/
│   ├── social.service.js          # ← Social auth logic
│   ├── social.controller.js        # ← API handlers
│   ├── social.routes.js            # ← Routes
│   ├── social.validation.js        # ← Input validation
│   ├── providers/
│   │   ├── google.provider.js       # ← Google token verification
│   │   ├── facebook.provider.js     # ← Facebook token verification
│   │   └── apple.provider.js        # ← Apple token verification
│   └── utils/
│       └── account-linking.js       # ← Link social to phone
│
├── auth.model.js                   # ← MODIFY: Add social fields
├── auth.service.js                 # ← MODIFY: Add social handler
├── auth.routes.js                  # ← MODIFY: Add social routes
└── auth.validation.js              # ← MODIFY: Add social validation
```

---

## Implementation Steps

### STEP 1: Update User Model

**File**: `modules/auth/auth.model.js`

Add social provider fields to store provider IDs and emails.

### STEP 2: Create Provider Verification Services

**Files**:
- `modules/auth/social/providers/google.provider.js`
- `modules/auth/social/providers/facebook.provider.js`
- `modules/auth/social/providers/apple.provider.js`

Each provider has different token verification logic.

### STEP 3: Create Social Service

**File**: `modules/auth/social/social.service.js`

Main business logic for:
- Verifying tokens
- Creating/finding users
- Linking accounts
- Generating JWT tokens

### STEP 4: Create Social Controller

**File**: `modules/auth/social/social.controller.js`

API endpoint handlers for social login.

### STEP 5: Create Social Routes

**File**: `modules/auth/social/social.routes.js`

Define the unified POST endpoint.

### STEP 6: Update Main Auth Routes

**File**: `modules/auth/auth.routes.js`

Include social routes.

### STEP 7: Environment Setup

Update `.env` with all provider credentials.

### STEP 8: Testing

Test each provider with Postman/curl.

---

## API Endpoints

### Unified Social Login Endpoint

```
POST /api/v1/auth/social/login
Content-Type: application/json

Request Body:
{
  "provider": "google",           // Required: "google" | "facebook" | "apple"
  "idToken": "eyJhbGciOiJSUzI1...",  // Required for Google & Apple
  "accessToken": "EAABsbCS1iHg...",  // Required for Facebook
  "deviceId": "device-123",       // Optional: for FCM
  "fcmToken": "fcm-token-123"     // Optional: for push notifications
}

Response (Success):
{
  "success": true,
  "data": {
    "userId": "507f1f77bcf86cd799439011",
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
    "isNewUser": true,
    "isPhoneVerified": false,
    "isEmailVerified": true,
    "nextStep": {
      "screen": "phone_verification",
      "message": "Verify your phone number"
    }
  }
}

Response (Error):
{
  "success": false,
  "message": "Invalid token",
  "code": "INVALID_TOKEN"
}
```

### Account Linking Endpoint (Optional)

```
POST /api/v1/auth/social/link
Authorization: Bearer {accessToken}
Content-Type: application/json

Request Body:
{
  "provider": "google",
  "idToken": "..."
}

Response:
{
  "success": true,
  "message": "Google account linked successfully"
}
```

### Unlink Social Account (Optional)

```
POST /api/v1/auth/social/unlink
Authorization: Bearer {accessToken}
Content-Type: application/json

Request Body:
{
  "provider": "google"
}

Response:
{
  "success": true,
  "message": "Google account unlinked"
}
```

---

## No GET API Needed

**Why?**
- Social login is a **one-time action** (POST)
- No need to fetch social login status
- User status is in JWT token
- Profile info is fetched from `/api/v1/profile`

**If you need to check linked accounts:**
```
GET /api/v1/profile/social-accounts
Authorization: Bearer {accessToken}

Response:
{
  "linkedAccounts": {
    "google": { "email": "user@gmail.com", "linkedAt": "2024-01-15" },
    "facebook": null,
    "apple": null
  }
}
```

---

## Token Flow Explained

### Frontend to Backend Token Flow

```
1. FRONTEND (Web/Mobile)
   ├─ User clicks "Login with Google"
   ├─ Google SDK opens login dialog
   ├─ User authenticates with Google
   ├─ Google returns ID Token (JWT)
   └─ Frontend sends ID Token to backend

2. BACKEND (Your Server)
   ├─ Receives ID Token
   ├─ Verifies token signature with Google's public key
   ├─ Extracts user info (email, name, picture)
   ├─ Checks if user exists in DB
   ├─ Creates user if new
   ├─ Generates JWT access token
   ├─ Generates refresh token
   └─ Returns both tokens to frontend

3. FRONTEND (Web/Mobile)
   ├─ Stores access token (memory/localStorage)
   ├─ Stores refresh token (secure storage)
   └─ Uses access token for API calls

4. SUBSEQUENT API CALLS
   ├─ Frontend sends: Authorization: Bearer {accessToken}
   ├─ Backend verifies token
   ├─ Backend processes request
   └─ Returns response
```

### Token Verification Process

```
ID Token from Provider (JWT format):
{
  "header": {
    "alg": "RS256",
    "kid": "key-id"
  },
  "payload": {
    "iss": "https://accounts.google.com",
    "sub": "1234567890",
    "email": "user@gmail.com",
    "email_verified": true,
    "name": "John Doe",
    "picture": "https://...",
    "aud": "YOUR_CLIENT_ID",
    "exp": 1234567890,
    "iat": 1234567800
  },
  "signature": "..."
}

Backend Verification Steps:
1. Check token signature (using provider's public key)
2. Check token expiration (exp > current time)
3. Check audience (aud == YOUR_CLIENT_ID)
4. Check issuer (iss == provider domain)
5. Extract user info from payload
6. Create/update user in DB
7. Generate your own JWT token
```

---

## Environment Variables

Create/Update `.env`:

```bash
# ============ SOCIAL LOGIN ============

# Google
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# Facebook
FACEBOOK_APP_ID=your-app-id
FACEBOOK_APP_SECRET=your-app-secret

# Apple
APPLE_TEAM_ID=your-team-id
APPLE_KEY_ID=your-key-id
APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
APPLE_BUNDLE_ID=com.mafs.dating

# Frontend URLs (for CORS)
FRONTEND_URL=http://localhost:3000
FRONTEND_PROD_URL=https://yourdomain.com
```

---

## Testing Guide

### Using Postman

#### Test Google Login
1. Get ID Token from [Google OAuth Playground](https://developers.google.com/oauthplayground/)
2. POST to `http://localhost:3000/api/v1/auth/social/login`
3. Body:
```json
{
  "provider": "google",
  "idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjEifQ..."
}
```

#### Test Facebook Login
1. Get access token from [Facebook Graph API Explorer](https://developers.facebook.com/tools/explorer/)
2. POST to `http://localhost:3000/api/v1/auth/social/login`
3. Body:
```json
{
  "provider": "facebook",
  "accessToken": "EAABsbCS1iHg..."
}
```

#### Test Apple Login
1. Get ID Token from Apple Sign-In
2. POST to `http://localhost:3000/api/v1/auth/social/login`
3. Body:
```json
{
  "provider": "apple",
  "idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjEifQ..."
}
```

---

## Troubleshooting

### Common Issues

#### 1. "Invalid Token"
- **Cause**: Token expired or invalid signature
- **Fix**: Get fresh token from provider

#### 2. "Client ID mismatch"
- **Cause**: Token issued for different app
- **Fix**: Check GOOGLE_CLIENT_ID matches provider settings

#### 3. "Token signature verification failed"
- **Cause**: Using wrong public key
- **Fix**: Ensure using provider's current public key

#### 4. "User already exists with different provider"
- **Cause**: Email already registered with phone
- **Fix**: Implement account linking flow

#### 5. "CORS error"
- **Cause**: Frontend domain not whitelisted
- **Fix**: Add domain to provider's redirect URIs

---

## Best Practices

✅ **DO:**
- Validate tokens server-side (never trust frontend)
- Store provider IDs (not tokens)
- Use HTTPS in production
- Implement rate limiting on login endpoint
- Log authentication events
- Use environment variables for secrets
- Implement account linking for existing users
- Add email verification for social accounts

❌ **DON'T:**
- Store provider tokens in DB
- Trust token validation from frontend
- Use HTTP in production
- Hardcode credentials
- Skip token expiration checks
- Allow unlimited login attempts
- Expose error details to users

---

## Next Steps

1. ✅ Read this guide completely
2. ✅ Set up provider credentials
3. ✅ Create `.env` file with credentials
4. ✅ Follow implementation steps (STEP 1-8)
5. ✅ Test with Postman
6. ✅ Integrate with frontend
7. ✅ Deploy to production

---

**Ready to start? Let's go to STEP 1!**
