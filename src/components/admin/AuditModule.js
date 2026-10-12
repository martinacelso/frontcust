import { useMemo, useState } from 'react'
import { useAdmin, T, sd } from '../../context/AdminContext'

export default function AuditModule() {
  const { logs } = useAdmin()

  const [search, setSearch] = useState('')
  const [from, setFrom] = useState(sd(-30))
  const [to, setTo] = useState(T())

  // ---- filter ----
  const filtered = useMemo(() => {
    return logs.filter((l) => {
      const d = l.at.slice(0, 10) // YYYY-MM-DD
      if (d < from || d > to) return false
      if (search) {
        const haystack = (
          l.actor + l.role + l.action + l.target + l.details
        ).toLowerCase()
        if (!haystack.includes(search.toLowerCase())) return false
      }
      return true
    })
  }, [logs, search, from, to])

  // ---- CSV export ----
  function exportCSV() {
    const headers = ['Time', 'User', 'Role', 'Action', 'Target', 'Details']
    const rows = filtered.map((l) => [
      new Date(l.at).toLocaleString('en-US'),
      l.actor,
      l.role,
      l.action,
      l.target,
      l.details,
    ])

    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((cell) => {
            const s = String(cell ?? '')
            return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
          })
          .join(',')
      )
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `twin-lakes-audit-${T()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      {/* ---- Filters ---- */}
      <div className="admin-card">
        <div className="admin-row admin-row-audit-filters">
          <div>
            <label>Search</label>
            <input
              placeholder="Name, action, target…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div>
            <label>From</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>

          <div>
            <label>To</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>

          <div>
            <button
              className="admin-btn"
              onClick={exportCSV}
              disabled={filtered.length === 0}
            >
              Export CSV
            </button>
          </div>
        </div>

        <p className="admin-muted acc-small" style={{ marginTop: 6 }}>
          Showing <b>{filtered.length}</b> of {logs.length} entries
        </p>
      </div>

      {/* ---- Table ---- */}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>User</th>
              <th>Role</th>
              <th>Action</th>
              <th>Target</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="6" className="admin-muted">
                  No entries match the current filter.
                </td>
              </tr>
            ) : (
              filtered.map((l) => (
                <tr key={l.id}>
                  <td className="admin-muted" style={{ fontSize: 12 }}>
                    {new Date(l.at).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td>{l.actor}</td>
                  <td className="admin-muted">{l.role}</td>
                  <td><b>{l.action}</b></td>
                  <td>{l.target}</td>
                  <td className="admin-muted">{l.details}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}