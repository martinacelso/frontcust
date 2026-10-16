import { useState } from 'react'
import { useAdmin, T, sd, P } from '../../context/AdminContext'
import { netReceipts } from '../../utils/reporting'
import Timeline from './Timeline'
import QuickCheckIn from './QuickCheckIn'

export default function Dashboard() {
  const { rooms, bookings, free, can } = useAdmin()
  const [tab, setTab] = useState('timeline')

  const today = T()
  const totalRooms = rooms.length
  const availableRooms = rooms.filter((r) => r.status === 'available' && free(r, today, sd(1))).length
  const occupiedRooms = rooms.filter((r) => r.status === 'occupied').length

  const active = bookings.filter((b) => b.st !== 'cancelled')
  const arrivalsToday = active.filter((b) => b.in === today).length
  const departuresToday = active.filter(
    (b) => b.out === today && b.st !== 'confirmed'
  ).length
  const totalBookings = active.length
  const revenue = netReceipts(bookings)

  const days = []
  for (let i = -6; i <= 0; i++) {
    const d = sd(i)
    const dayTotal = netReceipts(bookings, d, d)
    days.push({ label: d.slice(5), value: dayTotal })
  }
  const max = Math.max(...days.map((d) => Math.abs(d.value)), 1)

  const stats = [
    [totalRooms, 'Total rooms'],
    [availableRooms, 'Available rooms'],
    [occupiedRooms, 'Occupied rooms'],
    [arrivalsToday, "Scheduled arrivals today"],
    [departuresToday, "Scheduled departures today"],
    [totalBookings, 'Total bookings'],
    ...(can('bill') || can('rep') ? [[P(revenue), 'Net receipts']] : []),
  ]

  return (
    <>
      {/* Stats strip */}
      <div className="admin-stats">
        {stats.map(([value, label]) => (
          <div className="admin-stat" key={label}>
            <b>{value}</b>
            <span>{label}</span>
          </div>
        ))}
      </div>

      {/* Timeline + quick check-in/out tabs */}
      {(can('book') || can('chk')) && <div className="admin-tabs" style={{ marginTop: 22 }}>
        <button
          className={`admin-btn ${tab === 'timeline' ? '' : 's'}`}
          onClick={() => setTab('timeline')}
        >
          Booking Calendar
        </button>
        <button
          className={`admin-btn ${tab === 'quick' ? '' : 's'}`}
          onClick={() => setTab('quick')}
        >
          Quick Check-in / out
        </button>
      </div>}

      {can('book') && tab === 'timeline' && <Timeline />}

      {can('chk') && tab === 'quick' && (
        <div className="admin-card">
          <QuickCheckIn />
        </div>
      )}

      {/* Revenue chart */}
      {(can('bill') || can('rep')) && <>
      <h2 className="admin-h2">Net receipts – last 7 days</h2>
      <div className="admin-card">
        <div className="admin-bars">
          {days.map((d) => (
            <div className="admin-bar" key={d.label}>
              <i style={{ height: Math.round((Math.abs(d.value) / max) * 90) + 'px', background: d.value < 0 ? '#b23b3b' : undefined }} />
              <span className="admin-bar-value">{P(d.value)}</span>
              <span className="admin-bar-label">{d.label}</span>
            </div>
          ))}
        </div>
      </div>
      </>}
    </>
  )
}