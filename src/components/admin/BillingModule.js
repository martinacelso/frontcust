import { useEffect, useState } from 'react'
import { useAdmin } from '../../context/AdminContext'
import { bookingRequest, STATUS_LABELS } from '../../utils/bookingApi'
import { money, balanceDue, paymentEntries, pageTotals, receiptText } from '../../utils/billing'

export default function BillingModule() {
  const { sessionUser } = useAdmin()
  if (!sessionUser || !['admin', 'front-desk'].includes(sessionUser.role)) return <p role="alert">Staff sign-in required.</p>
  return <Billing key={sessionUser.id} />
}

function Billing() {
  const [rows, setRows] = useState([])
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [more, setMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  const [selected, setSelected] = useState(null)
  useEffect(() => {
    let current = true
    setRows([]); setSelected(null); setLoading(true); setError('')
    bookingRequest(`/bookings/staff-list?page=${page}&status=${encodeURIComponent(status)}`).then((result) => {
      if (!current) return
      if (result.error) setError(result.error)
      else { setRows(result.bookings); setMore(result.hasMore) }
      setLoading(false)
    })
    return () => { current = false }
  }, [page, status, reload])
  const term = search.trim().toLowerCase()
  const visible = rows.filter((b) => [b.id, b.roomNumber, b.guest?.name].some((v) => String(v || '').toLowerCase().includes(term)))
  const totals = pageTotals(visible)
  function download() {
    const url = URL.createObjectURL(new Blob([receiptText(selected)], { type: 'text/plain;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url; link.download = `booking-${selected.id}-summary.txt`
    document.body.appendChild(link); link.click(); link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return <>
    <h2 className="admin-h2">Billing</h2>
    <p>Saved booking charges and payments. Record remaining payment through Check-out.</p>
    <div className="admin-row" style={{ gap: 12, flexWrap: 'wrap' }}>
      <label>Status <select value={status} disabled={loading} onChange={(e) => { setStatus(e.target.value); setPage(1) }}><option value="">All statuses</option>
        {Object.entries(STATUS_LABELS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
      </select></label>
      <label>Search this page <input placeholder="Guest, room or booking reference" value={search} onChange={(e) => { setSearch(e.target.value); setSelected(null) }} /></label>
      <button className="admin-btn" disabled={loading} onClick={() => setReload((n) => n + 1)}>Refresh</button>
    </div>
    {error && <p role="alert" className="acc-error">{error}</p>}
    {!loading && !error && <p><strong>Visible rows only:</strong> recorded payments {money(totals.paid)} · refunds {money(totals.refunded)} · net retained {money(totals.net)} · outstanding balance {money(totals.balance)}.</p>}
    <p>Pending holds, expired holds and cancelled bookings are excluded from outstanding balance.</p>
    <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Guest / room</th><th>Status</th><th>Booked price</th><th>Recorded payment</th><th>Outstanding</th><th>Action</th></tr></thead>
      <tbody>{visible.map((b) => <tr key={b.id}><td>{b.guest?.name || 'Guest unavailable'} · {b.roomNumber}</td><td>{STATUS_LABELS[b.status]}</td>
        <td>{money(b.totalCents)}</td><td>{money(b.paidCents)}{b.refundedCents > 0 && <small> · Refunded: {money(b.refundedCents)}</small>}</td><td>{money(balanceDue(b))}</td>
        <td><button className="admin-link" onClick={() => setSelected(b)}>Payment summary</button></td></tr>)}
        {!visible.length && <tr><td colSpan="6">{loading ? 'Loading…' : error ? 'Billing unavailable.' : 'No matching bookings on this page.'}</td></tr>}</tbody></table></div>
    <div className="admin-row" style={{ gap: 12, marginTop: 16 }}><button className="admin-btn" disabled={loading || page === 1} onClick={() => setPage((n) => n - 1)}>Previous</button>
      <span>Page {page} · up to 50 bookings</span><button className="admin-btn" disabled={loading || !!error || !more} onClick={() => setPage((n) => n + 1)}>Next</button></div>
    {selected && <section aria-label="Payment summary" style={{ padding: 20, marginTop: 20, border: '1px solid #ddd', borderRadius: 12 }}>
      <h3>Payment summary</h3><p>Booking: {selected.id}<br />Guest: {selected.guest?.name || 'Unavailable'}<br />Room: {selected.roomNumber} · {selected.type}<br />Stay: {selected.checkIn} to {selected.checkOut}</p>
      <p>Booked price: {money(selected.totalCents)}<br />Recorded payments: {money(selected.paidCents)}<br />Refunded: {money(selected.refundedCents || 0)}<br />Outstanding: {money(balanceDue(selected))}</p>
      {paymentEntries(selected).map((p) => <p key={p.reference}><strong>{p.label} · {p.method || 'Method not recorded'}: {money(p.amountCents)}</strong><br />Reference: {p.reference}<br />
        {new Date(p.recordedAt).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })} (Philippine time)</p>)}
      {!paymentEntries(selected).length && <p>No payment records.</p>}
      <p>Booking payment record. No funds were transferred. This is not an official receipt.</p>
      <button className="admin-btn" onClick={download}>Download receipt (.txt)</button>{' '}<button className="admin-btn" onClick={() => setSelected(null)}>Close</button>
    </section>}
  </>
}
