import { useEffect, useState } from 'react'
import { useAdmin } from '../../context/AdminContext'
import { bookingRequest } from '../../utils/bookingApi'
import QuickCheckIn from './QuickCheckIn'

const money = (n) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(n / 100)
export default function Dashboard() {
  const { sessionUser } = useAdmin()
  if (!sessionUser || !['admin', 'front-desk', 'housekeeping'].includes(sessionUser.role)) return <p role="alert">Staff sign-in required.</p>
  return <Overview key={sessionUser.id} housekeeping={sessionUser.role === 'housekeeping'} />
}
function Overview({ housekeeping }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  const [quick, setQuick] = useState(false)
  useEffect(() => {
    let current = true
    setLoading(true); setError(''); setData(null)
    bookingRequest('/dashboard').then((result) => {
      if (!current) return
      if (result.error) setError(result.error)
      else setData(result)
      setLoading(false)
    })
    return () => { current = false }
  }, [reload])
  const stats = data ? [
    [data.rooms.total, 'Total rooms'], [data.rooms.clean, 'Clean rooms'],
    [data.rooms.occupied, 'Occupied rooms'], [data.rooms.dirty, 'Rooms needing cleaning'],
    [data.rooms.maintenance, 'Under maintenance'],
    ...(!housekeeping ? [[data.rooms.availableTonight, 'Clean and unreserved tonight'],
      [data.arrivals, 'Still expected today'], [data.departures, 'Check-outs due today'],
      [data.overdue, 'Overdue check-outs'], [data.bookings, 'All booking records'],
      [money(data.simulatedPaymentsCents), 'Net payments · all time']] : []),
  ] : []
  const max = Math.max(1, ...(data?.days || []).map((d) => Math.abs(d.cents)))
  return <>
    <button className="admin-btn" disabled={loading} onClick={() => setReload((n) => n + 1)}>{loading ? 'Loading…' : 'Refresh dashboard'}</button>
    {error && <p role="alert" className="acc-error">{error}</p>}
    {data && <>
      <p>As of {new Date(data.updatedAt).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })} (Philippine time). Refresh after changes.</p>
      {/* Stats strip */}
      <div className="admin-stats">{stats.map(([value, label]) => <div className="admin-stat" key={label}><b>{value}</b><span>{label}</span></div>)}</div>
      {!housekeeping && <p>All booking records includes cancelled and expired holds. Clean rooms may already be reserved.</p>}
      {/* Revenue chart */}
      {!housekeeping && <>
        <h2 className="admin-h2">Net payments — last 7 days</h2>
        <p>Deposits and balance payments minus refunds, by recording date. Test transactions; no real money collected.</p>
        <div className="admin-card"><div className="admin-bars">{data.days.map((d) => <div className="admin-bar" key={d.date}>
          <i aria-hidden="true" style={{ height: Math.round(Math.abs(d.cents) / max * 90) + 'px', background: d.cents < 0 ? '#b23b3b' : undefined }} />
          <span className="admin-bar-value">{money(d.cents)}</span><span className="admin-bar-label">{d.date}</span>
        </div>)}</div></div>
      </>}
    </>}
    {/* Timeline + quick check-in/out tabs */}
    {!housekeeping && <div style={{ marginTop: 22 }}>
      <button className="admin-btn" onClick={() => setQuick((value) => !value)}>{quick ? 'Hide quick check-in / out' : 'Open quick check-in / out'}</button>
      {quick && <div className="admin-card"><QuickCheckIn /></div>}
    </div>}
  </>
}
