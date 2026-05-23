module.exports.reportResolutionEmailTemplate = (resolutionMessage) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your report has been resolved</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; color: #333;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #00adef; margin: 0 0 15px 0; font-size: 20px; font-weight: 700;">Your report has been resolved</h2>
              <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 25px 0;">
                ${resolutionMessage || "Thanks for reporting. We have taken appropriate action."}
              </p>
              <p style="color: #64748b; font-size: 14px; margin: 0;">
                — Support Team
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
