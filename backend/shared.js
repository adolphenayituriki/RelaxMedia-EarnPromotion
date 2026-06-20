import crypto from 'crypto'

export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'www.nayituriki.com@gmail.com'
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Adolphe@078'

export const TIERS = [
  { minHours: 0, rate: 65, label: 'Starter' },
  { minHours: 5, rate: 80, label: 'Bronze' },
  { minHours: 12, rate: 100, label: 'Silver' },
]

export function getTier(hours) {
  let t = TIERS[0]
  for (const tier of TIERS) {
    if (hours >= tier.minHours) t = tier
  }
  return t
}

export function calcEarnings(totalSeconds) {
  const hours = totalSeconds / 3600
  return hours * getTier(hours).rate
}

export function calcWithdrawFee(amount) {
  if (amount < 500) return null
  if (amount <= 1000) return 50
  if (amount <= 1500) return 84
  if (amount <= 2000) return 120
  return 200
}

export function generateUserId() {
  return 'user_' + crypto.randomBytes(4).toString('hex')
}

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':')
  const verify = crypto.scryptSync(password, salt, 64).toString('hex')
  return hash === verify
}
