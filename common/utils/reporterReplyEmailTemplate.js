module.exports.reporterReplyEmailTemplate = ({ reporterName, reportedUserName, reportReason, adminReply, reportDate, fromName }) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Update on your reported profile</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; color: #333;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #0f172a; font-size: 16px; margin: 0 0 15px 0;">Hi ${reporterName},</p>
              <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
                Thank you for reporting the profile <strong>${reportedUserName}</strong>.
              </p>
              
              <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 25px;">
                <p style="margin: 0 0 8px 0; font-size: 13px; color: #64748b;"><strong>Report Reason:</strong> ${reportReason}</p>
                <p style="margin: 0; font-size: 13px; color: #64748b;"><strong>Report Date:</strong> ${new Date(reportDate).toDateString()}</p>
              </div>
              
              <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
              
              <p style="color: #0f172a; font-size: 14px; font-weight: 700; margin: 0 0 8px 0;">Admin Reply:</p>
              <blockquote style="margin: 0; padding: 12px 16px; background-color: #f0fdf4; border-left: 4px solid #10b981; border-radius: 4px; font-style: italic; color: #374151; font-size: 14px; line-height: 1.6;">
                ${adminReply}
              </blockquote>
              
              <p style="margin: 30px 0 0 0; color: #64748b; font-size: 14px; line-height: 1.5;">
                Regards,<br/>
                <strong>${fromName}</strong>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
