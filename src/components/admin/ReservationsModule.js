import { formatDigits } from '../../utils/digitFormatting'
import { useEffect, useRef, useState } from 'react'
import { useAdmin } from '../../context/AdminContext'
import { bookingRequest, STATUS_LABELS } from '../../utils/bookingApi'

const money = (cents) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(cents / 100)

export default function ReservationsModule() {
  const { sessionUser } = useAdmin()
  if (!sessionUser || !['admin', 'front-desk'].includes(sessionUser.role)) return <p role="alert">Please sign in with a staff account.</p>
  return <Reservations key={sessionUser.id} />
}

function Reservations() {
  const [rows, setRows] = useState([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [reload, setReload] = useState(0)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [selected, setSelected] = useState(null)
  const [confirm, setConfirm] = useState(false)
  const [actionError, setActionError] = useState('')
  const locked = useRef(false)
  const alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])

  useEffect(() => {
    let current = true
    setLoading(true); setError(''); setRows([])
    bookingRequest(`/bookings/staff-list?page=${page}&status=${encodeURIComponent(status)}`).then((result) => {
      if (!current) return
      if (result.error) setError(result.error)
      else { setRows(result.bookings); setHasMore(result.hasMore) }
      setLoading(false)
    })
    return () => { current = false }
  }, [page, status, reload])

  function open(row) { setSelected(row); setConfirm(false); setActionError(''); setMessage('') }
  async function cancel() {
    if (locked.current || !selected) return
    locked.current = true; setBusy(true); setActionError('')
    try {
      const result = await bookingRequest(`/bookings/${selected.id}/cancel`, { version: selected.version, confirmRefund: selected.paidCents > (selected.refundedCents || 0) })
      if (!alive.current) return
      if (result.error) {
        setActionError(result.error + ' Close these details and refresh before retrying.')
        setConfirm(false)
      } else {
        setSelected(null); setConfirm(false); setMessage('Reservation cancelled.'); setReload((n) => n + 1)
      }
    } finally { locked.current = false; if (alive.current) setBusy(false) }
  }
  const term = search.trim().toLowerCase()
  const visible = rows.filter((b) => [b.id, b.guest?.name, b.guest?.email, b.roomNumber, b.type].some((v) => String(v || '').toLowerCase().includes(term)))
  return <>
    <div className="admin-row" style={{ gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
      <label>Status <select value={status} disabled={loading || !!selected} onChange={(e) => { setPage(1); setStatus(e.target.value); setMessage('') }}>
        <option value="">All statuses</option>{Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select></label>
      <label>Search this page <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Guest, room or booking reference" /></label>
      <button className="admin-btn" disabled={loading || !!selected} onClick={() => { setMessage(''); setReload((n) => n + 1) }}>Refresh</button>
    </div>
    <p>Saved reservations · 50 per page. Refresh to see new bookings and payment updates.</p>
    {error && <p className="acc-error" role="alert">{error}</p>}
    {message && <p className="acc-saved" role="status">{message}</p>}
    <div className="admin-table-wrap"><table className="admin-table">
      <thead><tr><th>Guest</th><th>Room</th><th>Stay</th><th>Status</th><th>Total</th><th>Recorded payment</th><th>Action</th></tr></thead>
      <tbody>{visible.map((b) => <tr key={b.id}>
        <td>{b.guest?.name || 'Guest account unavailable'}</td><td>{b.roomNumber} · {b.type}</td>
        <td>{b.checkIn} → {b.checkOut}</td><td>{STATUS_LABELS[b.status] || b.status}</td>
        <td>{money(b.totalCents)}</td><td>{money(b.paidCents)}{b.simulatedPayment && ' (test payment)'}</td>
        <td><button className="admin-link" disabled={!!selected || loading} onClick={() => open(b)}>Details</button></td>
      </tr>)}{!visible.length && <tr><td colSpan="7">{loading ? 'Loading reservations…' : error ? 'Reservations unavailable.' : 'No matching reservations on this page.'}</td></tr>}</tbody>
    </table></div>
    <div className="admin-row" style={{ gap: 12, marginTop: 16 }}>
      <button className="admin-btn" disabled={page === 1 || loading || !!selected} onClick={() => setPage((n) => n - 1)}>Previous</button>
      <span>Page {page}</span>
      <button className="admin-btn" disabled={!hasMore || loading || !!selected || !!error} onClick={() => setPage((n) => n + 1)}>Next</button>
    </div>
    {selected && <section aria-label="Reservation details" style={{ marginTop: 24, padding: 20, border: '1px solid #ddd', borderRadius: 12 }}>
      <h3>Reservation details</h3>
      <p><strong>Reference:</strong> {selected.id}</p>
      <p><strong>Guest:</strong> {selected.guest?.name || 'Guest account unavailable'}<br />
        <strong>Contact:</strong> {selected.guest?.email || 'Unavailable'} · {formatDigits(selected.guest?.phone) || 'Phone unavailable'}</p>
      <p><strong>Room:</strong> {selected.roomNumber} · {selected.type}<br />
        <strong>Stay:</strong> {selected.checkIn} → {selected.checkOut}<br />
        <strong>Guests:</strong> {selected.adults} adults, {selected.children} children<br />
        <strong>Status:</strong> {STATUS_LABELS[selected.status]}</p>
      <p><strong>Requests:</strong> {selected.requests || 'None'}</p>
      <p>Total: {money(selected.totalCents)} · Recorded payment: {money(selected.paidCents)} · Balance: {money(['cancelled', 'expired'].includes(selected.status) ? 0 : Math.max(0, selected.totalCents - selected.paidCents))}</p>
      {selected.simulatedPayment && <p>Payment reference: {selected.simulatedPayment.reference}. No real money was collected.</p>}
      {selected.status === 'pending-payment' && <p>Hold ends: {new Date(selected.holdUntil).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })} (Philippine time).</p>}
      {actionError && <p className="acc-error" role="alert">{actionError}</p>}
      {!confirm && !actionError && ['pending-payment', 'confirmed', 'expired'].includes(selected.status) &&
        <button className="admin-btn" disabled={busy} onClick={() => setConfirm(true)}>Cancel reservation</button>}
      {confirm && <div role="group" aria-label="Confirm cancellation"><p>Cancel this reservation and release its room allocation? Any recorded deposit will be refunded in full to its original method.</p>
        <button className="admin-btn" disabled={busy} onClick={cancel}>{busy ? 'Cancelling…' : 'Yes, cancel and apply any refund'}</button>{' '}
        <button className="admin-btn" disabled={busy} onClick={() => setConfirm(false)}>Keep reservation</button>
      </div>}
      {selected.simulatedRefund && <p>Refund: {money(selected.refundedCents)} · {selected.simulatedRefund.method} · {selected.simulatedRefund.reference}</p>}
      <button className="admin-btn" style={{ marginTop: 12 }} disabled={busy} onClick={() => setSelected(null)}>Close details</button>
    </section>}
  </>
}
