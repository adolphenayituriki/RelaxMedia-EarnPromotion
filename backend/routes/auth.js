import { Router } from 'express'
import crypto from 'crypto'
import User from '../models/User.js'
import { ADMIN_EMAIL, ADMIN_PASSWORD, generateUserId, hashPassword, verifyPassword } from '../shared.js'
import { generateCode, sendVerificationEmail } from '../email.js'

const router = Router()

/**
 * @openapi
 * /api/auth/signup:
 *   post:
 *     tags: [Auth]
 *     summary: Create a new account
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               fullName:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: Account created
 *       400:
 *         description: Email already exists
 */
router.post('/signup', async (req, res) => {
  try {
    const { fullName, email, password } = req.body
    if (!email) return res.status(400).json({ error: 'Email is required' })
    if (!password) return res.status(400).json({ error: 'Password is required' })

    const cleanEmail = email.toLowerCase().trim()
    const existing = await User.findOne({ email: cleanEmail })
    if (existing) return res.status(400).json({ error: 'Email already registered' })

    const code = generateCode()
    const user = await User.create({
      fullName: (fullName || '').trim(),
      email: cleanEmail,
      userId: generateUserId(),
      passwordHash: hashPassword(password),
      verified: false,
      verificationCode: code,
      verificationCodeExpires: new Date(Date.now() + 600000),
    })
    const sent = await sendVerificationEmail(cleanEmail, code)

    res.status(201).json({ needOtp: true, email: cleanEmail, emailSent: sent })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * @openapi
 * /api/auth/signin:
 *   post:
 *     tags: [Auth]
 *     summary: Sign in or sign up with email and password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Auth success
 *       400:
 *         description: Missing email or password
 *       401:
 *         description: Invalid password
 *       403:
 *         description: Email not verified
 */
router.post('/signin', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email) return res.status(400).json({ error: 'Email is required' })
    if (!password) return res.status(400).json({ error: 'Password is required' })

    const cleanEmail = email.toLowerCase().trim()
    const isAdmin = cleanEmail === ADMIN_EMAIL

    if (isAdmin) {
      if (password !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Invalid admin password' })
      }
      let user = await User.findOne({ email: ADMIN_EMAIL })
      if (!user) {
        user = await User.create({
          email: ADMIN_EMAIL,
          userId: 'admin_' + crypto.randomBytes(4).toString('hex'),
          passwordHash: hashPassword(ADMIN_PASSWORD),
          verified: false,
        })
      }
    }

    let user = await User.findOne({ email: cleanEmail })
    if (!user) return res.status(400).json({ error: 'No account found. Please sign up first.' })

    if (!verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ error: 'Invalid password' })
    }
    const code = generateCode()
    user.verificationCode = code
    user.verificationCodeExpires = new Date(Date.now() + 600000)
    await user.save()
    const sent = await sendVerificationEmail(cleanEmail, code)
    res.json({ needOtp: true, email: cleanEmail, emailSent: sent })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * @openapi
 * /api/auth/verify-email:
 *   post:
 *     tags: [Auth]
 *     summary: Verify email with 6-digit code
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, code]
 *             properties:
 *               email:
 *                 type: string
 *               code:
 *                 type: string
 *     responses:
 *       200:
 *         description: Email verified
 *       400:
 *         description: Invalid or expired code
 */
router.post('/verify-email', async (req, res) => {
  try {
    const { email, code } = req.body
    if (!email || !code) return res.status(400).json({ error: 'Email and code are required' })

    const user = await User.findOne({ email: email.toLowerCase().trim() })
    if (!user) return res.status(400).json({ error: 'User not found' })
    if (user.verificationCode !== code) return res.status(400).json({ error: 'Invalid verification code' })
    if (user.verificationCodeExpires < new Date()) return res.status(400).json({ error: 'Verification code expired' })

    user.verified = true
    user.verificationCode = null
    user.verificationCodeExpires = null
    await user.save()

    res.json({ userId: user.userId, email: user.email, fullName: user.fullName || '', isAdmin: user.email === ADMIN_EMAIL })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * @openapi
 * /api/auth/resend-code:
 *   post:
 *     tags: [Auth]
 *     summary: Resend verification code
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Code resent
 */
router.post('/resend-code', async (req, res) => {
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ error: 'Email is required' })

    const user = await User.findOne({ email: email.toLowerCase().trim() })
    if (!user) return res.status(400).json({ error: 'User not found' })

    const code = generateCode()
    user.verificationCode = code
    user.verificationCodeExpires = new Date(Date.now() + 600000)
    await user.save()
    const sent = await sendVerificationEmail(user.email, code)

    res.json({ message: 'Verification code sent', emailSent: sent })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
