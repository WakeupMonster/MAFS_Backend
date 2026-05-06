const ExcelJS = require('exceljs');
const path = require('path');

async function generate() {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'MAFS Backend Team';
  wb.created = new Date();

  const ws = wb.addWorksheet('Auth Module APIs', {
    properties: { tabColor: { argb: '4F46E5' } },
    views: [{ state: 'frozen', ySplit: 2 }]
  });

  // ─── COLUMN DEFINITIONS ───
  ws.columns = [
    { header: '', key: 'sr', width: 6 },
    { header: '', key: 'subModule', width: 18 },
    { header: '', key: 'endpoint', width: 32 },
    { header: '', key: 'method', width: 10 },
    { header: '', key: 'auth', width: 14 },
    { header: '', key: 'description', width: 45 },
    { header: '', key: 'reqBody', width: 40 },
    { header: '', key: 'successCode', width: 12 },
    { header: '', key: 'successResp', width: 55 },
    { header: '', key: 'errorCodes', width: 14 },
    { header: '', key: 'errorResp', width: 55 },
    { header: '', key: 'errorScenarios', width: 65 },
    { header: '', key: 'improvements', width: 45 },
  ];

  // ─── TITLE ROW ───
  ws.mergeCells('A1:M1');
  const titleCell = ws.getCell('A1');
  titleCell.value = '🔐 MAFS DATING APP — AUTH MODULE API DOCUMENTATION';
  titleCell.font = { name: 'Segoe UI', size: 16, bold: true, color: { argb: 'FFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E1B4B' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 42;

  // ─── HEADER ROW ───
  const headers = ['#', 'Sub-Module', 'API Endpoint', 'Method', 'Auth Required', 'Description',
    'Request Body', 'Success Code', 'Success Response', 'Error Codes', 'Error Response',
    'All Error Scenarios', '✏️ Improvement Suggestions'];

  const headerRow = ws.getRow(2);
  headers.forEach((h, i) => { headerRow.getCell(i + 1).value = h; });
  headerRow.height = 32;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4F46E5' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: '3730A3' } },
      bottom: { style: 'thin', color: { argb: '3730A3' } },
      left: { style: 'thin', color: { argb: '3730A3' } },
      right: { style: 'thin', color: { argb: '3730A3' } },
    };
  });

  // ─── DATA ───
  const data = [
    [1,'Phone OTP','/api/v1/auth/phone','POST','No','Send OTP to phone. Creates new user if not found. Normalizes & hashes phone number.','{ "phone": "+61412345678" }',200,'{ success: true, message: "OTP sent successfully" }','400','{ success: false, message: "Phone number is required" }\n{ success: false, message: "Invalid phone number" }','1) Phone missing → 400: Phone number is required\n2) Invalid phone format → 400: Invalid phone number\n3) OTP service failure → Global error handler\n4) Play Store test (+61800000000) → Simulated success',''],
    [2,'Phone OTP Verify','/api/v1/auth/verify','POST','No','Verify OTP → Returns accessToken + refreshToken + full user profile. Checks ban/suspension. Milestone eligibility.','{ "phone": "+614...", "otp": "123456" }',200,'{ success: true, message: "Welcome! Phone verified", data: { accessToken, refreshToken, user: { account, profile, attributes, discovery, location, photos, verification, settings, onboarding } } }','400','{ success: false, message: "Phone and OTP is required" }\n{ success: false, message: "OTP expired or invalid" }\n{ success: false, message: "Invalid OTP" }\n{ success: false, message: "Account banned" }\n{ success: false, message: "Account suspended until <date>" }','1) Phone/OTP missing → 400\n2) Invalid phone → 400\n3) OTP expired (Redis TTL) → 400\n4) Wrong OTP → 400\n5) Account banned → 400\n6) Account suspended → 400\n7) Play Store: +61800000000 + 123456 bypasses',''],
    [3,'Test OTP Send','/api/v1/auth/phonetest','POST','No','DEV/QA: Send OTP and return it in response. Returns full user profile if exists.','{ "phone": "+614..." }',200,'{ success: true, message: "Test OTP: 834521", data: { user: {..} or null } }','400','{ success: false, message: "Phone is required" }\n{ success: false, message: "Invalid phone number" }','1) Phone missing → 400\n2) Invalid phone → 400\n3) Internal error → 400\n4) Play Store phone → OTP fixed as 123456',''],
    [4,'Test OTP Verify','/api/v1/auth/verifytestotp','POST','No','DEV/QA: Verify test OTP (plain Redis). Returns tokens + profile. Tracks sessions & login history.','{ "phone": "+614...", "otp": "834521", "deviceId": "dev123", "deviceName": "Pixel 7", "platform": "android", "os": "Android 14" }',200,'{ success: true, message: "Welcome!", data: { accessToken, refreshToken, user: {full profile} } }','400','{ success: false, message: "Phone and OTP are required" }\n{ success: false, message: "Invalid OTP" }','1) Phone/OTP missing → 400\n2) Invalid phone → 400\n3) Wrong OTP → 400\n4) Play Store bypass applies\n5) Tracks: deviceId, IP, login history (max 15; 5 devices)',''],
    [5,'Email OTP Send','/api/v1/auth/register/email','POST','Yes (Bearer)','Send email verification OTP. Phone must be verified first. Checks email uniqueness. 10-min expiry.','{ "email": "user@example.com" }',200,'{ success: true, message: "Email OTP sent successfully" }','400, 401','{ success: false, message: "Authentication token is required" }\n{ success: false, message: "User not found" }\n{ success: false, message: "Phone must be verified first" }\n{ success: false, message: "Email already in use" }','1) No auth token → 401\n2) Invalid/expired token → 400\n3) User not found → 400\n4) Phone not verified → 400\n5) Email taken → 400\n6) Play Store email → Skips actual send',''],
    [6,'Email OTP Verify','/api/v1/auth/verify/email','POST','Yes (Bearer)','Verify email OTP. Marks email verified. Updates onboarding. Returns user profile (no new tokens).','{ "otp": "654321" }',200,'{ success: true, message: "Email verified", data: { user: {profile with isEmailVerified: true} } }','400, 401','{ success: false, message: "Authentication token required" }\n{ success: false, message: "OTP not found" }\n{ success: false, message: "OTP expired" }\n{ success: false, message: "Invalid OTP" }','1) No auth token → 401\n2) Token invalid → 400\n3) User not found → 400\n4) OTP not in doc → 400\n5) OTP expired (>10 min) → 400\n6) Wrong OTP → 400\n7) Play Store: test@keenasmustard.com + 123456',''],
    [7,'Refresh Token','/api/v1/auth/refresh','POST','Yes (Bearer Refresh)','Exchange refresh token for new access token. Cleans expired tokens. Returns updated profile.','None (token in Authorization header)',200,'{ success: true, data: { accessToken: "new_jwt...", user: {profile} } }','401','{ success: false, message: "Refresh token missing in header" }\n{ success: false, message: "Invalid refresh token" }\n{ success: false, message: "Refresh token expired" }','1) No Auth header → 401\n2) Not Bearer format → 401\n3) Token hash not found → 401\n4) Token expired → 401\n5) Max 5 tokens per user (FIFO)',''],
    [8,'Logout','/api/v1/auth/logout','POST','No','Invalidate refresh token + remove FCM token for device. Idempotent — always returns success.','{ "refreshToken": "raw_token", "deviceId": "dev123" }',200,'{ success: true, message: "Logged out successfully" }','400','{ success: false, message: "<error>" }','1) Invalid token → Still success (idempotent)\n2) Internal error → 400\n3) Removes FCM token for deviceId',''],
    [9,'Resend Phone OTP','/api/v1/auth/resend/phone','POST','No','Resend phone OTP. Currently routes to sendTestOtp (returns OTP in response — dev mode).','{ "phone": "+614..." }',200,'{ success: true, message: "Test OTP: <otp>", data: { user: <profile or null> } }','400','{ success: false, message: "Phone is required" }\n{ success: false, message: "Invalid phone number" }','1) Phone missing → 400\n2) Invalid phone → 400\n3) Note: Maps to sendTestOtp (OTP visible in response)\n4) Play Store bypass applies',''],
    [10,'Resend Email OTP','/api/v1/auth/resend/email','POST','Yes (Bearer)','Resend email OTP. Rate limited: 3/min per IP.','{ "email": "user@example.com" }',200,'{ success: true, message: "Verification email resent" }','400,401,429','{ success: false, message: "Auth token required" }\n{ success: false, message: "Email is required" }\n{ success: false, message: "Too many attempts..." }','1) No token → 401\n2) Email missing → 400\n3) Rate limit → 429: Too many attempts\n4) Invalid token → 400\n5) Play Store email → Simulated',''],
    [11,'Social Login','/api/v1/auth/social/login','POST','No','Unified social login: Google / Facebook / Apple. Verifies provider token, creates/finds user.','{ "provider": "google", "idToken": "...", "accessToken": "fb_token", "deviceId": "dev123", "fcmToken": "..." }',200,'{ success: true, message: "google login successful", data: { userId, accessToken, refreshToken, isNewUser, isPhoneVerified, isEmailVerified, nextStep, authMethod } }','400, 500','{ success: false, message: "Provider is required", code: "MISSING_PROVIDER" }\n{ success: false, message: "Invalid provider", code: "INVALID_PROVIDER" }\n{ success: false, message: "ID token required", code: "MISSING_ID_TOKEN" }','1) Provider missing → 400: MISSING_PROVIDER\n2) Invalid provider → 400: INVALID_PROVIDER\n3) FB without accessToken → 400: MISSING_ACCESS_TOKEN\n4) Google/Apple without idToken → 400: MISSING_ID_TOKEN\n5) Bad token → 400: INVALID_TOKEN\n6) Server error → 500',''],
    [12,'Link Social','/api/v1/auth/social/link','POST','Yes (Bearer)','Link social account to existing user.','{ "provider": "google", "idToken": "..." }',200,'{ success: true, message: "Google linked", data: { provider, email } }','400, 409','{ success: false, message: "Provider required", code: "MISSING_PROVIDER" }\n{ success: false, message: "Already linked", code: "ALREADY_LINKED" }','1) Provider missing → 400: MISSING_PROVIDER\n2) Token missing → 400\n3) Already linked → 409: ALREADY_LINKED\n4) Invalid token → 400: INVALID_TOKEN',''],
    [13,'Unlink Social','/api/v1/auth/social/unlink','POST','Yes (Bearer)','Unlink social account from user.','{ "provider": "google" }',200,'{ success: true, message: "Google unlinked" }','400, 404','{ success: false, message: "Provider required", code: "MISSING_PROVIDER" }\n{ success: false, message: "Not linked", code: "NOT_LINKED" }','1) Provider missing → 400: MISSING_PROVIDER\n2) Not linked → 404: NOT_LINKED',''],
    [14,'Get Linked Accounts','/api/v1/auth/social/accounts','GET','Yes (Bearer)','Get all linked social accounts.','None',200,'{ success: true, data: [{ provider, email, linkedAt }] }','500','{ success: false, message: "<error>", code: "INTERNAL_ERROR" }','1) Auth fail → 401 (middleware)\n2) Internal → 500: INTERNAL_ERROR',''],
  ];

  const colors = {
    rowEven: 'F5F3FF',   // light lavender
    rowOdd: 'FFFFFF',     // white
    success: 'DCFCE7',   // light green
    error: 'FEE2E2',     // light red
    improve: 'FEF9C3',   // light yellow
    methodPost: 'EF4444', // red badge
    methodGet: '22C55E',  // green badge
    border: 'C7D2FE',    // indigo border
  };

  data.forEach((row, idx) => {
    const r = ws.addRow(row);
    r.height = 110;
    const isEven = idx % 2 === 0;

    r.eachCell({ includeEmpty: true }, (cell, colNum) => {
      cell.font = { name: 'Segoe UI', size: 10 };
      cell.alignment = { vertical: 'top', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: colors.border } },
        bottom: { style: 'thin', color: { argb: colors.border } },
        left: { style: 'thin', color: { argb: colors.border } },
        right: { style: 'thin', color: { argb: colors.border } },
      };

      // Default row color
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isEven ? colors.rowEven : colors.rowOdd } };

      // Sr No column
      if (colNum === 1) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: '4F46E5' } };
      }

      // Method column - color coded
      if (colNum === 4) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        const isPost = String(cell.value).toUpperCase() === 'POST';
        cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isPost ? colors.methodPost : colors.methodGet } };
      }

      // Success code - green bg
      if (colNum === 8) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: '166534' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.success } };
      }

      // Success response - green tint
      if (colNum === 9) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.success } };
        cell.font = { name: 'Consolas', size: 9, color: { argb: '166534' } };
      }

      // Error codes - red bg
      if (colNum === 10) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: '991B1B' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.error } };
      }

      // Error response - red tint
      if (colNum === 11) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.error } };
        cell.font = { name: 'Consolas', size: 9, color: { argb: '991B1B' } };
      }

      // Error scenarios
      if (colNum === 12) {
        cell.font = { name: 'Segoe UI', size: 9.5 };
      }

      // Improvement column - yellow
      if (colNum === 13) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.improve } };
        cell.font = { name: 'Segoe UI', size: 10, italic: true, color: { argb: '92400E' } };
      }
    });
  });

  // ─── FOOTER ROW ───
  const footerRowNum = ws.lastRow.number + 2;
  ws.mergeCells(`A${footerRowNum}:M${footerRowNum}`);
  const footerCell = ws.getCell(`A${footerRowNum}`);
  footerCell.value = '📋 Total Endpoints: 14  |  Module: Auth/User  |  Admin APIs: Excluded  |  Generated: ' + new Date().toLocaleDateString('en-IN');
  footerCell.font = { name: 'Segoe UI', size: 10, italic: true, color: { argb: '6B7280' } };
  footerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F3F4F6' } };
  footerCell.alignment = { horizontal: 'center' };

  // ─── SAVE ───
  const filePath = path.join(__dirname, 'MAFS_API_Sheet_Auth_Module.xlsx');
  await wb.xlsx.writeFile(filePath);
  console.log('✅ Excel file generated:', filePath);
}

generate().catch(console.error);
