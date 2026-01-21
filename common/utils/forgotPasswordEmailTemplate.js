module.exports.forgotPasswordEmailTemplate = (otp) =>
  `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Password Reset Verification</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
</head>
<body style="margin:0; padding:0; background-color:#f5f7fb; font-family: Arial, Helvetica, sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f7fb; padding:20px 0;">
    <tr>
      <td align="center">

        <table width="100%" max-width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:8px; overflow:hidden;">
          
          <!-- Header -->
          <tr>
            <td style="background:#ff3366; padding:20px; text-align:center;">
              <h1 style="color:#ffffff; margin:0; font-size:24px;">
                MAFS Dating App
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:30px; color:#333333;">
              <h2 style="margin-top:0;">Forgot your password?</h2>

              <p style="font-size:14px; line-height:1.6;">
                We received a request to reset your password.  
                Use the verification code below to continue:
              </p>

              <!-- OTP -->
              <div style="
                margin:30px 0;
                text-align:center;
                font-size:32px;
                font-weight:bold;
                letter-spacing:6px;
                color:#ff3366;
              ">
                ${otp}
              </div>

              <p style="font-size:14px; line-height:1.6;">
                This code is valid for <strong>5 minutes</strong>.  
                Please do not share this code with anyone.
              </p>

              <p style="font-size:14px; line-height:1.6;">
                If you didn’t request a password reset, you can safely ignore this email.
              </p>

              <p style="margin-top:30px; font-size:14px;">
                Thanks,<br/>
                <strong>MAFS Support Team</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f0f0f0; padding:15px; text-align:center; font-size:12px; color:#777;">
              © 2026 MAFS Dating App. All rights reserved.
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>`;
