import { useState } from 'react'
import { useAdmin, sd, P } from '../../context/AdminContext'

const TABS = [
  ['bk', 'Bookings'],
  ['oc', 'Occupancy'],
  ['rv', 'Revenue'],
  ['gs', 'Guests'],
  ['io', 'Check-in/out'],
]

export default function ReportsModule() {
  const { bookings, rooms, guests, by, total, paid } = useAdmin()

  const [tab, setTab] = useState('bk')
  const [from, setFrom] = useState(sd(-30))
  const [to, setTo] = useState(sd(7))

  const inRange = (d) => d >= from && d <= to

  // ---- Bookings report ----
  function bookingsReport() {
    const rows = bookings
      .filter((b) => inRange(b.in))
      .map((b) => [
        '#' + b.id,
        by('guests', b.g)?.name || '—',
        `${b.in} → ${b.out}`,
        { badge: b.st },
        P(total(b)),
      ])
    return {
      headers: ['Ref', 'Guest', 'Dates', 'Status', 'Total'],
      rows,
    }
  }

  // ---- Occupancy report ----
  function occupancyReport() {
    const rows = []
    // Walk day by day from `from` to `to` (max 90 days)
    const start = new Date(from)
    const end = new Date(to)
    let d = new Date(start)
    let guard = 0
    while (d <= end && guard < 90) {
      const iso = d.toISOString().slice(0, 10)
      const occupied = bookings.filter(
        (b) =>
          (b.st === 'checked-in' || b.st === 'checked-out') &&
          b.in <= iso &&
          b.out > iso
      ).length
      rows.push([
        iso,
        occupied,
        rooms.length,
        Math.round((occupied / rooms.length) * 100) + '%',
      ])
      d.setDate(d.getDate() + 1)
      guard++
    }
    return {
      headers: ['Date', 'Occupied', 'Rooms', 'Occupancy'],
      rows,
    }
  }

  // ---- Revenue report ----
  function revenueReport() {
    const rows = []
    let grand = 0
    bookings.forEach((b) => {
      b.pays.forEach((p) => {
        if (inRange(p.d)) {
          grand += p.a
          rows.push([
            p.d,
            '#' + b.id,
            by('guests', b.g)?.name || '—',
            p.m,
            P(p.a),
          ])
        }
      })
    })
    rows.push([
      { strong: 'Total' },
      '',
      '',
      '',
      { strong: P(grand) },
    ])
    return {
      headers: ['Date', 'Ref', 'Guest', 'Method', 'Amount'],
      rows,
    }
  }

  // ---- Guests report ----
  function guestsReport() {
    const rows = guests.map((g) => {
      const gbs = bookings.filter((b) => b.g === g.id && b.st !== 'cancelled')
      const totalPaid = gbs.reduce((s, b) => s + paid(b), 0)
      return [g.name, gbs.length, P(totalPaid)]
    })
    return {
      headers: ['Guest', 'Stays', 'Total paid'],
      rows,
    }
  }

  // ---- Check-in/out report ----
  function ioReport() {
    const rows = []
    bookings.forEach((b) => {
      if (b.room && (b.st === 'checked-in' || b.st === 'checked-out')) {
        if (inRange(b.in)) {
          rows.push([
            b.in,
            'Check-in',
            by('guests', b.g)?.name || '—',
            by('rooms', b.room)?.no || '—',
          ])
        }
        if (b.st === 'checked-out' && inRange(b.out)) {
          rows.push([
            b.out,
            'Check-out',
            by('guests', b.g)?.name || '—',
            by('rooms', b.room)?.no || '—',
          ])
        }
      }
    })
    rows.sort((a, b) => (a[0] < b[0] ? -1 : 1))
    return {
      headers: ['Date', 'Event', 'Guest', 'Room'],
      rows,
    }
  }

  const data = {
    bk: bookingsReport,
    oc: occupancyReport,
    rv: revenueReport,
    gs: guestsReport,
    io: ioReport,
  }[tab]()

  function renderCell(cell) {
    if (cell && typeof cell === 'object') {
      if (cell.badge) {
        return <span className={`admin-badge ${cell.badge}`}>{cell.badge}</span>
      }
      if (cell.strong) {
        return <b>{cell.strong}</b>
      }
      return ''
    }
    return cell
  }

  return (
    <>
      <div className="admin-tabs">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            className={`admin-btn ${id === tab ? '' : 's'}`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="admin-card">
        <div className="admin-row">
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
        </div>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              {data.headers.map((h) => <th key={h}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {data.rows.length === 0 ? (
              <tr>
                <td colSpan={data.headers.length} className="admin-muted">
                  No records in this range.
                </td>
              </tr>
            ) : (
              data.rows.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td key={j}>{renderCell(cell)}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}