# 📱 Keen As Mustard Auth Test OTP API Documentation

![API Status](https://img.shields.io/badge/API-v1-blue)
![Environment](https://img.shields.io/badge/Environment-Testing/Development-orange)
![Flutter Package](https://img.shields.io/badge/pub.dev-device__info__plus-blueviolet)

Yeh documentation **Test Phone OTP** flow ko explain karta hai. Iska use
development ya testing phase mein phone verification bypass karne ya mock
verification simulate karne ke liye kiya jata hai.


## 🛠 Features

- **Phone Normalization:** Sabhi numbers ko standard format mein convert karta
  hai.
- **Unified Auth Logic:** Login aur Signup dono ko ek hi flow mein handle karta
  hai.
- **Session Management:** Device ID ke base par sessions track karta hai (Max 5
  sessions).
- **Milestone Rewards:** Naye users ko automatically premium subscription grant
  karta hai (V3 Milestone logic).
- **Comprehensive Response:** Ek hi call mein user ka complete profile,
  settings, aur subscription status return karta hai.

## 📱 Client-Side Integration (Flutter)

Verify OTP call karne se pehle device metadata collect karne ke liye hum [device_info_plus](https://pub.dev/packages/device_info_plus) package ka use karte hain.

### Required Metadata:
Backend ko session maintain karne ke liye niche diye gaye fields mandatory hain:
* **deviceId:** Android (id) ya iOS (identifierForVendor).
* **deviceName:** Model name (e.g., Samsung S23).
* **platform:** `android` ya `ios`.
* **os:** OS Version (e.g., Android 14).


## 🚀 API Endpoints

### 1. Send Test OTP

User ke phone number par ek test OTP generate karta hai aur (agar user exists)
profile data fetch karta hai.

- **URL:** `{{BASE_URL}}/api/v1/auth/phonetest`
- **Method:** `POST`
- **Controller:** `sendTestOtp`

  ```javascript
  module.exports.sendTestOtp = async (req, res) => {
    try {
      let { phone } = req.body;

      if (!phone) {
        return res
          .status(400)
          .json({ success: false, message: "Phone is required" });
      }

      // normalize
      const normalizedPhone = normalizePhone(phone);
      if (!normalizedPhone) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid phone number" });
      }

      // const phoneHash = hashPhone(normalizedPhone);

      // OTP send
      const result = await authService.sendPhoneOtpTest(normalizedPhone, true);

      // ✅ USER fetch karo
      const user = await User.findOne({ phone: normalizedPhone });

      let formattedUser = null;

      if (user) {
        const userId = user._id;
        const profile = await Profile.findOne({ userId });
        const blockedContacts = await BlockedContact.find({ userId }).lean();
        const blockedUser = await BlockedUser.find({ userId }).lean();
        const subData = await UserSubscription.findOne({
          userId,
          isActive: true,
        }).lean();

        formattedUser = await formatProfileResponse(
          user,
          profile,
          blockedContacts,
          blockedUser,
          subData,
          req,
        );
      }

      return res.json({
        success: true,
        message: `Test OTP: ${result.otp}`,
        data: { user: formattedUser },
      });
    } catch (err) {
      console.error("Error in sendTestOtp:", err);
      return res.status(400).json({ success: false, message: err.message });
    }
  };
  ```

- **Service:** `sendPhoneOtpTest`
- **Payload:**
  ```json
  {
    "phone": "+918349020828"
  }
  ```
- **Success Response (Code: 200 OK):**
  ```json
  {
    "success": true,
    "message": "Test OTP: 759572",
    "data": {
      "user": { "account": { "status": "active" }, "...": "..." }
    }
  }
  ```

---

### 2. Verify Test OTP

OTP verify karke JWT tokens generate karta hai aur session initialize karta hai.

- **URL:** `{{BASE_URL}}/api/v1/auth/verifytestotp`
- **Method:** `POST`

* **Controller:** `verifyTestOtp`

```javascript
module.exports.verifyTestOtp = async (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      return res
        .status(400)
        .json({ success: false, message: "Phone and OTP are required" });
    }

    const result = await authService.verifyPhoneTestOtpUnified(phone, otp, req);

    return res.json({
      success: true,
      message: result.isNewUser
        ? "Welcome! Phone verified successfully"
        : "Welcome back! Login successful",
      data: {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        user: result.user,
      },
    });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};
```

- **Method:** `POST`

* **Service Controller:** `verifyPhoneTestOtpUnified`

```javascript
async function verifyPhoneTestOtpUnified(phone, otp, req) {
  // 1️⃣ Normalize phone (VERY IMPORTANT)
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) throw new Error("Invalid phone number");

  // 2️⃣ Redis OTP check
  const redisKey = `login:${normalizedPhone}`;
  const storedOtp = await redis.get(redisKey);

  if (!storedOtp || storedOtp !== otp) {
    throw new Error("Invalid OTP");
  }

  // 3️⃣ Extract Device Info from Flutter Request (deviceId, deviceName, platform, os)
  const { deviceId, deviceName, platform, os } = req.body;
  const currentIp =
    req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress;

  const phoneHash = hashPhone(normalizedPhone);

  let user = await User.findOne({ phone: normalizedPhone });
  const isFirstVerification = !user || !user.isPhoneVerified; // Milestone logic fix
  // const isNewUser = !user;

  if (!user) {
    user = await User.create({
      phone: normalizedPhone,
      phoneHash: phoneHash,
    });
  }

  // 4️⃣ Auth Tokens Generation (Existing)
  const accessToken = utils.generateAccessToken(user);
  const refreshTokenRaw = utils.generateRefreshToken();
  const refreshHash = utils.hashToken(refreshTokenRaw);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  // 5️⃣ SESSION & HISTORY LOGIC
  const sessionData = {
    deviceId: deviceId || "unknown",
    deviceName: deviceName || "Unknown Device",
    platform: platform || "web",
    os: os || "Unknown OS",
    lastIp: currentIp,
    lastUsedAt: new Date(),
    isActive: true,
  };

  const historyEntry = {
    ip: currentIp,
    device: deviceName || "Unknown Device",
    timestamp: new Date(),
    authMethod: "phone",
    status: "success",
  };

  // 6️⃣ UPDATE USER (Atomic Update with Sessions & History)
  user = await User.findById(user._id); // Latest data fetch karein

  // Array safety checks
  if (!user.sessions) user.sessions = [];
  if (!user.loginHistory) user.loginHistory = [];
  if (!user.refreshTokens) user.refreshTokens = [];

  const existingSessionIndex = user.sessions.findIndex(
    (s) => s.deviceId === deviceId,
  );

  if (existingSessionIndex !== -1) {
    user.sessions[existingSessionIndex] = sessionData;
  } else {
    user.sessions.push(sessionData);
    if (user.sessions.length > 5) user.sessions.shift();
  }

  // Update top-level fields
  user.phone = normalizedPhone;
  user.phoneHash = phoneHash;
  user.isPhoneVerified = true;
  user.isNewUser = false;
  user.lastLoginAt = new Date();
  user.currentIp = currentIp;
  user.lastUsedDevice = deviceName;

  // Push to history and tokens
  user.loginHistory.push(historyEntry);
  if (user.loginHistory.length > 15) user.loginHistory.shift();

  user.refreshTokens.push({ tokenHash: refreshHash, expiresAt });

  await user.save();

  // 7️⃣ REST OF YOUR LOGIC (Profile, Blocked, Subscription...)
  const profile = await profileModel
    .findOneAndUpdate(
      { userId: user._id },
      { $set: { "onboardingProgress.phoneVerified": true } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    )
    .lean();

  const [blockedContacts, blockedUser] = await Promise.all([
    BlockedContact.find({ userId: user._id }).lean(),
    Block.find({ blockerId: user._id }).lean(),
  ]);

  let subData = await UserSubscription.findOne({ userId: user._id });
  if (!subData) {
    subData = await UserSubscription.create({ userId: user._id });
  }
  subData.resetIfNeeded();

  // v3 Milestone: Grant premium to first 1000 users
  if (isFirstVerification) {
    await subscriptionService
      .handleMilestoneGrant(user._id)
      .catch((err) => console.error("Milestone Error:", err));
  }

  return {
    accessToken,
    refreshToken: refreshTokenRaw,
    isNewUser: false,
    user: await formatProfileResponse(
      user,
      profile,
      blockedContacts,
      blockedUser,
      subData,
      req,
    ),
  };
}
```

- **Payload:**

  ```json
  {
    "phone": "+918349020828",
    "otp": "151031",
    "deviceId": "flutter_emulator_uuid_12345",
    "deviceName": "Samsung Galaxy S23",
    "platform": "android",
    "os": "Android 14"
  }
  ```

- **Success Response (Code: 200 OK):**
  ```json
  {
    "success": true,
    "message": "Welcome back! Login successful",
    "data": {
      "accessToken": "eyJhbGciOiJIUzI1Ni...",
      "refreshToken": "a0c3cfe7ddae9d63...",
      "user": {
        "account": { "status": "active" },
        "profile": { "nickname": "rajyadav", "age": 23 },
        "subscription": { "plan": "MAFS Premium", "isActive": true },
        "onboarding": { "isComplete": true, "nextstep": 6 }
      }
    }
  }
  ```

## 🏗 Data Structure (User Object)

Verify karne ke baad user object mein niche diye gaye modules milte hain:

| Module | Description |
| :--- | :--- |
| **Account** | Ban status, suspension, aur deletion details. |
| **Profile** | Nickname, DOB, Age, Gender aur profile completion percentage. |
| **Attributes** | Interests, Zodiac, Habits (Smoking, Drinking), aur Languages. |
| **Discovery** | Preferences jaise Age Range aur Distance Range. |
| **Location** | Geo-coordinates (Point), City aur Full Address. |
| **Photos** | Cloudinary hosted images ka array with order metadata. |
| **Subscription** | Current plan, expiry date, aur wallet (Likes/SuperLikes balance). |
| **Settings** | Notification preferences aur Blocked contacts/users lists. |



## 🛡 Business Logic Rules

1.  **Normalization:** API input phone number ko format karke search karti hai taaki duplicates na banein.
2.  **Atomic Update:** `User.findById` aur `user.save()` ka use karke ensure kiya jata hai ki session history (max 15 entries) aur active tokens correctly update hon.
3.  **Security:** OTP verify hone ke baad Redis se key delete kar di jati hai taaki same OTP dobara use na ho sake.
4.  **Onboarding:** Agar user naya hai, toh `profileModel` mein `phoneVerified: true` update hota hai aur milestone subscription trigger hota hai.


## ⚠️ Error Handling

| Status Code | Message | Reason |
| :--- | :--- | :--- |
| `400` | Phone and OTP are required | Missing fields in request body. |
| `400` | Invalid phone number | Phone normalization service failed. |
| `400` | Invalid OTP | Redis mismatch or OTP has expired. |