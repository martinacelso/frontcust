import { useState } from 'react'
import { useAdmin, sd, P } from '../../context/AdminContext'

import { hotelDate, addDays, stayNights } from '../../utils/hotel'
import { validDate } from '../../utils/validation'
import { paymentLedger, netReceipts, occupiedRooms } from '../../utils/reporting'

const TABS = [
  ['bk', 'Bookings'],
  ['oc', 'Occupancy'],
  ['rv', 'Revenue'],
  ['gs', 'Guests'],
  ['io', 'Check-in/out'],
]

export default function ReportsModule() {
  const { bookings, rooms, guests, by, total } = useAdmin()

  const [tab, setTab] = useState('bk')
  const [from, setFrom] = useState(sd(-30))
  const [to, setTo] = useState(sd(7))

  const rangeError = !validDate(from) || !validDate(to) || from > to
    ? 'Choose a valid date range, with From on or before To.'
    : tab === 'oc' && stayNights(from, to) >= 90 ? 'Select at most 90 days for the occupancy report.' : ''
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
    for (let day = from; day <= to; day = addDays(day, 1)) {
      const occupied = occupiedRooms(bookings, day)
      rows.push([day, occupied, rooms.length, rooms.length ? Math.round(occupied / rooms.length * 100) + '%' : '—'])
    }
    return {
      headers: ['Date', 'Occupied', 'Rooms', 'Occupancy'],
      rows,
    }
  }

  // ---- Revenue report ----
  function revenueReport() {
    const rows = paymentLedger(bookings).filter((p) => inRange(p.d)).map((p) => [
      p.d, '#' + p.bookingId, by('guests', p.guestId)?.name || '—', p.kind + ' · ' + p.m, P(p.amount),
    ])
    rows.push([{ strong: 'Net receipts' }, '', '', '', { strong: P(netReceipts(bookings, from, to)) }])
    return { headers: ['Date', 'Ref', 'Guest', 'Movement / method', 'Amount'], rows }
  }

  // ---- Guests report ----
  function guestsReport() {
    const rows = guests.map((g) => {
      const gbs = bookings.filter((b) => b.g === g.id)
      return [g.name, gbs.filter((b) => inRange(b.in) && b.st !== 'cancelled').length, P(netReceipts(gbs, from, to))]
    })
    return {
      headers: ['Guest', 'Reservations arriving in range', 'Net receipts in range'],
      rows,
    }
  }

  // ---- Check-in/out report ----
  function ioReport() {
    const rows = []
    bookings.forEach((b) => {
      if (b.room && (b.st === 'checked-in' || b.st === 'checked-out')) {
        if (b.checkedInAt && inRange(hotelDate(b.checkedInAt))) {
          rows.push([
            hotelDate(b.checkedInAt),
            'Check-in',
            by('guests', b.g)?.name || '—',
            by('rooms', b.room)?.no || '—',
          ])
        }
        if (b.checkedOutAt && inRange(hotelDate(b.checkedOutAt))) {
          rows.push([
            hotelDate(b.checkedOutAt),
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

  const data = rangeError ? { headers: [], rows: [] } : {
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

      {rangeError && <p className="acc-error" role="alert">{rangeError}</p>}
      {tab === 'oc' && <p className="admin-muted">Actual overnight occupancy from recorded check-in/out dates, using the current room count. Future nights are not counted as occupied.</p>}
      {tab === 'rv' && <p className="admin-muted">Payments less recorded refunds, including cancelled reservations. These totals reflect recorded payment entries less refunds; they do not verify money received or represent earned revenue.</p>}
      {!rangeError && <div className="admin-table-wrap">
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
      </div>}
    </>
  )
}