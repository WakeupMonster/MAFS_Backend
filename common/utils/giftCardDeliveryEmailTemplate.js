module.exports.giftCardDeliveryEmailTemplate = ({
  customTemplate,
  logoUrl,
  brandAqua,
  giftCode,
  stepsHtml,
  expiryDate,
  prizeTitle,
  prizeValue
}) => {
  if (customTemplate) {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${customTemplate.subject || "🎉 Congratulations! Your Prize Awaits"}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
          <tr>
            <td align="center" style="padding: 30px 20px 20px 20px; background-color: #ffffff; border-bottom: 2px solid #f1f5f9;">
              <img src="${logoUrl}" alt="Mustard Date" style="max-width: 140px; height: auto; display: block;" />
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #0f172a; margin: 0 0 15px 0; font-size: 24px; font-weight: 700; text-align: center;">
                ${customTemplate.title || "Your Gift Card is Here!"}
              </h2>
              <p style="color: #475569; font-size: 16px; line-height: 1.6; text-align: center; margin: 0 0 30px 0;">
                ${customTemplate.description || "Congratulations on winning! Here are the details of your reward."}
              </p>
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f0fdfa; border: 2px dashed ${brandAqua}; border-radius: 12px;">
                <tr>
                  <td align="center" style="padding: 24px;">
                    <p style="margin: 0 0 8px 0; font-size: 13px; color: #0d9488; text-transform: uppercase; font-weight: 700; letter-spacing: 1px;">Your Private Gift Code</p>
                    <p style="margin: 0; font-size: 28px; font-weight: 800; letter-spacing: 2px; color: #0f172a; font-family: monospace;">
                      ${giftCode}
                    </p>
                  </td>
                </tr>
              </table>
              ${stepsHtml || ""}
              ${expiryDate ? `
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 20px;">
                <tr>
                  <td align="center">
                    <p style="background-color: #fef2f2; border: 1px solid #fecaca; color: #ef4444; font-size: 13px; padding: 8px 16px; border-radius: 20px; display: inline-block; margin: 0; font-weight: 500;">
                      ⚠️ Expires on: <strong>${expiryDate}</strong>
                    </p>
                  </td>
                </tr>
              </table>` : ""}
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; font-size: 13px; color: #64748b;">
                If you have any issues, please contact our support team.
              </p>
              <p style="margin: 8px 0 0 0; font-size: 13px; color: #64748b;">
                © ${new Date().getFullYear()} Mustard. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  // Fallback default layout
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Gift Card Has Arrived!</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <tr>
            <td align="center" style="padding: 30px 20px; border-bottom: 2px solid #f1f5f9;">
               <img src="${logoUrl}" alt="Mustard Date" style="max-width: 140px; height: auto; display: block;" />
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px; text-align: center;">
              <h2 style="color: #0f172a; margin: 0 0 15px 0; font-size: 24px;">🎁 Your Gift Card Has Arrived!</h2>
              <p style="color: #475569; font-size: 16px;">You won: <strong>"${prizeTitle}"</strong> (Value: $${prizeValue || 0})</p>
              <div style="background-color: #f0fdfa; border: 2px dashed ${brandAqua}; padding: 24px; border-radius: 12px; margin: 30px 0;">
                <p style="margin: 0 0 8px 0; font-size: 13px; color: #0d9488; text-transform: uppercase; font-weight: 700;">Your Gift Card Code</p>
                <p style="margin: 0; font-size: 28px; font-weight: 800; letter-spacing: 2px; color: #0f172a; font-family: monospace;">${giftCode}</p>
              </div>
              ${expiryDate ? `<p style="color: #ef4444; font-size: 14px;">⚠️ This code expires on: <strong>${expiryDate}</strong></p>` : ""}
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; font-size: 13px; color: #64748b;">Thank you for participating! 🎉</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};
