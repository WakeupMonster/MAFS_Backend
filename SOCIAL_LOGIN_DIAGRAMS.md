# 📊 Social Login - Visual Diagrams & Flows

## 1. Complete Authentication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER JOURNEY                             │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐
│   Frontend   │
│  (Web/App)   │
└──────┬───────┘
       │
       │ 1. User clicks "Login with Google"
       ↓
┌──────────────────────────────────────────┐
│  Google/Facebook/Apple Login Dialog      │
│  (Handled by Provider SDK)               │
��──────┬───────────────────────────────────┘
       │
       │ 2. User authenticates
       │ 3. Provider returns token
       ↓
┌──────────────────────────────────────────┐
│  Frontend receives token                 │
│  (idToken or accessToken)                │
└──────┬───────────────────────────────────┘
       │
       │ 4. Send token to backend
       │    POST /api/v1/auth/social/login
       ↓
┌──────────────────────────────────────────┐
│         BACKEND (Your Server)            │
│                                          │
│  1. Receive token                        │
│  2. Verify token with provider           │
│  3. Extract user info                    │
│  4. Find or create user                  │
│  5. Generate JWT tokens                  │
│  6. Return tokens to frontend            │
└──────┬───────────────────────────────────┘
       │
       │ 5. Frontend receives tokens
       ↓
┌──────────────────────────────────────────┐
│  Frontend stores tokens                  │
│  - accessToken (memory/localStorage)     │
│  - refreshToken (secure storage)         │
└──────┬───────────────────────────────────┘
       │
       │ 6. User logged in
       │ 7. Redirect to next step
       ↓
┌──────────────────────────────────────────┐
│  User can now:                           │
│  - Access protected endpoints            │
│  - Complete profile                      │
│  - Start swiping                         │
└──────────────────────────────────────────┘
```

---

## 2. Token Verification Process

```
┌───────────────���─────────────────────────────────────────────────┐
│              TOKEN VERIFICATION FLOW                             │
└─────────────────────────────────────────────────────────────────┘

Frontend sends token to backend:
┌──────────────────────────────────────────┐
│  POST /api/v1/auth/social/login          │
│  {                                       │
│    "provider": "google",                 │
│    "idToken": "eyJhbGciOiJSUzI1NiI..."  │
│  }                                       │
└──────┬───────────────────────────────────┘
       │
       ↓
Backend receives token:
┌──────────────────────────────────────────┐
│  1. Decode token header                  │
│     - Get algorithm (RS256)              │
│     - Get key ID (kid)                   │
└──────┬───────────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────────┐
│  2. Fetch provider's public keys         │
│     - Google: https://...                │
│     - Facebook: https://...              │
│     - Apple: https://...                 │
└──────┬───────────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────────┐
│  3. Find matching public key             │
│     - Match by key ID (kid)              │
└──────┬───────────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────────┐
│  4. Verify token signature               │
│     - Use public key                     │
│     - Check signature is valid           │
└──────┬───────────────────────────────────┘
       │
       ↓
┌──────���───────────────────────────────────┐
│  5. Validate token claims                │
│     - Check expiration (exp)             │
│     - Check audience (aud)               │
│     - Check issuer (iss)                 │
└──────┬───────────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────────┐
│  6. Extract user info from payload       │
│     - sub (user ID)                      │
│     - email                              │
│     - name                               │
│     - picture                            │
└──────┬───────────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────────┐
│  ✅ Token verified successfully!         │
│  Proceed with user creation/login        │
└──��───────────────────────────────────────┘
```

---

## 3. User Creation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│              USER CREATION FLOW                                  │
└─────────────────────────────────────────────────────────────────┘

Token verified, user info extracted:
┌──────────────────────────────────────────┐
│  Provider User Info:                     │
│  - id: "1234567890"                      │
│  - email: "user@gmail.com"               │
│  - name: "John Doe"                      │
│  - picture: "https://..."                │
└──────┬───────────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────────┐
│  Step 1: Check if user exists            │
│  Query: social.google.id = "1234567890"  │
└──────┬───────────────────────────────────┘
       │
       ├─ YES → User found
       │        └─ Update lastLoginAt
       │        └─ Return existing user
       │
       └─ NO → Continue to Step 2
              │
              ↓
         ┌──────────────────────────────────────────┐
         │  Step 2: Check if email exists           │
         │  Query: email = "user@gmail.com"         │
         └──────┬───────────────────────────────────┘
                │
                ├─ YES → User found
                │        └─ Link social account
                │        └─ Return existing user
                │
                └─ NO → Continue to Step 3
                       ��
                       ↓
                  ┌──────────────────────────────────────────┐
                  │  Step 3: Create new user                 │
                  │  - Set email                             │
                  │  - Set isEmailVerified = true            │
                  │  - Set authMethod = "google"             │
                  │  - Store social.google info              │
                  │  - Generate refresh tokens               │
                  └──────┬───────────────────────────────────┘
                         │
                         ↓
                  ┌──────────────────────────────────────────┐
                  │  Step 4: Create profile document         │
                  │  - userId reference                      │
                  │  - onboardingProgress.emailVerified=true │
                  └──────┬──────────────────���────────────────┘
                         │
                         ↓
                  ┌──────────────────────────────────────────┐
                  │  ✅ User created successfully!           │
                  │  Return new user                         │
                  └──────────────────────────────────────────┘
```

---

## 4. Database Schema

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER COLLECTION                               │
└─────────────────────────────────────────────────────────────────┘

{
  _id: ObjectId("507f1f77bcf86cd799439011"),
  
  // Phone Authentication
  phone: "+1234567890",
  isPhoneVerified: false,
  phoneOtp: null,
  phoneOtpExpires: null,
  
  // Email Authentication
  email: "user@gmail.com",
  isEmailVerified: true,
  emailOtp: null,
  emailOtpExpires: null,
  
  // Social Authentication
  social: {
    google: {
      id: "1234567890",
      email: "user@gmail.com",
      name: "John Doe",
      picture: "https://...",
      linkedAt: ISODate("2024-01-15T10:30:00Z"),
      lastLoginAt: ISODate("2024-01-15T10:30:00Z")
    },
    facebook: null,
    apple: null
  },
  
  // Tokens
  refreshTokens: [
    {
      tokenHash: "abc123...",
      expiresAt: ISODate("2024-01-22T10:30:00Z")
    }
  ],
  
  // Notifications
  fcmTokens: [
    {
      token: "fcm-token-123",
      deviceId: "device-123",
      createdAt: ISODate("2024-01-15T10:30:00Z")
    }
  ],
  
  // Status
  authMethod: "google",
  isNewUser: true,
  isProfileCompleted: false,
  
  // Timestamps
  createdAt: ISODate("2024-01-15T10:30:00Z"),
  updatedAt: ISODate("2024-01-15T10:30:00Z")
}

┌─────────────────────────────────────────────────────────────────┐
│                    PROFILE COLLECTION                            │
└─────────────────────────────────────────────────────────────────┘

{
  _id: ObjectId("507f1f77bcf86cd799439012"),
  userId: ObjectId("507f1f77bcf86cd799439011"),
  
  // Basic Info
  fullName: null,
  nickname: null,
  bio: null,
  dob: null,
  gender: null,
  
  // Onboarding Progress
  onboardingProgress: {
    phoneVerified: false,
    emailVerified: true,
    nicknameSet: false,
    dobSet: false,
    genderSet: false,
    ...
    mandatoryCompletion: 10,
    optionalCompletion: 0,
    totalCompletion: 10
  },
  
  // Status
  isMandatoryComplete: false,
  isProfileComplete: false,
  canAccessSwipe: false,
  isDiscoverable: false,
  
  // Timestamps
  createdAt: ISODate("2024-01-15T10:30:00Z"),
  updatedAt: ISODate("2024-01-15T10:30:00Z")
}
```

---

## 5. API Request/Response Flow

```
┌─────────────────────────────────────────────────────────────────┐
│              API REQUEST/RESPONSE                                │
└─────────────────────────────────────────────────────────────────┘

REQUEST:
┌──────────────────────────────────────────┐
│  POST /api/v1/auth/social/login          │
│                                          │
│  Headers:                                │
│  Content-Type: application/json          │
│                                          │
│  Body:                                   │
│  {                                       │
│    "provider": "google",                 │
│    "idToken": "eyJhbGciOiJSUzI1NiI...",  │
│    "deviceId": "device-123",             │
│    "fcmToken": "fcm-token-123"           │
│  }                                       │
└──────┬───────────────────────────────────┘
       │
       ↓ (Processing)
       
RESPONSE (Success):
┌──────────────────────────────────────────┐
│  HTTP 200 OK                             │
│                                          │
│  {                                       │
│    "success": true,                      │
│    "message": "google login successful", │
│    "data": {                             │
│      "userId": "507f1f77bcf86cd799...",  │
│      "accessToken": "eyJhbGciOiJI...",   │
│      "refreshToken": "a1b2c3d4e5...",    │
│      "isNewUser": true,                  │
│      "isPhoneVerified": false,           │
│      "isEmailVerified": true,            │
│      "nextStep": {                       │
│        "screen": "phone_verification",   │
│        "message": "Verify your phone"    │
│      },                                  │
│      "authMethod": "google"              │
│    }                                     │
│  }                                       │
└──────────────────────────────────────────┘

RESPONSE (Error):
┌──────────────────────────────────────────┐
│  HTTP 400 Bad Request                    │
│                                          │
│  {                                       │
│    "success": false,                     │
│    "message": "Invalid token",           │
│    "code": "INVALID_TOKEN"               │
│  }                                       │
└──────────────────────────────────────────┘
```

---

## 6. Account Linking Flow

```
┌─────────────────────────────────────────────────────────────────┐
│              ACCOUNT LINKING FLOW                                │
└─────────────────���───────────────────────────────────────────────┘

User already logged in with phone:
┌──────────────────────────────────────────┐
│  User has:                               │
│  - accessToken (JWT)                     │
│  - phone verified                        │
│  - no social accounts                    │
└──────┬───────────────────────────────────┘
       │
       │ User clicks "Link Google Account"
       ↓
┌──────────────────────────────────────────┐
│  POST /api/v1/auth/social/link           │
│  Authorization: Bearer {accessToken}     │
│  {                                       │
│    "provider": "google",                 │
│    "idToken": "..."                      │
│  }                                       │
└──────┬───────────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────────┐
│  Backend:                                │
│  1. Verify JWT token                     │
│  2. Get userId from token                │
│  3. Verify Google token                  │
│  4. Check if Google ID already linked    │
│  5. Check if Google ID used by other user│
│  6. Link Google account to user          │
│  7. Return success                       │
└──────┬───────────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────────┐
│  Response:                               │
│  {                                       │
│    "success": true,                      │
│    "message": "Google account linked",   │
│    "data": {                             │
│      "provider": "google",               │
│      "email": "user@gmail.com"           │
│    }                                     │
│  }                                       │
└──────┬───────────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────────┐
│  User now has:                           │
│  - Phone verified                        │
│  - Google linked                         │
│  - Can login with either                 │
└──────────────────────────────────────────┘
```

---

## 7. Error Handling Flow

```
┌─────────────────────────────────────────────────────────────────┐
│              ERROR HANDLING FLOW                                 │
└─────────────────────────────────────────────────────────────────┘

Request received:
┌──────────────────────────────────────────┐
│  POST /api/v1/auth/social/login          │
│  { "provider": "google", "idToken": "..." }
└──────┬───────────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────────┐
│  Validation Layer                        │
│  - Check provider exists                 │
│  - Check token exists                    │
│  - Check token format                    │
└──────┬───────────────────────────────────┘
       │
       ├─ VALIDATION ERROR
       │  └─ Return 400 with error details
       │
       └─ VALIDATION OK
          │
          ↓
       ┌──────────────────────────────────────────┐
       │  Token Verification Layer                │
       ��  - Verify signature                      │
       │  - Check expiration                      │
       │  - Check audience                        │
       │  - Check issuer                          │
       └──────┬───────────────────────────────────┘
              │
              ├─ TOKEN ERROR
              │  └─ Return 400 with error code
              │
              └─ TOKEN OK
                 │
                 ↓
              ┌──────────────────────────────────────────┐
              │  User Processing Layer                   │
              │  - Find or create user                   │
              │  - Check for conflicts                   │
              │  - Generate tokens                       │
              └──────┬───────────────────────────────────┘
                     │
                     ├─ PROCESSING ERROR
                     │  └─ Return 500 with error
                     │
                     └─ PROCESSING OK
                        │
                        ↓
                     ┌──────────────────────────────────────────┐
                     │  ✅ Success                              │
                     │  Return 200 with user data               │
                     └──────────────────────────────────────────��
```

---

## 8. Provider Comparison

```
┌─────────────────────────────────────────────────────────────────┐
│              PROVIDER COMPARISON                                 │
└─────────────────────────────────────────────────────────────────┘

                    GOOGLE          FACEBOOK        APPLE
┌─────────────────────────────────────────────────────────────────┐
│ Token Type      │ ID Token        │ Access Token   │ ID Token    │
├─────────────────────────────────────────────────────────────────┤
│ Verification    │ JWT signature   │ API call       │ JWT signature│
├─────────────────────────────────────────────────────────────────┤
│ Email Provided  │ Always          │ If permitted   │ First login │
├─────────────────────────────────────────────────────────────────┤
│ User ID         │ sub             │ id             │ sub         │
├─────────────────────────────────────────────────────────────────┤
│ Setup Difficulty│ Easy            │ Medium         │ Hard        │
├─────────────────────────────────────────────────────────────────┤
│ Cost            │ Free            │ Free           │ $99/year    │
├─────────────────────────────────────────────────────────────────┤
│ Platforms       │ Web, Mobile     │ Web, Mobile    │ Apple only  │
├─────────────────────────────────────────────────────────────────┤
│ Market Share    │ ~60%            │ ~25%           │ ~15%        │
└────────────────────��────────────────────────────────────────────┘
```

---

## 9. Security Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│              SECURITY LAYERS                                     │
└─────────────────────────────────────────────────────────────────┘

Layer 1: Input Validation
┌──────────────────────────────────────────┐
│ - Check required fields                  │
│ - Check field types                      │
│ - Check field lengths                    │
│ - Reject invalid input                   │
└──────┬───────────────────────────────────┘
       │
       ↓
Layer 2: Token Verification
┌────────────���─────────────────────────────┐
│ - Verify signature                       │
│ - Check expiration                       │
│ - Check audience                         │
│ - Check issuer                           │
│ - Validate claims                        │
└──────┬───────────────────────────────────┘
       │
       ↓
Layer 3: Provider Validation
┌──────────────────────────────────────────┐
│ - Verify with provider API               │
│ - Check token not revoked                │
│ - Validate provider ID                   │
└──────┬───────────────────────────────────┘
       │
       ↓
Layer 4: User Processing
┌──────────────────────────────────────────┐
│ - Check for duplicates                   │
│ - Prevent account takeover               │
│ - Validate email                         │
│ - Check for conflicts                    │
└──────┬───────────────────────────────────┘
       │
       ↓
Layer 5: Token Generation
┌───────────────────���──────────────────────┐
│ - Generate secure tokens                 │
│ - Hash refresh tokens                    │
│ - Set expiration                         │
│ - Store securely                         │
└──────┬───────────────────────────────────┘
       │
       ↓
Layer 6: Response
┌──────────────────────────────────────────┐
│ - Return tokens securely                 │
│ - Use HTTPS only                         │
│ - Set secure headers                     │
│ - No sensitive data in logs              │
└──────────────────────────────────────────┘
```

---

## 10. Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│              PRODUCTION DEPLOYMENT                               │
└──���──────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Frontend (Web/Mobile)                  │
│  - React/React Native                   │
│  - Google/Facebook/Apple SDKs           │
└──────┬────────────────────────────────┬─┘
       │                                │
       │ HTTPS                          │ HTTPS
       │                                │
       ↓                                ↓
┌──────────────────────────────────────────┐
│  Load Balancer (HTTPS)                   │
│  - SSL/TLS Termination                   │
│  - Rate Limiting                         │
│  - CORS Headers                          │
└──────┬───────────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────────┐
│  API Server (Node.js + Express)          │
│  - Social Login Endpoints                │
│  - Token Verification                    │
│  - User Management                       │
└──────┬───────────────────────────────────┘
       │
       ├─────────────────┬─────────────────┐
       │                 │                 │
       ↓                 ↓                 ↓
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  MongoDB     │  │  Redis       │  │  External    │
│  - Users     │  │  - Cache     │  │  APIs        │
│  - Profiles  │  │  - Sessions  │  │  - Google    │
│  - Tokens    │  │  - Queues    │  │  - Facebook  │
└──────────────┘  └──────────────┘  │  - Apple     │
                                     └──────────────┘
```

---

**All diagrams are ASCII-based for easy understanding!**
