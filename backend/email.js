import nodemailer from 'nodemailer'
import crypto from 'crypto'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.OTP_EMAIL || process.env.ADMIN_EMAIL,
    pass: process.env.OTP_PASSWORD,
  },
})

export function generateCode() {
  return crypto.randomInt(100000, 999999).toString()
}

export async function sendVerificationEmail(to, code) {
  if (!process.env.OTP_PASSWORD) {
    console.log(`[DEV] Verification code for ${to}: ${code}`)
    return
  }
  await transporter.sendMail({
    from: `"Relax Media" <${process.env.OTP_EMAIL || process.env.ADMIN_EMAIL}>`,
    to,
    subject: 'Verify your email - Relax Media Earn Promotion',
    html: `
      <h2>Email Verification</h2>
      <p>Your verification code is:</p>
      <h1 style="letter-spacing:8px;font-size:36px;background:#f0f0f0;padding:12px 24px;display:inline-block">${code}</h1>
      <p>This code expires in 10 minutes.</p>
    `,
  })
}
