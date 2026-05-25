module.exports.queuedPremiumPrizeEmailTemplate = ({ prizeTitle, planType, durationInDays, expiryStr }) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Free Premium Has Been Activated!</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; color: #333;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #ff3366; margin: 0 0 15px 0; font-size: 24px; font-weight: 700; text-align: center;">🎉 Great News! Your Queued Prize is Now Active!</h2>
              <p style="color: #475569; font-size: 15px; line-height: 1.6; margin-bottom: 20px;">
                Your prize <b>"${prizeTitle}"</b> was waiting for your previous subscription to end. It has now been <b>automatically activated</b> on your account!
              </p>
              
              <table style="border-collapse: collapse; margin: 16px 0; width: 100%; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
                <tr>
                  <td style="padding: 12px; font-weight: bold; color: #475569; border-bottom: 1px solid #e2e8f0; width: 30%;">Plan:</td>
                  <td style="padding: 12px; color: #0f172a; border-bottom: 1px solid #e2e8f0;">${planType || "Premium"}</td>
                </tr>
                <tr>
                  <td style="padding: 12px; font-weight: bold; color: #475569; border-bottom: 1px solid #e2e8f0;">Duration:</td>
                  <td style="padding: 12px; color: #0f172a; border-bottom: 1px solid #e2e8f0;">${durationInDays} Days</td>
                </tr>
                <tr>
                  <td style="padding: 12px; font-weight: bold; color: #475569;">Valid Until:</td>
                  <td style="padding: 12px; color: #0f172a;">${expiryStr}</td>
                </tr>
              </table>
              
              <p style="color: #475569; font-size: 15px; line-height: 1.6; text-align: center; margin-top: 25px;">
                Open the app and enjoy your premium features now! 🚀
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
