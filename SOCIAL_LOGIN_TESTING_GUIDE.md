# 🧪 Social Login - Complete Testing Guide

## 📋 Table of Contents
1. [Setup for Testing](#setup)
2. [Testing with Postman](#postman)
3. [Testing with cURL](#curl)
4. [Testing with Frontend](#frontend)
5. [Error Scenarios](#errors)
6. [Performance Testing](#performance)

---

## Setup for Testing

### Prerequisites
- Node.js running (`npm run dev`)
- MongoDB running
- Redis running
- Postman or cURL installed
- Provider credentials in .env

### Verify Setup

```bash
# Check server is running
curl http://localhost:3000/

# Expected response:
# { "message": "API running" }
```

---

## Testing with Postman

### 1. Import Collection

Create a new Postman collection called "MAFS Social Login"

### 2. Set Environment Variables

In Postman, create environment with:
```
{
  "base_url": "http://localhost:3000",
  "google_id_token": "your-google-token",
  "facebook_access_token": "your-facebook-token",
  "apple_id_token": "your-apple-token",
  "access_token": "your-jwt-token",
  "user_id": "your-user-id"
}
```

### 3. Test Cases

#### Test 1: Google Login (New User)

**Request:**
```
POST {{base_url}}/api/v1/auth/social/login
Content-Type: application/json

{
  "provider": "google",
  "idToken": "{{google_id_token}}"
}
```

**Expected Response (201):**
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

**Save Response:**
- Set `access_token` = response.data.accessToken
- Set `user_id` = response.data.userId

#### Test 2: Google Login (Existing User)

**Request:**
```
POST {{base_url}}/api/v1/auth/social/login
Content-Type: application/json

{
  "provider": "google",
  "idToken": "{{google_id_token}}"
}
```

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "isNewUser": false,
    ...
  }
}
```

#### Test 3: Facebook Login

**Request:**
```
POST {{base_url}}/api/v1/auth/social/login
Content-Type: application/json

{
  "provider": "facebook",
  "accessToken": "{{facebook_access_token}}"
}
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "facebook login successful",
  "data": {
    "userId": "...",
    "accessToken": "...",
    ...
  }
}
```

#### Test 4: Apple Login

**Request:**
```
POST {{base_url}}/api/v1/auth/social/login
Content-Type: application/json

{
  "provider": "apple",
  "idToken": "{{apple_id_token}}"
}
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "apple login successful",
  "data": {
    "userId": "...",
    "accessToken": "...",
    ...
  }
}
```

#### Test 5: Link Google Account

**Request:**
```
POST {{base_url}}/api/v1/auth/social/link
Authorization: Bearer {{access_token}}
Content-Type: application/json

{
  "provider": "google",
  "idToken": "{{google_id_token}}"
}
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "google account linked successfully",
  "data": {
    "provider": "google",
    "email": "user@gmail.com"
  }
}
```

#### Test 6: Get Linked Accounts

**Request:**
```
GET {{base_url}}/api/v1/auth/social/accounts
Authorization: Bearer {{access_token}}
```

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "phone": false,
    "email": true,
    "google": {
      "email": "user@gmail.com",
      "linkedAt": "2024-01-15T10:30:00Z"
    },
    "facebook": null,
    "apple": null
  }
}
```

#### Test 7: Unlink Account

**Request:**
```
POST {{base_url}}/api/v1/auth/social/unlink
Authorization: Bearer {{access_token}}
Content-Type: application/json

{
  "provider": "google"
}
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "google account unlinked successfully"
}
```

---

## Testing with cURL

### Google Login

```bash
curl -X POST http://localhost:3000/api/v1/auth/social/login \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "google",
    "idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjEifQ..."
  }'
```

### Facebook Login

```bash
curl -X POST http://localhost:3000/api/v1/auth/social/login \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "facebook",
    "accessToken": "EAABsbCS1iHg..."
  }'
```

### Link Account

```bash
curl -X POST http://localhost:3000/api/v1/auth/social/link \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "provider": "google",
    "idToken": "..."
  }'
```

### Get Linked Accounts

```bash
curl -X GET http://localhost:3000/api/v1/auth/social/accounts \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Testing with Frontend

### React Test Component

```javascript
import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';

function SocialLoginTest() {
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const response = await fetch('http://localhost:3000/api/v1/auth/social/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'google',
          idToken: credentialResponse.credential
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setResult(data.data);
        localStorage.setItem('accessToken', data.data.accessToken);
        localStorage.setItem('refreshToken', data.data.refreshToken);
        console.log('✅ Login successful:', data.data);
      } else {
        setError(data.message);
        console.error('❌ Login failed:', data.message);
      }
    } catch (err) {
      setError(err.message);
      console.error('❌ Error:', err);
    }
  };

  return (
    <div>
      <h2>Social Login Test</h2>
      
      <GoogleLogin
        onSuccess={handleGoogleSuccess}
        onError={() => setError('Google login failed')}
      />

      {result && (
        <div style={{ marginTop: '20px', padding: '10px', background: '#e8f5e9' }}>
          <h3>✅ Login Successful</h3>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}

      {error && (
        <div style={{ marginTop: '20px', padding: '10px', background: '#ffebee' }}>
          <h3>❌ Error</h3>
          <p>{error}</p>
        </div>
      )}
    </div>
  );
}

export default SocialLoginTest;
```

---

## Error Scenarios

### Scenario 1: Invalid Token

**Request:**
```json
{
  "provider": "google",
  "idToken": "invalid-token"
}
```

**Expected Response (400):**
```json
{
  "success": false,
  "message": "Google verification failed: Invalid token format",
  "code": "INVALID_TOKEN"
}
```

### Scenario 2: Expired Token

**Request:**
```json
{
  "provider": "google",
  "idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjEifQ..." // Expired
}
```

**Expected Response (400):**
```json
{
  "success": false,
  "message": "Token expired. Please login again.",
  "code": "TOKEN_EXPIRED"
}
```

### Scenario 3: Missing Provider

**Request:**
```json
{
  "idToken": "..."
}
```

**Expected Response (400):**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": ["Provider is required"],
  "code": "VALIDATION_ERROR"
}
```

### Scenario 4: Invalid Provider

**Request:**
```json
{
  "provider": "twitter",
  "idToken": "..."
}
```

**Expected Response (400):**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": ["Provider must be 'google', 'facebook', or 'apple'"],
  "code": "VALIDATION_ERROR"
}
```

### Scenario 5: Already Linked

**Request:**
```
POST /api/v1/auth/social/link
Authorization: Bearer {token}

{
  "provider": "google",
  "idToken": "..." // Same Google account
}
```

**Expected Response (409):**
```json
{
  "success": false,
  "message": "google account already linked",
  "code": "ALREADY_LINKED"
}
```

### Scenario 6: Not Linked

**Request:**
```
POST /api/v1/auth/social/unlink
Authorization: Bearer {token}

{
  "provider": "facebook" // Not linked
}
```

**Expected Response (404):**
```json
{
  "success": false,
  "message": "facebook account not linked",
  "code": "NOT_LINKED"
}
```

### Scenario 7: Last Auth Method

**Request:**
```
POST /api/v1/auth/social/unlink
Authorization: Bearer {token}

{
  "provider": "google" // Only auth method
}
```

**Expected Response (400):**
```json
{
  "success": false,
  "message": "Cannot unlink last authentication method",
  "code": "INVALID_REQUEST"
}
```

---

## Performance Testing

### Load Testing with Apache Bench

```bash
# Test 100 requests with 10 concurrent
ab -n 100 -c 10 -p payload.json -T application/json \
  http://localhost:3000/api/v1/auth/social/login
```

### Load Testing with wrk

```bash
# Test with 4 threads, 100 connections, 30 seconds
wrk -t4 -c100 -d30s \
  -s script.lua \
  http://localhost:3000/api/v1/auth/social/login
```

### Monitor Performance

```bash
# Watch server logs
tail -f logs/app.log

# Monitor CPU/Memory
top

# Monitor MongoDB
mongotop

# Monitor Redis
redis-cli monitor
```

---

## Database Testing

### Check User Created

```bash
# MongoDB
db.users.findOne({ "social.google.id": "..." })

# Expected output:
{
  "_id": ObjectId("..."),
  "email": "user@gmail.com",
  "isEmailVerified": true,
  "social": {
    "google": {
      "id": "...",
      "email": "user@gmail.com",
      "name": "John Doe",
      "picture": "https://...",
      "linkedAt": ISODate("2024-01-15T10:30:00Z"),
      "lastLoginAt": ISODate("2024-01-15T10:30:00Z")
    }
  },
  "authMethod": "google",
  "createdAt": ISODate("2024-01-15T10:30:00Z")
}
```

### Check Profile Created

```bash
db.profiles.findOne({ userId: ObjectId("...") })

# Expected output:
{
  "_id": ObjectId("..."),
  "userId": ObjectId("..."),
  "onboardingProgress": {
    "emailVerified": true,
    ...
  },
  "createdAt": ISODate("2024-01-15T10:30:00Z")
}
```

---

## Logging & Debugging

### Enable Debug Logging

Add to your code:
```javascript
// In social.service.js
console.log(`✅ ${provider} token verified for:`, providerUserInfo.email);
console.log(`✅ Found existing user with ${provider} account`);
console.log(`✅ Creating new user with ${provider} account`);
```

### Check Server Logs

```bash
# Watch logs in real-time
npm run dev 2>&1 | grep -i "social\|google\|facebook\|apple"

# Save logs to file
npm run dev > logs/app.log 2>&1 &
```

### Test with Verbose Output

```bash
# cURL with verbose
curl -v -X POST http://localhost:3000/api/v1/auth/social/login \
  -H "Content-Type: application/json" \
  -d '{"provider": "google", "idToken": "..."}'
```

---

## Checklist

- [ ] Google login works
- [ ] Facebook login works
- [ ] Apple login works
- [ ] New user created correctly
- [ ] Existing user found correctly
- [ ] Tokens generated correctly
- [ ] Account linking works
- [ ] Account unlinking works
- [ ] Get linked accounts works
- [ ] Error handling works
- [ ] Validation works
- [ ] Database records created
- [ ] Performance acceptable
- [ ] Logs clear and helpful

---

## Troubleshooting

### Server Won't Start

```bash
# Check if port 3000 is in use
lsof -i :3000

# Kill process
kill -9 <PID>

# Check .env file
cat .env | grep GOOGLE_CLIENT_ID
```

### Token Verification Fails

```bash
# Verify token format
echo "YOUR_TOKEN" | jq '.'

# Check token expiration
echo "YOUR_TOKEN" | jq '.exp'

# Compare with current time
date +%s
```

### Database Connection Issues

```bash
# Check MongoDB
mongo --eval "db.adminCommand('ping')"

# Check Redis
redis-cli ping
```

### CORS Issues

```bash
# Check headers
curl -i -X OPTIONS http://localhost:3000/api/v1/auth/social/login
```

---

## Next Steps

1. ✅ Run all test cases
2. ✅ Verify database records
3. ✅ Check logs for errors
4. ✅ Test error scenarios
5. ✅ Performance test
6. ✅ Ready for production

---

**Happy Testing! 🎉**
