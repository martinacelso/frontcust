import { useState, useEffect, useMemo } from 'react'
import { useAdmin, P, nights } from '../../context/AdminContext'

import { hotelDate, addDays } from '../../utils/hotel'

const DAY_W = 100
const STATUS_COLORS = {
  confirmed: '#e8b13a',
  'checked-in': '#3dbbe0',
  'checked-out': '#9aa0a6',
  cancelled: '#c98a8a',
}
const STATUS_LABELS = {
  confirmed: 'Confirmed',
  'checked-in': 'Arrived',
  'checked-out': 'Checked Out',
  cancelled: 'Cancelled',
}
const ROOM_STATUS_COLORS = {
  available: '#2e7d5b',
  occupied: '#2f6fa8',
  dirty: '#e8b13a',
  maintenance: '#b23b3b',
}
const ROOM_STATUS_LABELS = {
  available: 'Ready',
  occupied: 'Occupied',
  dirty: 'Clean up',
  maintenance: 'Maintenance',
}

export default function Timeline() {
  const { rooms, bookings, by, total, paid } = useAdmin()

  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const [anchor, setAnchor] = useState(() => {
    const d = new Date(hotelDate().slice(0, 7) + '-01T00:00:00Z')
    return d
  })
  const [detail, setDetail] = useState(null)
  const [roomDetail, setRoomDetail] = useState(null)

  const days = useMemo(() => {
    const out = []
    const d = new Date(anchor)
    for (let i = 0; i < 31; i++) {
      out.push({
        iso: d.toISOString().slice(0, 10),
        day: d.getUTCDate(),
        weekend: d.getUTCDay() === 0 || d.getUTCDay() === 6,
      })
      d.setUTCDate(d.getUTCDate() + 1)
    }
    return out
  }, [anchor])

  const rangeStart = days[0].iso
  const rangeEnd = days[days.length - 1].iso

  const bookingsForRoom = (roomId) =>
    bookings.filter(
      (b) =>
        b.room === roomId &&
        b.st !== 'cancelled' &&
        b.out > rangeStart &&
        b.in <= rangeEnd
    )

  const offsetFor = (iso) => {
    const start = new Date(rangeStart)
    const d = new Date(iso)
    return Math.round((d - start) / 864e5) * DAY_W
  }

  const widthFor = (b) => {
    const s = new Date(Math.max(new Date(b.in), new Date(rangeStart)))
    const e = new Date(Math.min(new Date(b.out), new Date(addDays(rangeEnd, 1))))
    const n = Math.max(1, Math.round((e - s) / 864e5))
    return n * DAY_W
  }

  const prevMonth = () => {
    const d = new Date(anchor)
    d.setUTCMonth(d.getUTCMonth() - 1)
    setAnchor(d)
  }
  const nextMonth = () => {
    const d = new Date(anchor)
    d.setUTCMonth(d.getUTCMonth() + 1)
    setAnchor(d)
  }
  const jumpToday = () => {
    const d = new Date(hotelDate().slice(0, 7) + '-01T00:00:00Z')
    setAnchor(d)
  }

  const monthLabel = anchor.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })

  const today = hotelDate(now)
  const todayOffset = days.findIndex((d) => d.iso === today)

  const detailBooking = detail ? by('bookings', detail) : null
  const detailRoom = roomDetail ? rooms.find((r) => r.id === roomDetail) : null

  return (
    <>
      <div className="tl-clock">
        <div className="tl-clock-time">
          {now.toLocaleTimeString('en-US', {
            timeZone: 'Asia/Manila',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })}
        </div>
        <div className="tl-clock-date">
          {now.toLocaleDateString('en-US', {
            timeZone: 'Asia/Manila',
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
        </div>
      </div>

      <div className="tl-toolbar">
        <button className="admin-btn s" onClick={prevMonth}>←</button>
        <div className="tl-month">{monthLabel}</div>
        <button className="admin-btn s" onClick={nextMonth}>→</button>
        <button className="admin-btn" onClick={jumpToday} style={{ marginLeft: 12 }}>
          Today
        </button>
        <div className="tl-legend">
          <span><i style={{ background: STATUS_COLORS.confirmed }} /> Confirmed</span>
          <span><i style={{ background: STATUS_COLORS['checked-in'] }} /> Arrived</span>
          <span><i style={{ background: STATUS_COLORS['checked-out'] }} /> Checked out</span>
        </div>
      </div>

      <div className="tl-wrap">
        <div className="tl-grid">
          <div className="tl-header-row">
            <div className="tl-col-num">Number</div>
            <div className="tl-col-type">Type</div>
            <div className="tl-col-status">Status</div>
            <div className="tl-col-strip" />
            <div className="tl-days-header">
              {days.map((d) => (
                <div
                  key={d.iso}
                  className={`tl-day-head ${d.weekend ? 'tl-weekend' : ''} ${d.iso === today ? 'tl-today' : ''}`}
                >
                  {String(d.day).padStart(2, '0')}
                </div>
              ))}
            </div>
          </div>

          {rooms.map((r) => {
            const rows = bookingsForRoom(r.id)
            return (
              <div className="tl-body-row" key={r.id}>
                <button
                  className="tl-col-num tl-col-btn"
                  onClick={() => setRoomDetail(r.id)}
                >
                  {r.no}
                </button>
                <button
                  className="tl-col-type tl-col-btn"
                  onClick={() => setRoomDetail(r.id)}
                >
                  {r.type}
                </button>
                <button
                  className="tl-col-status tl-col-btn"
                  onClick={() => setRoomDetail(r.id)}
                >
                  <span className={`admin-badge ${r.status}`}>
                    {ROOM_STATUS_LABELS[r.status] || r.status}
                  </span>
                </button>
                <div
                  className="tl-col-strip"
                  style={{ background: ROOM_STATUS_COLORS[r.status] }}
                />

                <div className="tl-days-body">
                  {days.map((d) => (
                    <div
                      key={d.iso}
                      className={`tl-day-cell ${d.weekend ? 'tl-weekend' : ''} ${d.iso === today ? 'tl-today' : ''}`}
                    />
                  ))}

                  {rows.map((b) => {
                    const guest = by('guests', b.g)
                    const status = STATUS_LABELS[b.st] || b.st
                    const totalDue = total(b)
                    const paidAmount = paid(b)
                    const isPaid = paidAmount >= totalDue

                    return (
                      <button
                        key={b.id}
                        className="tl-bar"
                        style={{
                          left: Math.max(0, offsetFor(b.in)),
                          width: widthFor(b),
                          background: STATUS_COLORS[b.st] || '#999',
                        }}
                        onClick={() => setDetail(b.id)}
                        title={`${guest?.name} · #${b.id} · ${b.in} → ${b.out}`}
                      >
                        <div className="tl-bar-line1">
                          <span className="tl-bar-name">{guest?.name || 'Guest'}</span>
                          <span className="tl-bar-status">{status}</span>
                        </div>
                        <div className="tl-bar-line2">
                          <span className="tl-bar-dates">{b.in} → {b.out}</span>
                          <span className="tl-bar-paid">{isPaid ? 'paid' : 'unpaid'}</span>
                        </div>
                      </button>
                    )
                  })}

                  {todayOffset > -1 && (
                    <div
                      className="tl-today-line"
                      style={{ left: todayOffset * DAY_W + DAY_W / 2 }}
                    />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {detailRoom && (
        <div className="acc-modal-overlay" onClick={() => setRoomDetail(null)}>
          <div className="acc-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Room {detailRoom.no}</h3>
            <p className="acc-muted">
              Type: <b>{detailRoom.type}</b>
              <br />
              Status:{' '}
              <span className={`admin-badge ${detailRoom.status}`}>
                {ROOM_STATUS_LABELS[detailRoom.status] || detailRoom.status}
              </span>
              {detailRoom.hk && (
                <>
                  <br />
                  Assigned cleaner: <b>{detailRoom.hk}</b>
                </>
              )}
            </p>

            <h4 className="admin-h4">Upcoming bookings</h4>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Ref</th>
                    <th>Guest</th>
                    <th>Dates</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {bookingsForRoom(detailRoom.id).length === 0 ? (
                    <tr>
                      <td colSpan="4" className="admin-muted">
                        No bookings in the visible range.
                      </td>
                    </tr>
                  ) : (
                    bookingsForRoom(detailRoom.id).map((b) => (
                      <tr key={b.id}>
                        <td>#{b.id}</td>
                        <td>{by('guests', b.g)?.name}</td>
                        <td>{b.in} → {b.out}</td>
                        <td>
                          <span className={`admin-badge ${b.st}`}>{b.st}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="acc-modal-actions">
              <button className="btn" onClick={() => setRoomDetail(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {detailBooking && (
        <div className="acc-modal-overlay" onClick={() => setDetail(null)}>
          <div className="acc-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Booking #{detailBooking.id}</h3>
            <p className="acc-muted">
              {by('guests', detailBooking.g)?.name}
              <br />
              {detailBooking.type} · Room {by('rooms', detailBooking.room)?.no || '—'}
              <br />
              {detailBooking.in} → {detailBooking.out} ·{' '}
              {nights(detailBooking.in, detailBooking.out)} night(s)
            </p>

            <p>
              Status:{' '}
              <span className={`admin-badge ${detailBooking.st}`}>
                {detailBooking.st}
              </span>
            </p>

            <p>
              Room total:{' '}
              <b>{P(nights(detailBooking.in, detailBooking.out) * detailBooking.rate)}</b>
              <br />
              Bill total: <b>{P(total(detailBooking))}</b>
            </p>

            <div className="acc-modal-actions">
              <button className="btn" onClick={() => setDetail(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}