import { useEffect, useState } from 'react'

function fmt(s) {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export default function AdminDashboard({ user, onSignOut }) {
  const [tab, setTab] = useState('overview')
  const [users, setUsers] = useState([])
  const [withdrawals, setWithdrawals] = useState([])
  const [stats, setStats] = useState(null)

  useEffect(() => {
    fetch('/api/admin/stats').then(r => r.json()).then(setStats).catch(() => {})
    fetch('/api/admin/users').then(r => r.json()).then(setUsers).catch(() => {})
    fetch('/api/admin/withdrawals').then(r => r.json()).then(setWithdrawals).catch(() => {})
  }, [])

  const updateWithdrawStatus = async (id, status) => {
    await fetch(`/api/admin/withdraw/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    const res = await fetch('/api/admin/withdrawals')
    setWithdrawals(await res.json())
  }

  return (
    <div className="admin-container">
      <header className="admin-header">
        <h1>Admin Dashboard</h1>
        <div className="admin-user">
          <span>{user.email}</span>
          <button onClick={onSignOut}>Sign Out</button>
        </div>
      </header>

      <nav className="admin-nav">
        <button className={tab === 'overview' ? 'active' : ''} onClick={() => setTab('overview')}>Overview</button>
        <button className={tab === 'users' ? 'active' : ''} onClick={() => setTab('users')}>Users</button>
        <button className={tab === 'withdrawals' ? 'active' : ''} onClick={() => setTab('withdrawals')}>Withdrawals</button>
      </nav>

      {tab === 'overview' && stats && (
        <div className="admin-stats-grid">
          <div className="admin-stat-card">
            <span className="admin-stat-label">Total Users</span>
            <span className="admin-stat-value">{stats.totalUsers}</span>
          </div>
          <div className="admin-stat-card">
            <span className="admin-stat-label">Total Watch Time</span>
            <span className="admin-stat-value">{fmt(stats.totalSeconds)}</span>
          </div>
          <div className="admin-stat-card">
            <span className="admin-stat-label">Pending Withdrawals</span>
            <span className="admin-stat-value">{stats.pendingWithdrawals}</span>
          </div>
          <div className="admin-stat-card">
            <span className="admin-stat-label">Total Paid</span>
            <span className="admin-stat-value">{stats.totalPaid.toFixed(2)} RFW</span>
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Watch Time</th>
                <th>Earned (RFW)</th>
                <th>Withdrawn (RFW)</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.userId}>
                  <td>{u.email}</td>
                  <td>{fmt(u.totalWatched)}</td>
                  <td>{u.earned.toFixed(2)}</td>
                  <td>{u.totalWithdrawn.toFixed(2)}</td>
                  <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={5} className="admin-empty">No users yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'withdrawals' && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Phone</th>
                <th>Name</th>
                <th>Amount</th>
                <th>Fee</th>
                <th>Net</th>
                <th>Status</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {withdrawals.map(w => (
                <tr key={w._id}>
                  <td>{w.email}</td>
                  <td>{w.phone}</td>
                  <td>{w.fullName}</td>
                  <td>{w.amount} RFW</td>
                  <td>{w.fee} RFW</td>
                  <td>{w.netAmount} RFW</td>
                  <td>
                    <span className={`admin-status admin-status-${w.status}`}>{w.status}</span>
                  </td>
                  <td>{new Date(w.createdAt).toLocaleDateString()}</td>
                  <td>
                    {w.status === 'pending' && (
                      <div className="admin-action-btns">
                        <button className="admin-approve-btn" onClick={() => updateWithdrawStatus(w._id, 'processed')}>Approve</button>
                        <button className="admin-reject-btn" onClick={() => updateWithdrawStatus(w._id, 'failed')}>Reject</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {withdrawals.length === 0 && (
                <tr><td colSpan={9} className="admin-empty">No withdrawal requests</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
