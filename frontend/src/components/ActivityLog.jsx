export default function ActivityLog({ logs }) {
  return (
    <div className="log-section">
      <h3>Activity Log</h3>
      <div className="log">
        {logs.map((entry, i) => (
          <div key={i} className="log-entry">{entry}</div>
        ))}
      </div>
    </div>
  )
}
