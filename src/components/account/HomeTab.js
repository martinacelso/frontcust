import { useAccount, P } from '../../context/AccountContext'
import { STATUS_LABELS } from '../../utils/bookingApi'
export default function HomeTab({ onNavigate }) {
  const { user, myBookings, bookingLoading, bookingError, refreshBookings } = useAccount()
  const mine = myBookings()
  const confirmed = mine.filter((b) => ['confirmed', 'checked-in'].includes(b.st))
  const pending = mine.filter((b) => b.st === 'pending-payment')
  const next = [...confirmed].sort((a, b) => a.in.localeCompare(b.in))[0]
  return <>
    <div className="acc-hero"><div className="acc-hero-content"><h2>Welcome back, {user?.name?.split(' ')[0]}</h2>
      <p>Your stays at Twin Lakes Hotel.</p><div className="acc-hero-actions"><button className="btn acc-hero-btn" onClick={() => onNavigate('book')}>Book a stay</button>
        <button className="btn acc-hero-btn ghost" onClick={() => onNavigate('trips')}>View bookings</button></div></div></div>
    {bookingLoading && <p role="status">Loading your bookings…</p>}
    {bookingError && <p role="alert">{bookingError} <button className="acc-link" onClick={refreshBookings}>Retry</button></p>}
    {!bookingLoading && !bookingError && <>
      <div className="acc-stats"><div className="acc-stat-card"><span>Confirmed / in-house</span><b>{confirmed.length}</b></div>
        <div className="acc-stat-card"><span>Awaiting payment</span><b>{pending.length}</b></div><div className="acc-stat-card"><span>Saved bookings</span><b>{mine.length}</b></div></div>
      <h2 className="acc-section-title">Next stay</h2>
      {next ? <div className="acc-card"><h3>{next.type}</h3><p>{next.in} → {next.out}</p><p>{STATUS_LABELS[next.st]} · {P(next.total)}</p>
        <button className="btn" onClick={() => onNavigate('trips')}>View details</button></div> : <div className="acc-empty">No confirmed stays yet.</div>}
    </>}
  </>
}
