import { useEffect, useState } from 'react'

function fmt(s) {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = Math.floor(s % 60)
  if (h > 0) return `${h}h ${m}m ${sec}s`
  if (m > 0) return `${m}m ${sec}s`
  return `${sec}s`
}

function fmtDate(d) {
  return new Date(d).toLocaleDateString()
}

function fmtDateTime(d) {
  return new Date(d).toLocaleString()
}

export default function AdminDashboard({ user, onSignOut }) {
  const [tab, setTab] = useState('overview')
  const [users, setUsers] = useState([])
  const [withdrawals, setWithdrawals] = useState([])
  const [watched, setWatched] = useState([])
  const [comments, setComments] = useState([])
  const [rewards, setRewards] = useState([])
  const [stats, setStats] = useState(null)

  const [editUser, setEditUser] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [showAddUser, setShowAddUser] = useState(false)
  const [addingUser, setAddingUser] = useState(false)

  const loadAll = () => {
    fetch('/api/admin/stats').then(r => r.json()).then(setStats).catch(() => {})
    fetch('/api/admin/users').then(r => r.json()).then(setUsers).catch(() => {})
    fetch('/api/admin/withdrawals').then(r => r.json()).then(setWithdrawals).catch(() => {})
    fetch('/api/admin/watched').then(r => r.json()).then(setWatched).catch(() => {})
    fetch('/api/admin/comments').then(r => r.json()).then(setComments).catch(() => {})
    fetch('/api/admin/rewards').then(r => r.json()).then(setRewards).catch(() => {})
  }

  useEffect(() => {
    loadAll()
    const interval = setInterval(loadAll, 5000)
    return () => clearInterval(interval)
  }, [])

  /* ───── User CRUD ───── */

  const updateUser = async (id, data) => {
    await fetch(`/api/admin/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    setEditUser(null)
    loadAll()
  }

  const deleteUser = async (id) => {
    await fetch(`/api/admin/users/${id}`, { method: 'DELETE' })
    setDeleteConfirm(null)
    loadAll()
  }

  const addUser = async (e) => {
    e.preventDefault()
    setAddingUser(true)
    const fd = new FormData(e.target)
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: fd.get('email'),
        password: fd.get('password'),
        totalWatched: Number(fd.get('totalWatched')) || 0,
        verified: fd.get('verified') === 'on',
      }),
    })
    const data = await res.json()
    setAddingUser(false)
    if (!data.error) { setShowAddUser(false); loadAll() }
    else alert(data.error)
  }

  /* ───── Watched / Comments / Rewards Delete ───── */

  const deleteWatched = async (id) => {
    await fetch(`/api/admin/watched/${id}`, { method: 'DELETE' })
    loadAll()
  }

  const deleteComment = async (id) => {
    await fetch(`/api/admin/comments/${id}`, { method: 'DELETE' })
    loadAll()
  }

  const deleteReward = async (id) => {
    await fetch(`/api/admin/rewards/${id}`, { method: 'DELETE' })
    loadAll()
  }

  const updateWithdrawStatus = async (id, status) => {
    await fetch(`/api/admin/withdraw/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    loadAll()
  }

  const deleteWithdraw = async (id) => {
    await fetch(`/api/admin/withdraw/${id}`, { method: 'DELETE' })
    loadAll()
  }

  const navButtons = [
    { key: 'overview', label: 'Overview' },
    { key: 'users', label: 'Users' },
    { key: 'withdrawals', label: 'Withdrawals' },
    { key: 'watched', label: 'Watched' },
    { key: 'comments', label: 'Comments' },
    { key: 'rewards', label: 'Rewards' },
  ]

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
        {navButtons.map(b => (
          <button key={b.key} className={tab === b.key ? 'active' : ''} onClick={() => setTab(b.key)}>
            {b.label}
          </button>
        ))}
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
            <span className="admin-stat-label">Videos Watched</span>
            <span className="admin-stat-value">{stats.totalVideosWatched}</span>
          </div>
          <div className="admin-stat-card">
            <span className="admin-stat-label">Pending Withdrawals</span>
            <span className="admin-stat-value">{stats.pendingWithdrawals}</span>
          </div>
          <div className="admin-stat-card">
            <span className="admin-stat-label">Total Paid</span>
            <span className="admin-stat-value">{stats.totalPaid.toFixed(2)} RFW</span>
          </div>
          <div className="admin-stat-card">
            <span className="admin-stat-label">Reward Claims</span>
            <span className="admin-stat-value">{stats.totalRewardClaims}</span>
          </div>
          <div className="admin-stat-card">
            <span className="admin-stat-label">Comments</span>
            <span className="admin-stat-value">{stats.totalComments}</span>
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div>
          <div className="admin-toolbar">
            <span className="admin-count">{users.length} user{users.length !== 1 ? 's' : ''}</span>
            <button className="admin-add-btn" onClick={() => setShowAddUser(true)}>+ Add User</button>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>User ID</th>
                  <th>Watch Time</th>
                  <th>Earned</th>
                  <th>Withdrawn</th>
                  <th>Verified</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u._id}>
                    <td>{u.email}</td>
                    <td className="admin-mono">{u.userId}</td>
                    <td>{fmt(u.totalWatched)}</td>
                    <td>{u.earned.toFixed(2)} RFW</td>
                    <td>{u.totalWithdrawn.toFixed(2)} RFW</td>
                    <td>
                      <span className={`admin-badge ${u.verified ? 'admin-badge-yes' : 'admin-badge-no'}`}>
                        {u.verified ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td>{fmtDate(u.createdAt)}</td>
                    <td>
                      <div className="admin-action-btns">
                        <button className="admin-edit-btn" onClick={() => setEditUser(u)}>Edit</button>
                        <button className="admin-delete-btn" onClick={() => setDeleteConfirm(u)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr><td colSpan={8} className="admin-empty">No users yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
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
                <th>User Info</th>
                <th>Date</th>
                <th>Actions</th>
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
                  <td className="admin-user-info-cell">
                    <div>Earned: {w.userEarned?.toFixed(2) ?? '?'} RFW</div>
                    <div>Withdrawn: {w.userTotalWithdrawn?.toFixed(2) ?? '?'} RFW</div>
                    <div>Available: {w.userAvailable?.toFixed(2) ?? '?'} RFW</div>
                  </td>
                  <td>{fmtDate(w.createdAt)}</td>
                  <td>
                    <div className="admin-action-btns">
                      {w.status === 'pending' && (
                        <>
                          <button className="admin-approve-btn" onClick={() => updateWithdrawStatus(w._id, 'processed')}>Approve</button>
                          <button className="admin-reject-btn" onClick={() => updateWithdrawStatus(w._id, 'failed')}>Reject</button>
                        </>
                      )}
                      <button className="admin-delete-btn-sm" onClick={() => deleteWithdraw(w._id)} title="Delete">&times;</button>
                    </div>
                  </td>
                </tr>
              ))}
              {withdrawals.length === 0 && (
                <tr><td colSpan={10} className="admin-empty">No withdrawal requests</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'watched' && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Video ID</th>
                <th>Total Watched</th>
                <th>Fully Watched</th>
                <th>Last Watched</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {watched.map(w => (
                <tr key={w._id}>
                  <td>{w.userEmail}</td>
                  <td className="admin-mono">{w.videoId}</td>
                  <td>{fmt(w.totalWatched)}</td>
                  <td>
                    <span className={`admin-badge ${w.fullyWatched ? 'admin-badge-yes' : 'admin-badge-no'}`}>
                      {w.fullyWatched ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td>{fmtDateTime(w.watchedAt)}</td>
                  <td>
                    <button className="admin-delete-btn-sm" onClick={() => deleteWatched(w._id)} title="Delete">&times;</button>
                  </td>
                </tr>
              ))}
              {watched.length === 0 && (
                <tr><td colSpan={6} className="admin-empty">No watched videos yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'comments' && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Video ID</th>
                <th>Comment</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {comments.map(c => (
                <tr key={c._id}>
                  <td>{c.userEmail}</td>
                  <td className="admin-mono">{c.videoId}</td>
                  <td className="admin-comment-text">{c.text}</td>
                  <td>{fmtDateTime(c.timestamp)}</td>
                  <td>
                    <button className="admin-delete-btn-sm" onClick={() => deleteComment(c._id)} title="Delete">&times;</button>
                  </td>
                </tr>
              ))}
              {comments.length === 0 && (
                <tr><td colSpan={5} className="admin-empty">No comments yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'rewards' && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Video ID</th>
                <th>Claimed At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rewards.map(r => (
                <tr key={r._id}>
                  <td>{r.userEmail}</td>
                  <td className="admin-mono">{r.videoId}</td>
                  <td>{fmtDateTime(r.claimedAt)}</td>
                  <td>
                    <button className="admin-delete-btn-sm" onClick={() => deleteReward(r._id)} title="Delete">&times;</button>
                  </td>
                </tr>
              ))}
              {rewards.length === 0 && (
                <tr><td colSpan={4} className="admin-empty">No reward claims yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ───── Edit User Modal ───── */}
      {editUser && (
        <div className="admin-overlay" onClick={() => setEditUser(null)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <h2>Edit User</h2>
            <form onSubmit={e => { e.preventDefault(); const fd = new FormData(e.target); updateUser(editUser._id, { email: fd.get('email'), totalWatched: Number(fd.get('totalWatched')), verified: fd.get('verified') === 'on' }) }}>
              <label>Email
                <input name="email" type="email" defaultValue={editUser.email} required />
              </label>
              <label>Total Watched (seconds)
                <input name="totalWatched" type="number" defaultValue={editUser.totalWatched} min="0" />
              </label>
              <label className="admin-check-label">
                <input name="verified" type="checkbox" defaultChecked={editUser.verified} />
                Verified
              </label>
              <div className="admin-modal-actions">
                <button type="submit" className="admin-approve-btn">Save</button>
                <button type="button" className="admin-reject-btn" onClick={() => setEditUser(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───── Add User Modal ───── */}
      {showAddUser && (
        <div className="admin-overlay" onClick={() => setShowAddUser(false)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <h2>Add User</h2>
            <form onSubmit={addUser}>
              <label>Email
                <input name="email" type="email" required />
              </label>
              <label>Password
                <input name="password" type="text" required />
              </label>
              <label>Total Watched (seconds)
                <input name="totalWatched" type="number" defaultValue="0" min="0" />
              </label>
              <label className="admin-check-label">
                <input name="verified" type="checkbox" defaultChecked />
                Verified
              </label>
              <div className="admin-modal-actions">
                <button type="submit" className="admin-approve-btn" disabled={addingUser}>
                  {addingUser ? 'Adding...' : 'Add User'}
                </button>
                <button type="button" className="admin-reject-btn" onClick={() => setShowAddUser(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───── Delete Confirm Modal ───── */}
      {deleteConfirm && (
        <div className="admin-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="admin-modal admin-modal-sm" onClick={e => e.stopPropagation()}>
            <h2>Delete User?</h2>
            <p>This will permanently delete <strong>{deleteConfirm.email}</strong> and all their watched videos, comments, withdrawals, and reward claims.</p>
            <div className="admin-modal-actions">
              <button className="admin-delete-btn" onClick={() => deleteUser(deleteConfirm._id)}>Delete</button>
              <button className="admin-reject-btn" onClick={() => setDeleteConfirm(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <footer className="app-footer">
        Powered by RELAX MEDIA, 2026 Rwanda = Nayituriki Adolphe &nbsp;|&nbsp; Contact us: <a href="mailto:www.nayituriki.com@gmail.com">www.nayituriki.com@gmail.com</a>
      </footer>
    </div>
  )
}
