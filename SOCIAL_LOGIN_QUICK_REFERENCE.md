# 🚀 Social Login - Quick Reference Guide

## 📁 File Structure

```
modules/auth/
├── auth.model.js                    ✅ Updated with social fields
├── auth.routes.js                   ✅ Updated with social routes
└── social/                          ✅ NEW
    ├── social.service.js            Main business logic
    ├── social.controller.js         API handlers
    ├── social.routes.js             Route definitions
    ├── social.validation.js         Input validation
    └── providers/
        ├── google.provider.js       Google verification
        ├── facebook.provider.js     Facebook verification
        └── apple.provider.js        Apple verification
```

---

## 🔑 Environment Variables

```bash
# Google
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx

# Facebook
FACEBOOK_APP_ID=xxx
FACEBOOK_APP_SECRET=xxx

# Apple
APPLE_TEAM_ID=xxx
APPLE_KEY_ID=xxx
APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
APPLE_BUNDLE_ID=com.mafs.dating
```

---

## 📡 API Endpoints

### 1. Social Login (Unified)
```
POST /api/v1/auth/social/login

Body:
{
  "provider": "google|facebook|apple",
  "idToken": "...",        // Google & Apple
  "accessToken": "...",    // Facebook
  "deviceId": "...",       // Optional
  "fcmToken": "..."        // Optional
}

Response:
{
  "success": true,
  "data": {
    "userId": "...",
    "accessToken": "...",
    "refreshToken": "...",
    "isNewUser": true,
    "nextStep": { "screen": "phone_verification" }
  }
}
```

### 2. Link Social Account
```
POST /api/v1/auth/social/link
Authorization: Bearer {accessToken}

Body:
{
  "provider": "google|facebook|apple",
  "idToken": "...",
  "accessToken": "..."
}
```

### 3. Unlink Social Account
```
POST /api/v1/auth/social/unlink
Authorization: Bearer {accessToken}

Body:
{
  "provider": "google|facebook|apple"
}
```

### 4. Get Linked Accounts
```
GET /api/v1/auth/social/accounts
Authorization: Bearer {accessToken}

Response:
{
  "success": true,
  "data": {
    "phone": true,
    "email": true,
    "google": { "email": "...", "linkedAt": "..." },
    "facebook": null,
    "apple": null
  }
}
```

---

## 🧪 Quick Test with Postman

### Google Test
```
POST http://localhost:3000/api/v1/auth/social/login

{
  "provider": "google",
  "idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjEifQ..."
}
```

### Facebook Test
```
POST http://localhost:3000/api/v1/auth/social/login

{
  "provider": "facebook",
  "accessToken": "EAABsbCS1iHg..."
}
```

### Apple Test
```
POST http://localhost:3000/api/v1/auth/social/login

{
  "provider": "apple",
  "idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjEifQ..."
}
```

---

## 🔄 Token Flow

```
1. Frontend gets token from provider
   ↓
2. Frontend sends token to backend
   ↓
3. Backend verifies token with provider
   ↓
4. Backend creates/finds user
   ↓
5. Backend generates JWT tokens
   ↓
6. Backend returns tokens to frontend
   ↓
7. Frontend stores tokens
   ↓
8. Frontend uses access token for API calls
```

---

## 🛠️ How to Get Tokens

### Google ID Token
1. Use Google Sign-In SDK on frontend
2. Or use [Google OAuth Playground](https://developers.google.com/oauthplayground/)

### Facebook Access Token
1. Use Facebook SDK on frontend
2. Or use [Graph API Explorer](https://developers.facebook.com/tools/explorer/)

### Apple ID Token
1. Use Apple Sign-In SDK on frontend
2. Only available on Apple devices

---

## 📊 User Model Changes

```javascript
// New fields added to User model:

social: {
  google: {
    id: String,
    email: String,
    name: String,
    picture: String,
    linkedAt: Date,
    lastLoginAt: Date
  },
  facebook: { ... },
  apple: { ... }
},

authMethod: "phone|email|google|facebook|apple"
```

---

## ✅ Validation Rules

### Provider
- Required
- Must be: "google", "facebook", or "apple"

### ID Token (Google & Apple)
- Required for Google and Apple
- Must be valid JWT
- Must not be expired
- Signature must be valid

### Access Token (Facebook)
- Required for Facebook
- Must be valid
- Must not be expired

---

## 🚨 Error Codes

| Code | Meaning | Fix |
|------|---------|-----|
| `MISSING_PROVIDER` | Provider not provided | Add provider field |
| `INVALID_PROVIDER` | Unknown provider | Use google/facebook/apple |
| `MISSING_ID_TOKEN` | ID token not provided | Get token from provider |
| `MISSING_ACCESS_TOKEN` | Access token not provided | Get token from provider |
| `TOKEN_EXPIRED` | Token expired | Get fresh token |
| `INVALID_TOKEN` | Token invalid | Verify token format |
| `ALREADY_LINKED` | Provider already linked | Unlink first |
| `NOT_LINKED` | Provider not linked | Link first |
| `NOT_FOUND` | User not found | Create account first |

---

## 🔐 Security Features

✅ **Implemented:**
- Server-side token verification
- Token signature validation
- Expiration checking
- Provider ID validation
- Account linking protection
- Rate limiting ready
- Error handling
- Input validation

---

## 📱 Frontend Integration Examples

### React
```javascript
import { GoogleLogin } from '@react-oauth/google';

<GoogleLogin
  onSuccess={async (credentialResponse) => {
    const res = await fetch('/api/v1/auth/social/login', {
      method: 'POST',
      body: JSON.stringify({
        provider: 'google',
        idToken: credentialResponse.credential
      })
    });
    const data = await res.json();
    localStorage.setItem('accessToken', data.data.accessToken);
  }}
/>
```

### React Native
```javascript
import { GoogleSignin } from '@react-native-google-signin/google-signin';

const userInfo = await GoogleSignin.signIn();
const res = await fetch('https://api.example.com/auth/social/login', {
  method: 'POST',
  body: JSON.stringify({
    provider: 'google',
    idToken: userInfo.idToken
  })
});
```

---

## 🐛 Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| Invalid token | Expired or wrong format | Get fresh token |
| Client ID mismatch | Wrong app ID | Check .env |
| Email not found | Permission not granted | Request email permission |
| CORS error | Domain not whitelisted | Add to provider settings |
| Already linked | Duplicate provider | Unlink first |

---

## 📋 Checklist

- [ ] Created all files
- [ ] Updated .env with credentials
- [ ] Tested Google login
- [ ] Tested Facebook login
- [ ] Tested Apple login
- [ ] Tested account linking
- [ ] Tested error scenarios
- [ ] Integrated with frontend
- [ ] Tested on mobile
- [ ] Ready for production

---

## 🎯 Next Steps

1. **Get Credentials**
   - Google: [Google Cloud Console](https://console.cloud.google.com/)
   - Facebook: [Facebook Developers](https://developers.facebook.com/)
   - Apple: [Apple Developer](https://developer.apple.com/)

2. **Update .env**
   - Add all credentials

3. **Test**
   - Use Postman to test endpoints
   - Test with real frontend

4. **Deploy**
   - Update production .env
   - Deploy to server
   - Monitor for errors

---

## 📞 Support Resources

- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Facebook Login Documentation](https://developers.facebook.com/docs/facebook-login)
- [Apple Sign-In Documentation](https://developer.apple.com/sign-in-with-apple/)
- [JWT Documentation](https://jwt.io/)

---

**Status: ✅ Ready to Use**

All files are created and ready for testing!
