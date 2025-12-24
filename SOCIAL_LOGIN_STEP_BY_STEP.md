# 🚀 Social Login - Complete Step-by-Step Implementation

## 📋 Quick Overview

You now have all the files created. This guide will walk you through:
1. ✅ What files were created
2. ✅ How to set up provider credentials
3. ✅ How to test everything
4. ✅ Common issues and fixes

---

## ✅ STEP 1: Files Created

### New Files Created:
```
✅ modules/auth/auth.model.js                          (UPDATED)
✅ modules/auth/auth.routes.js                         (UPDATED)
✅ modules/auth/social/social.service.js               (NEW)
✅ modules/auth/social/social.controller.js            (NEW)
✅ modules/auth/social/social.routes.js                (NEW)
✅ modules/auth/social/social.validation.js            (NEW)
✅ modules/auth/social/providers/google.provider.js    (NEW)
✅ modules/auth/social/providers/facebook.provider.js  (NEW)
✅ modules/auth/social/providers/apple.provider.js     (NEW)
✅ .env.example                                        (UPDATED)
```

### File Structure:
```
modules/auth/
├── auth.model.js                    ✅ Updated with social fields
├── auth.routes.js                   ✅ Updated with social routes
├── auth.controller.js               (No changes needed)
├── auth.service.js                  (No changes needed)
├── auth.utils.js                    (No changes needed)
├── auth.validation.js               (No changes needed)
│
└── social/                          ✅ NEW FOLDER
    ├── social.service.js            ✅ Main business logic
    ├── social.controller.js         ✅ API handlers
    ├── social.routes.js             ✅ Route definitions
    ├── social.validation.js         ✅ Input validation
    │
    └── providers/                   ✅ NEW FOLDER
        ├── google.provider.js       ✅ Google token verification
        ├── facebook.provider.js     ✅ Facebook token verification
        └── apple.provider.js        ✅ Apple token verification
```

---

## ✅ STEP 2: Environment Setup

### 2.1 Copy .env.example to .env

```bash
# In your project root
cp .env.example .env
```

### 2.2 Update .env with Your Credentials

Open `.env` and fill in all the values. We'll get these in the next steps.

---

## ✅ STEP 3: Get Google Credentials

### 3.1 Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a Project" → "New Project"
3. Name: "MAFS Dating App"
4. Click "Create"

### 3.2 Enable Google+ API

1. In the left sidebar, click "APIs & Services" → "Library"
2. Search for "Google+ API"
3. Click on it → "Enable"

### 3.3 Create OAuth 2.0 Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth 2.0 Client ID"
3. Choose "Web application"
4. Name: "MAFS Web"
5. Add Authorized redirect URIs:
   ```
   http://localhost:3000
   http://localhost:3000/auth/callback
   https://yourdomain.com
   https://yourdomain.com/auth/callback
   ```
6. Click "Create"
7. Copy the **Client ID** and **Client Secret**

### 3.4 Update .env

```bash
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```

---

## ✅ STEP 4: Get Facebook Credentials

### 4.1 Create Facebook App

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Click "My Apps" → "Create App"
3. Choose "Consumer"
4. App Name: "MAFS Dating"
5. App Purpose: "Apps for Pages"
6. Click "Create App"

### 4.2 Add Facebook Login Product

1. In your app dashboard, click "Add Product"
2. Find "Facebook Login" �� "Set Up"
3. Choose "Web"

### 4.3 Configure Settings

1. Go to "Settings" → "Basic"
2. Copy **App ID** and **App Secret**
3. Go to "Facebook Login" → "Settings"
4. Add Valid OAuth Redirect URIs:
   ```
   http://localhost:3000
   http://localhost:3000/auth/callback
   https://yourdomain.com
   https://yourdomain.com/auth/callback
   ```

### 4.4 Update .env

```bash
FACEBOOK_APP_ID=your-app-id
FACEBOOK_APP_SECRET=your-app-secret
```

---

## ✅ STEP 5: Get Apple Credentials

### 5.1 Apple Developer Account

1. Go to [Apple Developer](https://developer.apple.com/)
2. Sign in with your Apple ID
3. Enroll in Apple Developer Program ($99/year)

### 5.2 Create App ID

1. Go to "Certificates, Identifiers & Profiles"
2. Click "Identifiers" → "+"
3. Choose "App IDs"
4. Name: "MAFS Dating"
5. Bundle ID: `com.mafs.dating`
6. Enable "Sign in with Apple"
7. Click "Continue" → "Register"

### 5.3 Create Service ID

1. Go to "Identifiers" → "+"
2. Choose "Service IDs"
3. Name: "MAFS Dating Web"
4. Identifier: `com.mafs.dating.web`
5. Enable "Sign in with Apple"
6. Click "Configure"
7. Add Domain: `yourdomain.com`
8. Add Return URL: `https://yourdomain.com/auth/callback`
9. Click "Save"

### 5.4 Create Private Key

1. Go to "Keys" → "+"
2. Name: "MAFS Dating Key"
3. Enable "Sign in with Apple"
4. Click "Configure"
5. Choose your App ID
6. Click "Save"
7. Click "Continue" → "Register"
8. **Download the .p8 file** (keep it safe!)

### 5.5 Get Team ID and Key ID

1. Go to "Membership" to find your **Team ID**
2. Go back to "Keys" and click your key to see **Key ID**

### 5.6 Update .env

```bash
APPLE_TEAM_ID=your-team-id
APPLE_KEY_ID=your-key-id
APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
APPLE_BUNDLE_ID=com.mafs.dating
```

**Note**: For APPLE_PRIVATE_KEY, open the .p8 file and copy the entire content, replacing newlines with `\n`.

---

## ✅ STEP 6: Test the Implementation

### 6.1 Start Your Server

```bash
npm run dev
```

You should see:
```
🚀 API + Socket Server running on port 3000
```

### 6.2 Test Google Login with Postman

#### Get Google ID Token

1. Go to [Google OAuth Playground](https://developers.google.com/oauthplayground/)
2. Click the gear icon → "Use your own OAuth credentials"
3. Enter your **Client ID** and **Client Secret**
4. In the left panel, find "Google+ API v1" → "userinfo"
5. Click "Authorize APIs"
6. Sign in with your Google account
7. Copy the **ID Token** from the response

#### Test Login Endpoint

1. Open Postman
2. Create new POST request
3. URL: `http://localhost:3000/api/v1/auth/social/login`
4. Headers:
   ```
   Content-Type: application/json
   ```
5. Body (raw JSON):
   ```json
   {
     "provider": "google",
     "idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjEifQ..."
   }
   ```
6. Click "Send"

#### Expected Response:
```json
{
  "success": true,
  "message": "google login successful",
  "data": {
    "userId": "507f1f77bcf86cd799439011",
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
    "isNewUser": true,
    "isPhoneVerified": false,
    "isEmailVerified": true,
    "nextStep": {
      "screen": "phone_verification",
      "message": "Verify your phone number to continue"
    },
    "authMethod": "google"
  }
}
```

### 6.3 Test Facebook Login with Postman

#### Get Facebook Access Token

1. Go to [Facebook Graph API Explorer](https://developers.facebook.com/tools/explorer/)
2. Select your app from dropdown
3. Click "Get Token" → "Get User Access Token"
4. Select permissions: `email`, `public_profile`
5. Click "Generate Access Token"
6. Copy the **Access Token**

#### Test Login Endpoint

1. Open Postman
2. Create new POST request
3. URL: `http://localhost:3000/api/v1/auth/social/login`
4. Body (raw JSON):
   ```json
   {
     "provider": "facebook",
     "accessToken": "EAABsbCS1iHg..."
   }
   ```
5. Click "Send"

#### Expected Response:
Same as Google response above

### 6.4 Test Apple Login

For Apple, you need to test from an Apple device or use Apple's testing tools. The process is similar but requires the ID Token from Apple Sign-In.

---

## ✅ STEP 7: Test Account Linking

### Link Google Account to Existing User

1. First, login with phone to get access token
2. Use that access token to link Google

```bash
POST http://localhost:3000/api/v1/auth/social/link

Headers:
Authorization: Bearer {accessToken}
Content-Type: application/json

Body:
{
  "provider": "google",
  "idToken": "..."
}
```

### Get Linked Accounts

```bash
GET http://localhost:3000/api/v1/auth/social/accounts

Headers:
Authorization: Bearer {accessToken}
```

### Unlink Account

```bash
POST http://localhost:3000/api/v1/auth/social/unlink

Headers:
Authorization: Bearer {accessToken}
Content-Type: application/json

Body:
{
  "provider": "google"
}
```

---

## ✅ STEP 8: Frontend Integration

### For Web (React/Vue/Angular)

#### Google Sign-In

```javascript
// Install: npm install @react-oauth/google

import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';

function LoginPage() {
  const handleGoogleSuccess = async (credentialResponse) => {
    const response = await fetch('http://localhost:3000/api/v1/auth/social/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'google',
        idToken: credentialResponse.credential
      })
    });
    
    const data = await response.json();
    localStorage.setItem('accessToken', data.data.accessToken);
    localStorage.setItem('refreshToken', data.data.refreshToken);
    // Redirect to next step
  };

  return (
    <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID}>
      <GoogleLogin onSuccess={handleGoogleSuccess} />
    </GoogleOAuthProvider>
  );
}
```

#### Facebook Sign-In

```javascript
// Install: npm install react-facebook-login

import FacebookLogin from 'react-facebook-login/dist/facebook-login-render-props';

function LoginPage() {
  const handleFacebookSuccess = async (response) => {
    const res = await fetch('http://localhost:3000/api/v1/auth/social/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'facebook',
        accessToken: response.accessToken
      })
    });
    
    const data = await res.json();
    localStorage.setItem('accessToken', data.data.accessToken);
    localStorage.setItem('refreshToken', data.data.refreshToken);
  };

  return (
    <FacebookLogin
      appId={process.env.REACT_APP_FACEBOOK_APP_ID}
      autoLoad={false}
      fields="name,email,picture"
      callback={handleFacebookSuccess}
      render={renderProps => (
        <button onClick={renderProps.onClick}>Login with Facebook</button>
      )}
    />
  );
}
```

#### Apple Sign-In

```javascript
// For web, use Apple's official SDK

<script type="text/javascript" src="https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid.js"></script>

<script>
  AppleID.auth.init({
    clientId: process.env.REACT_APP_APPLE_CLIENT_ID,
    teamId: process.env.REACT_APP_APPLE_TEAM_ID,
    keyId: process.env.REACT_APP_APPLE_KEY_ID,
    redirectURI: 'https://yourdomain.com/auth/callback',
    usePopup: true
  });

  document.getElementById('appleid-signin').addEventListener('click', () => {
    AppleID.auth.signIn().then(response => {
      fetch('http://localhost:3000/api/v1/auth/social/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'apple',
          idToken: response.authorization.id_token
        })
      });
    });
  });
</script>
```

### For Mobile (React Native)

#### Google Sign-In

```javascript
import { GoogleSignin, GoogleSigninButton } from '@react-native-google-signin/google-signin';

GoogleSignin.configure({
  clientId: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',
});

const handleGoogleLogin = async () => {
  const userInfo = await GoogleSignin.signIn();
  const response = await fetch('https://yourdomain.com/api/v1/auth/social/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider: 'google',
      idToken: userInfo.idToken
    })
  });
  const data = await response.json();
  // Store tokens
};
```

---

## ✅ STEP 9: Common Issues & Fixes

### Issue 1: "Invalid token"

**Cause**: Token expired or wrong format

**Fix**:
- Get fresh token from provider
- Check token format (should be JWT)
- Verify token hasn't expired

### Issue 2: "Client ID mismatch"

**Cause**: Token issued for different app

**Fix**:
- Check GOOGLE_CLIENT_ID in .env matches provider settings
- Regenerate credentials if needed

### Issue 3: "Email not found"

**Cause**: User didn't grant email permission

**Fix**:
- For Google: Email is usually included
- For Facebook: Make sure `email` permission is requested
- For Apple: Email only provided on first login

### Issue 4: "Token signature verification failed"

**Cause**: Using wrong public key

**Fix**:
- Ensure using provider's current public key
- For Apple: Check APPLE_PRIVATE_KEY format
- Restart server after changing .env

### Issue 5: CORS Error

**Cause**: Frontend domain not whitelisted

**Fix**:
- Add domain to provider's redirect URIs
- Check CORS headers in Express

### Issue 6: "Already linked"

**Cause**: Trying to link same provider twice

**Fix**:
- Unlink first, then link again
- Or use different provider

---

## ✅ STEP 10: Production Checklist

Before deploying to production:

- [ ] Update all .env variables with production values
- [ ] Use HTTPS everywhere
- [ ] Add rate limiting to login endpoint
- [ ] Enable CORS only for your domain
- [ ] Set up monitoring/logging
- [ ] Test all three providers
- [ ] Test account linking
- [ ] Test error scenarios
- [ ] Update frontend with production URLs
- [ ] Set up SSL certificates
- [ ] Configure firewall rules
- [ ] Enable database backups
- [ ] Set up error tracking (Sentry)
- [ ] Monitor API performance

---

## ✅ STEP 11: API Endpoints Summary

### Login Endpoints

```
POST /api/v1/auth/social/login
├─ provider: "google" | "facebook" | "apple"
├─ idToken: "..." (Google, Apple)
└─ accessToken: "..." (Facebook)

Response: { userId, accessToken, refreshToken, isNewUser, nextStep }
```

### Account Management

```
POST /api/v1/auth/social/link
├─ Requires: Authorization header
├─ provider: "google" | "facebook" | "apple"
└─ idToken/accessToken: "..."

POST /api/v1/auth/social/unlink
├─ Requires: Authorization header
└─ provider: "google" | "facebook" | "apple"

GET /api/v1/auth/social/accounts
├─ Requires: Authorization header
└─ Response: { google, facebook, apple, phone, email }
```

---

## ✅ STEP 12: Next Steps

1. ✅ Test all three providers
2. ✅ Integrate with frontend
3. ✅ Test on mobile devices
4. ✅ Set up monitoring
5. ✅ Deploy to production
6. ✅ Monitor for errors
7. ✅ Gather user feedback

---

## 📞 Support

If you face any issues:

1. Check the error code in response
2. Look at server logs
3. Verify .env variables
4. Check provider settings
5. Test with Postman first

---

**Congratulations! 🎉 You now have a complete social login system!**
