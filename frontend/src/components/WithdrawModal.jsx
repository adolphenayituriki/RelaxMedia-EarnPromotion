import { useState } from 'react'

const MIN_WITHDRAW = 500

function calcFee(amount) {
  if (amount < MIN_WITHDRAW) return null
  if (amount <= 1000) return 50
  if (amount <= 1500) return 84
  if (amount <= 2000) return 120
  return 200
}

export default function WithdrawModal({ earned, onWithdraw, onClose, submitting }) {
  const [amount, setAmount] = useState(Math.floor(earned))
  const [phone, setPhone] = useState('')
  const [fullName, setFullName] = useState('')

  const fee = calcFee(amount)
  const netAmount = fee !== null ? amount - fee : 0
  const validAmount = amount >= MIN_WITHDRAW && amount <= earned
  const canSubmit = validAmount && fee !== null && phone.trim().length >= 10 && fullName.trim().length > 0

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!canSubmit) return
    onWithdraw({ amount, fee, netAmount, phone: phone.trim(), fullName: fullName.trim() })
  }

  return (
    <div className="withdraw-overlay" onClick={onClose}>
      <div className="withdraw-modal" onClick={e => e.stopPropagation()}>
        <div className="withdraw-header">
          <h2>Withdraw Earnings</h2>
          <button className="withdraw-close" onClick={onClose}>✕</button>
        </div>

        <div className="withdraw-balance">
          Available: <strong>{earned.toFixed(2)} RFW</strong>
        </div>

        <p className="withdraw-note">Minimum withdraw: {MIN_WITHDRAW} RFW. Fee is deducted from the amount.</p>

        <form onSubmit={handleSubmit}>
          <label>
            Amount (RFW)
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(Math.max(0, Number(e.target.value)))}
              min={MIN_WITHDRAW}
              max={earned}
              disabled={submitting}
            />
          </label>

          {fee !== null && amount >= MIN_WITHDRAW && (
            <div className="withdraw-fee-box">
              <div className="withdraw-fee-row">
                <span>Withdraw amount:</span>
                <span>{amount} RFW</span>
              </div>
              <div className="withdraw-fee-row">
                <span>Fee:</span>
                <span>-{fee} RFW</span>
              </div>
              <div className="withdraw-fee-row withdraw-net">
                <span>You receive:</span>
                <span>{netAmount} RFW</span>
              </div>
            </div>
          )}

          <label>
            MTN Phone Number (Rwanda)
            <input
              type="tel"
              placeholder="078XXXXXXX"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              disabled={submitting}
            />
          </label>

          <label>
            Full Name (as registered on MTN)
            <input
              type="text"
              placeholder="Jean Baptiste Niyonzima"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              disabled={submitting}
            />
          </label>

          <button type="submit" disabled={!canSubmit || submitting}>
            {submitting ? 'Submitting...' : 'Submit Withdraw Request'}
          </button>
        </form>
      </div>
    </div>
  )
}
