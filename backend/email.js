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

export async function sendVerificationEmail(to, code) {
  console.log(`[DEV] Verification code for ${to}: ${code}`)

  // Try SendGrid first (works everywhere, no port issues)
  if (SENDGRID_API_KEY) {
    try {
      await sgMail.send({
        from: FROM_EMAIL,
        to,
        subject: 'Your verification code - Relax Media',
        html: `
          <h2>Login Verification</h2>
          <p>Your verification code is:</p>
          <h1 style="letter-spacing:8px;font-size:36px;background:#f0f0f0;padding:12px 24px;display:inline-block">${code}</h1>
          <p>This code expires in 10 minutes.</p>
          <p style="color:#888;font-size:12px">If you did not request this, please ignore this email.</p>
        `,
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
        subject: 'Your verification code - Relax Media',
        html: `
          <h2>Login Verification</h2>
          <p>Your verification code is:</p>
          <h1 style="letter-spacing:8px;font-size:36px;background:#f0f0f0;padding:12px 24px;display:inline-block">${code}</h1>
          <p>This code expires in 10 minutes.</p>
          <p style="color:#888;font-size:12px">If you did not request this, please ignore this email.</p>
        `,
      })
      return true
    } catch (err) {
      console.error(`[EMAIL] Gmail SMTP failed for ${to}: ${err.message}`)
    }
  }

  console.log('[EMAIL] No working email provider configured — code printed to console only')
  return false
}