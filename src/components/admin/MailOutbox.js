import { useEffect, useState } from 'react'
import { bookingRequest } from '../../utils/bookingApi'
export default function MailOutbox() {
  const [data, setData] = useState(null), [page, setPage] = useState(1), [revision, setRevision] = useState(0)
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [selected, setSelected] = useState(null)
  useEffect(() => { let current = true; setData(null); setError(''); bookingRequest('/mail?page=' + page).then((r) => { if (!current) return; if (r.error) setError(r.error); else setData(r) }); return () => { current = false } }, [page, revision])
  async function retry(j) {
    if (busy || !window.confirm('Send this email? If an earlier delivery was uncertain, check the mailbox first to avoid duplicates.')) return
    setBusy(true); const r = await bookingRequest('/mail/' + j.id + '/retry', { confirm: true }); setBusy(false)
    if (r.error) setError(r.error); else { setSelected(null); setRevision((n) => n + 1) }
  }
  return <section><h3>Booking emails</h3><p>{data?.smtpEnabled ? 'SMTP enabled. Sent means the mail server accepted the message, not guaranteed inbox delivery.' : 'Booking messages are stored here and in the guest profile inbox.'}</p>
    {error && <p role="alert">{error}</p>}<button className="admin-btn" disabled={busy} onClick={() => setRevision((n) => n + 1)}>Refresh emails</button>
    <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Recipient</th><th>Subject</th><th>Status</th><th>Action</th></tr></thead><tbody>{data?.jobs.map((j) => <tr key={j.id}><td>{j.to}</td><td>{j.subject}</td><td>{j.status}</td><td><button className="admin-link" onClick={() => setSelected(j)}>View</button>{data.smtpEnabled && ['preview', 'failed'].includes(j.status) && j.attempts < 5 && <button className="admin-link" disabled={busy} onClick={() => retry(j)}>Queue email</button>}</td></tr>)}</tbody></table></div>
    {!data && !error && <p>Loading…</p>}{data?.jobs.length === 0 && <p>No messages queued yet.</p>}
    <button className="admin-btn" disabled={busy || page === 1} onClick={() => setPage((n) => n - 1)}>Previous</button> Page {page} <button className="admin-btn" disabled={busy || !data?.hasMore} onClick={() => setPage((n) => n + 1)}>Next</button>
    {selected && <div className="admin-card"><p>{selected.lastError}</p><pre style={{ whiteSpace: 'pre-wrap' }}>{selected.text}</pre><button className="admin-btn" onClick={() => setSelected(null)}>Close message</button></div>}
  </section>
}
