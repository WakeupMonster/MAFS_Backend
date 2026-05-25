module.exports.adminOtpEmailTemplate = (otp) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin Password Reset OTP</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; color: #333;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <tr>
            <td style="padding: 40px 30px; text-align: center;">
              <h2 style="color: #00adef; margin: 0 0 15px 0; font-size: 24px; font-weight: 700;">Admin Password Reset</h2>
              <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                Your verification code is:
              </p>
              <div style="font-size: 36px; font-weight: 800; color: #00adef; margin-bottom: 30px; letter-spacing: 6px; font-family: monospace;">
                ${otp}
              </div>
              <p style="color: #94a3b8; font-size: 13px; margin: 0;">
                Please use this verification code to complete your password reset.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
