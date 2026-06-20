import nodemailer from 'nodemailer'
import crypto from 'crypto'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.OTP_EMAIL || process.env.ADMIN_EMAIL,
    pass: process.env.OTP_PASSWORD,
  },
  connectionTimeout: 15000,
  greetingTimeout: 15000,
  socketTimeout: 15000,
  tls: { rejectUnauthorized: false },
})

export function generateCode() {
  return crypto.randomInt(100000, 999999).toString()
}

export async function sendVerificationEmail(to, code) {
  console.log(`[DEV] Verification code for ${to}: ${code}`)
  if (!process.env.OTP_PASSWORD) {
    console.log('[EMAIL] OTP_PASSWORD not set — code only printed to console')
    return false
  }
  try {
    await transporter.sendMail({
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
    console.error(`[EMAIL] Failed to send to ${to}: ${err.message}`)
    return false
  }
}