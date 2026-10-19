import { useEffect, useState } from 'react'
import { useAdmin, T, sd } from '../../context/AdminContext'
import { bookingRequest } from '../../utils/bookingApi'
import MailOutbox from './MailOutbox'
export default function AuditModule() {
  const { sessionUser } = useAdmin()
  if (sessionUser?.role !== 'admin') return <p role="alert">Administrator access required.</p>
  return <Audit key={sessionUser.id} />
}
function Audit() {
  const [tab, setTab] = useState('audit'), [form, setForm] = useState({ from: sd(-30), to: T(), q: '' })
  const [query, setQuery] = useState(form), [page, setPage] = useState(1), [revision, setRevision] = useState(0)
  const [data, setData] = useState(null), [error, setError] = useState('')
  // ---- filter ----
  // YYYY-MM-DD
  useEffect(() => { let current = true; setData(null); setError(''); bookingRequest('/audit?' + new URLSearchParams({ ...query, page })).then((r) => { if (!current) return; if (r.error) setError(r.error); else setData(r) }); return () => { current = false } }, [query, page, revision])
  // ---- CSV export ----
  function exportCSV() {
    const cell = (v) => { let s = String(v ?? ''); if (/^[=+@\-\t\r]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"' }
    const rows = [['Time', 'Actor', 'Role', 'Action', 'Outcome', 'HTTP'], ...data.logs.map((l) => [l.at, l.actor, l.role, l.action, l.outcome, l.statusCode])]
    const url = URL.createObjectURL(new Blob([rows.map((r) => r.map(cell).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a'); a.href = url; a.download = 'audit-page-' + page + '.csv'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return <><button className="admin-btn" onClick={() => setTab('audit')}>Audit log</button>{' '}<button className="admin-btn" onClick={() => setTab('mail')}>Booking emails</button>
    {tab === 'mail' ? <MailOutbox /> : <>
      <p>Server request outcomes since installation. Accepted includes safe retries. Unknown means unfinished recording; verify the affected record.</p>
      {/* ---- Filters ---- */}
      <form className="admin-row" style={{ gap: 12 }} onSubmit={(e) => { e.preventDefault(); setQuery({ ...form }); setPage(1); setRevision((n) => n + 1) }}>
        <label>From <input type="date" required value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} /></label><label>To <input type="date" required value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} /></label>
        <label>Action <input maxLength={100} value={form.q} onChange={(e) => setForm({ ...form, q: e.target.value })} placeholder="bookings, staff, rooms…" /></label><button className="admin-btn">Search / refresh</button>
      </form>{error && <p role="alert">{error}</p>}
      {/* ---- Table ---- */}
      <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Time (PH)</th><th>Actor</th><th>Role</th><th>Action</th><th>Outcome</th></tr></thead><tbody>{data?.logs.map((l) => <tr key={l.id}><td>{new Date(l.at).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}</td><td>{l.actor}</td><td>{l.role}</td><td>{l.action}</td><td>{l.outcome} {l.statusCode}</td></tr>)}</tbody></table></div>
      {!data && !error && <p>Loading…</p>}{data?.logs.length === 0 && <p>No entries in this range.</p>}
      <button className="admin-btn" disabled={page === 1} onClick={() => setPage((n) => n - 1)}>Previous</button> Page {page} <button className="admin-btn" disabled={!data?.hasMore} onClick={() => setPage((n) => n + 1)}>Next</button>{' '}
      <button className="admin-btn" disabled={!data?.logs.length} onClick={exportCSV}>Export this page</button>
    </>}
  </>
}
