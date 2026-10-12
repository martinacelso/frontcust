import { useState } from 'react'
import { useAdmin, T, sd, P } from '../../context/AdminContext'
import Timeline from './Timeline'
import QuickCheckIn from './QuickCheckIn'

export default function Dashboard() {
  const { user, rooms, bookings, paid } = useAdmin()
  const [tab, setTab] = useState('timeline')

  const today = T()
  const totalRooms = rooms.length
  const availableRooms = rooms.filter((r) => r.status === 'available').length
  const occupiedRooms = rooms.filter((r) => r.status === 'occupied').length

  const active = bookings.filter((b) => b.st !== 'cancelled')
  const arrivalsToday = active.filter((b) => b.in === today).length
  const departuresToday = active.filter(
    (b) => b.out === today && b.st !== 'confirmed'
  ).length
  const totalBookings = active.length
  const revenue = active.reduce((s, b) => s + paid(b), 0)

  const days = []
  for (let i = -6; i <= 0; i++) {
    const d = sd(i)
    let dayTotal = 0
    bookings.forEach((b) => {
      b.pays.forEach((p) => {
        if (p.d === d) dayTotal += p.a
      })
    })
    days.push({ label: d.slice(5), value: dayTotal })
  }
  const max = Math.max(...days.map((d) => d.value), 1)

  const stats = [
    [totalRooms, 'Total rooms'],
    [availableRooms, 'Available rooms'],
    [occupiedRooms, 'Occupied rooms'],
    [arrivalsToday, "Today's check-ins"],
    [departuresToday, "Today's check-outs"],
    [totalBookings, 'Total bookings'],
    [P(revenue), 'Revenue (collected)'],
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
      <div className="admin-tabs" style={{ marginTop: 22 }}>
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
      </div>

      {tab === 'timeline' && <Timeline />}

      {tab === 'quick' && (
        <div className="admin-card">
          <QuickCheckIn />
        </div>
      )}

      {/* Revenue chart */}
      <h2 className="admin-h2">Revenue – last 7 days</h2>
      <div className="admin-card">
        <div className="admin-bars">
          {days.map((d) => (
            <div className="admin-bar" key={d.label}>
              <i style={{ height: Math.round((d.value / max) * 90) + 'px' }} />
              <span className="admin-bar-value">{P(d.value)}</span>
              <span className="admin-bar-label">{d.label}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}