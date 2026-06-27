import sgMail from '@sendgrid/mail'
import nodemailer from 'nodemailer'
import crypto from 'crypto'

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY
const FROM_EMAIL = process.env.FROM_EMAIL || process.env.OTP_EMAIL || 'www.nayituriki.com@gmail.com'

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY)
}

const smtpTransport = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.OTP_EMAIL || process.env.ADMIN_EMAIL,
    pass: process.env.OTP_PASSWORD,
  },
  connectionTimeout: 15000,
  greetingTimeout: 15000,
  socketTimeout: 15000,
})

export function generateCode() {
  return crypto.randomInt(100000, 999999).toString()
}

function emailTemplate(code) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#0f1f0f;font-family:'Segoe UI',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f1f0f;padding:30px 10px">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1a2a1a,#0f1f0f);padding:30px 40px 20px;border-radius:12px 12px 0 0;text-align:center">
              <h1 style="margin:0;color:#00e676;font-size:24px;font-weight:700;letter-spacing:1px">RELAX MEDIA</h1>
              <p style="margin:6px 0 0;color:#00c853;font-size:13px;font-weight:500">EARN PROMOTION</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="background:#1a2a1a;padding:30px 40px;border-left:1px solid #1a3a1a;border-right:1px solid #1a3a1a">
              <h2 style="margin:0 0 8px;color:#eee;font-size:20px;font-weight:600">Verify your email</h2>
              <p style="margin:0 0 20px;color:#aaa;font-size:14px;line-height:1.6">
                Enter this code to complete your login or sign-up on
                <strong style="color:#00e676">Relax Media Earn Promotion</strong>.
              </p>
              <!-- OTP Code -->
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 20px">
                <tr>
                  <td style="background:#0f1f0f;border:2px solid #00c853;border-radius:10px;padding:16px 40px;text-align:center">
                    <span style="font-size:36px;font-weight:700;letter-spacing:10px;color:#00e676;font-family:'Courier New',monospace">${code}</span>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 6px;color:#888;font-size:13px">
                <span style="color:#ffa726;font-weight:600">&circledcirc;</span> This code expires in <strong style="color:#eee">10 minutes</strong>
              </p>
              <p style="margin:0;color:#666;font-size:12px;line-height:1.4">
                If you did not request this code, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <!-- Divider -->
          <tr>
            <td style="background:#1a2a1a;padding:0 40px;border-left:1px solid #1a3a1a;border-right:1px solid #1a3a1a">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="height:1px;background:#1a3a1a"></td></tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#1a2a1a;padding:20px 40px 30px;border-radius:0 0 12px 12px;border-left:1px solid #1a3a1a;border-right:1px solid #1a3a1a;border-bottom:1px solid #1a3a1a;text-align:center">
              <p style="margin:0 0 4px;color:#666;font-size:12px">
                &copy; 2026 <span style="color:#888">RELAX MEDIA</span> &mdash; Rwanda
              </p>
              <p style="margin:0;color:#555;font-size:11px">
                <a href="https://www.nayituriki.com" style="color:#00c853;text-decoration:none">www.nayituriki.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export async function sendVerificationEmail(to, code) {
  console.log(`[DEV] Verification code for ${to}: ${code}`)

  const html = emailTemplate(code)

  // Try SendGrid first (works everywhere, no port issues)
  if (SENDGRID_API_KEY) {
    try {
      await sgMail.send({
        from: FROM_EMAIL,
        to,
        subject: 'Your verification code — Relax Media Earn Promotion',
        html,
      })
      return true
    } catch (err) {
      console.error(`[EMAIL] SendGrid failed for ${to}: ${err.message}`)
      if (err.response) console.error('[EMAIL] SendGrid details:', err.response.body)
    }
  }

  // Fallback to Gmail SMTP
  if (process.env.OTP_PASSWORD) {
    try {
      await smtpTransport.sendMail({
        from: `"Relax Media" <${process.env.OTP_EMAIL || process.env.ADMIN_EMAIL}>`,
        to,
        subject: 'Your verification code — Relax Media Earn Promotion',
        html,
      })
      return true
    } catch (err) {
      console.error(`[EMAIL] Gmail SMTP failed for ${to}: ${err.message}`)
    }
  }

  console.log('[EMAIL] No working email provider configured — code printed to console only')
  return false
}
