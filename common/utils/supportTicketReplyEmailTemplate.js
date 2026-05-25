module.exports.supportTicketReplyEmailTemplate = ({ status, reply, attachmentsHtml }) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Support Ticket Update</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; color: #333;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #00adef; margin: 0 0 15px 0; font-size: 24px; font-weight: 700;">Support Ticket Update</h2>
              <p style="color: #0f172a; font-size: 16px; margin: 0 0 10px 0;">Hello,</p>
              <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
                Your support ticket has been updated to: <strong style="text-transform: capitalize; color: #00adef;">${status.replace(/_/g, " ")}</strong>
              </p>
              
              <p style="color: #0f172a; font-size: 14px; font-weight: 700; margin: 0 0 8px 0;">Admin Reply:</p>
              <blockquote style="margin: 0; padding: 15px; background-color: #f8fafc; border-left: 4px solid #00adef; border-radius: 4px; color: #334155; font-size: 14px; line-height: 1.6;">
                ${reply}
              </blockquote>
              
              ${attachmentsHtml || ""}
              
              <p style="margin: 30px 0 0 0; color: #64748b; font-size: 14px; line-height: 1.5;">
                Thank you for reaching out to us.<br/>
                Best regards,<br/>
                <strong>MAFS Support Team</strong>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
