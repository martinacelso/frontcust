import { stayError } from '../../utils/validation'
import { checkInError, checkInBookingError } from '../../utils/actionValidation'
import { useState } from 'react'
import { useAdmin, P } from '../../context/AdminContext'

export default function CheckInModule() {
  const {
    bookings, rooms, by, balanceDue, free, getRoomType, checkIn, checkOut: commitCheckOut,
  } = useAdmin()

  const { can } = useAdmin()

  const [checkInModal, setCheckInModal] = useState(null)

  const arrivals = bookings.filter((b) => b.st === 'confirmed')
  const inHouse = bookings.filter((b) => b.st === 'checked-in')

  function openCheckIn(bookingId) {
    if (!can('chk')) return window.alert('You do not have permission to check in guests.')
    setCheckInModal({ bookingId, roomId: 0 })
  }

  function confirmCheckIn() {
    if (!can('chk')) return window.alert('You do not have permission to check in guests.')
    if (!checkInModal) return
    const b = by('bookings', checkInModal.bookingId)
    const r = by('rooms', checkInModal.roomId)
    const error = checkInError(b, r, bookings)
    if (error) return window.alert(error)
    if (!by('guests', b.g)) return window.alert('The guest record is missing.')
    if (!window.confirm(`Check in reservation #${b.id} to room ${r.no}?`)) return

    const result = checkIn(b.id, r.id)
    if (result.error) return window.alert(result.error)
    setCheckInModal(null)
  }

  function checkOut(bookingId) {
    if (!can('chk')) return window.alert('You do not have permission to check out guests.')
    const b = by('bookings', bookingId)
    if (!b) return window.alert('This reservation no longer exists.')
    if (!window.confirm(`Check out reservation #${b.id} and mark its room for cleaning?`)) return
    const result = commitCheckOut(b.id)
    if (result.error) window.alert(result.error)
  }

  const bookingBeingCheckedIn = checkInModal
    ? by('bookings', checkInModal.bookingId)
    : null

  const checkInBlocked = bookingBeingCheckedIn ? checkInBookingError(bookingBeingCheckedIn) || stayError({ ...bookingBeingCheckedIn, adults: bookingBeingCheckedIn.adults ?? bookingBeingCheckedIn.gCount ?? 2, children: bookingBeingCheckedIn.children ?? 0 }, { allowPast: true, capacity: getRoomType(bookingBeingCheckedIn.type)?.s }) : ''

  const assignableRooms = bookingBeingCheckedIn && !checkInBlocked
    ? rooms.filter(
        (r) =>
          !checkInError(bookingBeingCheckedIn, r, bookings) &&
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
                  <td>{P(balanceDue(b))}</td>
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

            {checkInBlocked ? (<p className="acc-error" role="alert">{checkInBlocked}</p>) : assignableRooms.length === 0 ? (
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
              {can('chk') && by('guests', bookingBeingCheckedIn.g) &&
                assignableRooms.some((r) => r.id === checkInModal.roomId) && (
                <button className="btn" onClick={confirmCheckIn}>
                  Check in guest
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}