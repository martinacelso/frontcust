import { useState } from 'react'
import { useAdmin, P } from '../../context/AdminContext'

export default function CheckInModule() {
  const {
    bookings, rooms, types, setBookings, setRooms, by, total, paid, free, logAction,
  } = useAdmin()

  const [checkInModal, setCheckInModal] = useState(null)

  const arrivals = bookings.filter((b) => b.st === 'confirmed')
  const inHouse = bookings.filter((b) => b.st === 'checked-in')

  function rateOf(typeName) {
    return (types.filter((t) => t.n === typeName)[0] || { r: 0 }).r
  }

  function openCheckIn(bookingId) {
    setCheckInModal({ bookingId, roomId: 0 })
  }

  function confirmCheckIn() {
    const b = by('bookings', checkInModal.bookingId)
    const r = by('rooms', checkInModal.roomId)
    if (!b || !r) return

    logAction(
      'Checked in',
      `Booking #${b.id}`,
      `${by('guests', b.g)?.name} → Room ${r.no}`
    )

    setBookings((prev) =>
      prev.map((x) =>
        x.id === b.id
          ? { ...x, room: r.id, type: r.type, rate: rateOf(r.type), st: 'checked-in' }
          : x
      )
    )
    setRooms((prev) =>
      prev.map((x) => (x.id === r.id ? { ...x, status: 'occupied' } : x))
    )
    setCheckInModal(null)
  }

  function checkOut(bookingId) {
    const b = by('bookings', bookingId)
    if (!b) return
    const balance = total(b) - paid(b)
    if (balance > 0) {
      window.alert(`Outstanding balance of ${P(balance)}. Record payment first.`)
      return
    }

    logAction('Checked out', `Booking #${b.id}`, `Room ${by('rooms', b.room)?.no || '—'}`)

    setBookings((prev) =>
      prev.map((x) => (x.id === b.id ? { ...x, st: 'checked-out' } : x))
    )
    if (b.room) {
      setRooms((prev) =>
        prev.map((x) => (x.id === b.room ? { ...x, status: 'dirty' } : x))
      )
    }
  }

  const bookingBeingCheckedIn = checkInModal
    ? by('bookings', checkInModal.bookingId)
    : null

  const assignableRooms = bookingBeingCheckedIn
    ? rooms.filter(
        (r) =>
          r.status === 'available' &&
          free(
            r,
            bookingBeingCheckedIn.in,
            bookingBeingCheckedIn.out,
            bookingBeingCheckedIn.id
          )
      )
    : []

  return (
    <>
      <h2 className="admin-h2">Arrivals (confirmed)</h2>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Ref</th>
              <th>Guest</th>
              <th>Type</th>
              <th>Dates</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {arrivals.length === 0 ? (
              <tr>
                <td colSpan="5" className="admin-muted">No arrivals today.</td>
              </tr>
            ) : (
              arrivals.map((b) => (
                <tr key={b.id}>
                  <td>#{b.id}</td>
                  <td>{by('guests', b.g)?.name}</td>
                  <td>{b.type}</td>
                  <td>{b.in} → {b.out}</td>
                  <td>
                    <button className="admin-link" onClick={() => openCheckIn(b.id)}>
                      Confirm &amp; check in
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <h2 className="admin-h2">In-house</h2>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Ref</th>
              <th>Guest</th>
              <th>Room</th>
              <th>Out</th>
              <th>Balance</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {inHouse.length === 0 ? (
              <tr>
                <td colSpan="6" className="admin-muted">No guests in-house.</td>
              </tr>
            ) : (
              inHouse.map((b) => (
                <tr key={b.id}>
                  <td>#{b.id}</td>
                  <td>{by('guests', b.g)?.name}</td>
                  <td>{by('rooms', b.room)?.no || '—'}</td>
                  <td>{b.out}</td>
                  <td>{P(total(b) - paid(b))}</td>
                  <td>
                    <button className="admin-link" onClick={() => checkOut(b.id)}>
                      Check out
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {checkInModal && bookingBeingCheckedIn && (
        <div className="acc-modal-overlay" onClick={() => setCheckInModal(null)}>
          <div className="acc-modal" onClick={(e) => e.stopPropagation()}>
            <h3>
              Check in #{bookingBeingCheckedIn.id} –{' '}
              {by('guests', bookingBeingCheckedIn.g)?.name}
            </h3>

            <p className="acc-muted">
              Reserved: <b>{bookingBeingCheckedIn.type}</b>, {bookingBeingCheckedIn.in} →{' '}
              {bookingBeingCheckedIn.out}
            </p>

            {assignableRooms.length === 0 ? (
              <p className="acc-error">
                No clean, available rooms for these dates.
              </p>
            ) : (
              <>
                <label>Assign room</label>
                <select
                  value={checkInModal.roomId}
                  onChange={(e) =>
                    setCheckInModal({ ...checkInModal, roomId: +e.target.value })
                  }
                >
                  <option value={0}>— choose —</option>
                  {assignableRooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.no} – {r.type}
                    </option>
                  ))}
                </select>
              </>
            )}

            <div className="acc-modal-actions">
              <button
                className="btn ghost-dark"
                onClick={() => setCheckInModal(null)}
              >
                Cancel
              </button>
              <button
                className="btn"
                onClick={confirmCheckIn}
                disabled={!checkInModal.roomId}
              >
                Check in guest
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}