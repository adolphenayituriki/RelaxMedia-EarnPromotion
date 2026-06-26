const TIERS = [
  { minHours: 0, rate: 100, label: 'Starter', color: '#aaa', bg: '#333' },
  { minHours: 5, rate: 100, label: 'Bronze', color: '#ffa726', bg: '#5d3a1a' },
  { minHours: 12, rate: 100, label: 'Silver', color: '#80d8ff', bg: '#1a2a3a' },
]

export default function Promotions({ totalWatched, onClose }) {
  const hours = totalWatched / 3600

  let currentTier = TIERS[0]
  for (const t of TIERS) {
    if (hours >= t.minHours) currentTier = t
  }

  return (
    <div className="promo-overlay" onClick={onClose}>
      <div className="promo-modal" onClick={e => e.stopPropagation()}>
        <div className="promo-modal-header">
          <h2>Promotions & Rewards</h2>
          <button className="promo-close" onClick={onClose}>✕</button>
        </div>

        <p className="promo-desc">
          Earn more RFW the longer you watch. Rates apply to your total watch time.
        </p>

        <div className="promo-tiers">
          {TIERS.map((tier, i) => {
            const unlocked = hours >= tier.minHours
            const nextTier = TIERS[i + 1]
            const progress = nextTier
              ? Math.min(((hours - tier.minHours) / (nextTier.minHours - tier.minHours)) * 100, 100)
              : 100

            return (
              <div key={tier.label} className={`promo-tier ${unlocked ? 'unlocked' : ''}`}>
                <div className="promo-tier-header">
                  <span className="promo-tier-badge" style={{ background: tier.bg, color: tier.color }}>
                    {tier.label}
                  </span>
                  <span className="promo-tier-rate">{tier.rate} RFW/h</span>
                  {unlocked && <span className="promo-tier-check">✓ Active</span>}
                </div>
                <div className="promo-tier-req">
                  {tier.minHours === 0 ? 'Start watching' : `${tier.minHours}+ hours watched`}
                </div>
                {i < TIERS.length - 1 && (
                  <div className="promo-progress-track">
                    <div className="promo-progress-fill" style={{
                      width: `${Math.max(0, Math.min(progress, 100))}%`,
                      background: tier.color,
                    }} />
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="promo-current">
          Current: <strong>{currentTier.label}</strong> — {currentTier.rate} RFW/h
        </div>
      </div>
    </div>
  )
}
