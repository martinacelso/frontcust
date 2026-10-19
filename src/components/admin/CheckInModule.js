import WalkIn from './WalkIn'
import BankDetailsForm from '../account/BankDetailsForm'
import { isBankDetailsValid } from '../../utils/bankDetails'
import { useEffect, useRef, useState } from 'react'
import { useAdmin } from '../../context/AdminContext'
import { bookingRequest } from '../../utils/bookingApi'

const money = (n) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(n / 100)
export default function CheckInModule() {
  const { sessionUser } = useAdmin()
  if (!sessionUser || !['admin', 'front-desk'].includes(sessionUser.role)) return <p role="alert">Staff sign-in required.</p>
  return <Desk key={sessionUser.id} />
}

function Desk() {
  const [status, setStatus] = useState('confirmed')
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState([])
  const [more, setMore] = useState(false)
  const [reload, setReload] = useState(0)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [message, setMessage] = useState('')
  const [selected, setSelected] = useState(null)
  const [simulate, setSimulate] = useState(false)
  const [bankDetails, setBankDetails] = useState({ bankName: '', accountHolder: '', accountNumber: '' })
  const [enabled, setEnabled] = useState(false)
  const lock = useRef(false)
  const alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  useEffect(() => {
    let current = true
    setLoading(true); setRows([]); setError('')
    Promise.all([bookingRequest(`/bookings/staff-list?status=${status}&page=${page}`), bookingRequest('/bookings/options')]).then(([result, options]) => {
      if (!current) return
      setEnabled(options.demoPaymentsEnabled === true)
      if (result.error) setError(result.error)
      else { setRows(result.bookings); setMore(result.hasMore) }
      setLoading(false)
    })
    return () => { current = false }
  }, [status, page, reload])
  async function submit() {
    if (lock.current || !selected) return
    lock.current = true; setBusy(true); setActionError('')
    try {
      const checkout = selected.status === 'checked-in'
      const result = await bookingRequest(`/bookings/${selected.id}/${checkout ? 'check-out' : 'check-in'}`, {
        version: selected.version, simulateBalance: simulate, method: 'Bank Transfer', bankDetails,
      })
      if (!alive.current) return
      if (result.error) setActionError(result.error + ' Close and refresh before retrying.')
      else {
        setSelected(null); setReload((n) => n + 1)
        setMessage(checkout ? 'Checked out. Room marked dirty.' + (result.booking.simulatedSettlement ? ` Payment reference: ${result.booking.simulatedSettlement.reference}` : '') : 'Checked in. Room marked occupied.')
      }
    } finally { lock.current = false; if (alive.current) setBusy(false) }
  }
  const balance = selected ? Math.max(0, selected.totalCents - selected.paidCents) : 0
  const checkout = selected?.status === 'checked-in'
  return <>
    <h2 className="admin-h2">Check-in and check-out</h2>
    <WalkIn onComplete={() => { setStatus('checked-in'); setPage(1); setReload((n) => n + 1) }} />
    <div className="admin-row" style={{ gap: 12 }}>
      <label>View <select value={status} disabled={loading || !!selected} onChange={(e) => { setStatus(e.target.value); setPage(1); setMessage('') }}>
        <option value="confirmed">Confirmed reservations</option><option value="checked-in">In-house guests</option><option value="checked-out">Checked out</option>
      </select></label>
      <button className="admin-btn" disabled={loading || !!selected} onClick={() => setReload((n) => n + 1)}>Refresh</button>
    </div>
    <p>Check-in uses the assigned room. Housekeeping must mark it clean first. Arrival dates follow Philippine time.</p>
    {error && <p role="alert" className="acc-error">{error}</p>}
    {message && <p role="status" className="acc-saved">{message}</p>}
    <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Guest</th><th>Room</th><th>Dates</th><th>Balance</th><th>Action</th></tr></thead>
      <tbody>{rows.map((b) => <tr key={b.id}><td>{b.guest?.name || 'Guest unavailable'}</td><td>{b.roomNumber} · {b.type}</td>
        <td>{b.checkIn} to {b.checkOut}</td><td>{money(Math.max(0, b.totalCents - b.paidCents))}</td>
        <td>{status !== 'checked-out' ? <button className="admin-link" disabled={!!selected || loading} onClick={() => { setSelected(b); setBankDetails({ bankName: '', accountHolder: '', accountNumber: '' }); setSimulate(false); setActionError(''); setMessage('') }}>{status === 'confirmed' ? 'Check in' : 'Check out'}</button> : b.simulatedSettlement ? `Payment reference: ${b.simulatedSettlement.reference}` : 'Completed'}</td></tr>)}
        {!rows.length && <tr><td colSpan="5">{loading ? 'Loading…' : error ? 'Records unavailable.' : 'No reservations in this view.'}</td></tr>}</tbody></table></div>
    <div className="admin-row" style={{ gap: 12, marginTop: 16 }}>
      <button className="admin-btn" disabled={loading || !!selected || page === 1} onClick={() => setPage((n) => n - 1)}>Previous</button>
      <span>Page {page}</span><button className="admin-btn" disabled={loading || !!selected || !more || !!error} onClick={() => setPage((n) => n + 1)}>Next</button>
    </div>
    {selected && <section aria-label="Confirm guest transition" style={{ padding: 20, marginTop: 20, border: '1px solid #ddd', borderRadius: 12 }}>
      <h3>Confirm {checkout ? 'check-out' : 'check-in'}</h3>
      <p>{selected.guest?.name || 'Guest unavailable'} · Room {selected.roomNumber}<br />Reference: {selected.id}</p>
      <p>{checkout ? 'The room will be marked dirty for cleaning. Early departure keeps the full booked price.' : 'The assigned room will be marked occupied. Check-in is allowed during the booked stay, before departure day.'}</p>
      {checkout && balance > 0 && <>
        <p>Outstanding balance: {money(balance)}. No real money will be collected.</p>
        {enabled ? <>
          <BankDetailsForm value={bankDetails} onChange={(value) => { setBankDetails(value); setSimulate(false); setActionError('') }} disabled={busy} />
          <label><input type="checkbox" checked={simulate} disabled={busy} onChange={(e) => setSimulate(e.target.checked)} /> I confirm these bank details for the demo balance payment. No money is transferred.</label>
        </> : <p>Demo payments are disabled. Set DEMO_PAYMENTS=true in server/.env to enable simulated checkout.</p>}
      </>}
      {actionError && <p role="alert" className="acc-error">{actionError}</p>}
      <div style={{ marginTop: 12 }}><button className="admin-btn" disabled={busy || !!actionError || (checkout && balance > 0 && (!enabled || !simulate || !isBankDetailsValid(bankDetails)))} onClick={submit}>{busy ? 'Saving…' : 'Confirm'}</button>{' '}
        <button className="admin-btn" disabled={busy} onClick={() => setSelected(null)}>Close</button></div>
    </section>}
  </>
}
