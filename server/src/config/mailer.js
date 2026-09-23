/**
 * Nodemailer Email Service Configuration
 * Provides branded HTML emails for financial milestone alerts.
 */
const nodemailer = require('nodemailer');

let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = process.env.SMTP_SECURE === 'true';

  if (!user || !pass) {
    return null;
  }

  transporter = nodemailer.createTransporter({
    host,
    port,
    secure,
    auth: { user, pass }
  });

  return transporter;
};

/**
 * Generate branded HTML email template
 */
const generateEmailHtml = (type, title, message, goalName, stats = {}) => {
  const getBadgeColor = (t) => {
    switch (t) {
      case 'Target Completed': return '#059669';
      case 'Higher Monthly Savings': return '#4f46e5';
      case 'Deadline Reminder': return '#d97706';
      case 'Missed Target': return '#e11d48';
      default: return '#4f46e5';
    }
  };

  const badgeColor = getBadgeColor(type);

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #0f172a;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 30px 10px;">
      <tr>
        <td align="center">
          <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
            <!-- Header -->
            <tr>
              <td style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 28px 32px; color: #ffffff;">
                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                  <tr>
                    <td>
                      <div style="font-size: 24px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff;">SaveIQ</div>
                      <div style="font-size: 13px; color: #e0e7ff; margin-top: 4px;">AI Goal Reality & Smart Savings Intelligence</div>
                    </td>
                    <td align="right">
                      <span style="background: rgba(255,255,255,0.2); color: #ffffff; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase;">${type}</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding: 32px;">
                <h2 style="margin: 0 0 16px 0; font-size: 20px; color: #1e293b; font-weight: 700;">${title}</h2>
                <div style="background-color: #f1f5f9; border-left: 4px solid ${badgeColor}; padding: 16px; border-radius: 8px; font-size: 15px; line-height: 1.6; color: #334155; margin-bottom: 24px;">
                  ${message}
                </div>

                ${stats.targetAmount ? `
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px; background: #fafafa; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px;">
                  <tr>
                    <td width="33%" align="center" style="padding: 8px;">
                      <div style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600;">Target Goal</div>
                      <div style="font-size: 16px; font-weight: 700; color: #0f172a; margin-top: 4px;">₹${Number(stats.targetAmount || 0).toLocaleString()}</div>
                    </td>
                    <td width="33%" align="center" style="padding: 8px; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
                      <div style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600;">Saved So Far</div>
                      <div style="font-size: 16px; font-weight: 700; color: #059669; margin-top: 4px;">₹${Number(stats.currentSavings || 0).toLocaleString()}</div>
                    </td>
                    <td width="33%" align="center" style="padding: 8px;">
                      <div style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600;">Remaining</div>
                      <div style="font-size: 16px; font-weight: 700; color: #d97706; margin-top: 4px;">₹${Number(stats.remainingAmount || 0).toLocaleString()}</div>
                    </td>
                  </tr>
                </table>
                ` : ''}

                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                  <tr>
                    <td align="center" style="padding-top: 8px;">
                      <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}" style="display: inline-block; background: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px;">Open SaveIQ Dashboard &rarr;</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 32px; text-align: center; font-size: 12px; color: #64748b;">
                You received this automated financial intelligence alert from your SaveIQ Tracker.<br>
                &copy; ${new Date().getFullYear()} SaveIQ. All rights reserved.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;
};

/**
 * Send an email alert
 */
const sendAlertEmail = async ({ to, subject, type, title, message, goalName, stats }) => {
  const mailTransporter = getTransporter();
  if (!mailTransporter) {
    console.log(`ℹ️ [SaveIQ Mailer] SMTP credentials not set. Simulated sending email to [${to}] for [${type}]: "${subject}"`);
    return { success: true, simulated: true };
  }

  try {
    const html = generateEmailHtml(type, title, message, goalName, stats);
    const info = await mailTransporter.sendMail({
      from: process.env.EMAIL_FROM || '"SaveIQ AI" <notifications@saveiq.app>',
      to,
      subject,
      html
    });

    console.log(`✅ [SaveIQ Mailer] Sent email to ${to} (${type}): ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`❌ [SaveIQ Mailer] Failed to send email to ${to}:`, err.message);
    return { success: false, error: err.message };
  }
};

module.exports = {
  sendAlertEmail,
  isMailerConfigured: () => !!(process.env.SMTP_USER && process.env.SMTP_PASS)
};
