import { stayError } from '../../utils/validation'
import { checkInError, checkInBookingError } from '../../utils/actionValidation'
import { useState } from 'react'
import { useAdmin, T, P } from '../../context/AdminContext'

export default function QuickCheckIn() {
  const {
    bookings, rooms,
    by, balanceDue, free, getRoomType, checkIn, checkOut: commitCheckOut,
  } = useAdmin()

  const { can } = useAdmin()

  const [checkInModal, setCheckInModal] = useState(null) // { bookingId, roomId }
  const [search, setSearch] = useState('')

  const today = T()

  // Arrivals: confirmed bookings with check-in date today or earlier
  const arrivals = bookings.filter(
    (b) => b.st === 'confirmed' && b.in <= today
  )

  // In-house: currently checked-in
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

  // ---------- Modal data ----------
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

  const filterFn = (b) => {
    if (!search) return true
    const guest = by('guests', b.g)
    const hay = (guest?.name || '') + ' #' + b.id + ' ' + (b.type || '')
    return hay.toLowerCase().includes(search.toLowerCase())
  }

  const arrivalsFiltered = arrivals.filter(filterFn)
  const inHouseFiltered = inHouse.filter(filterFn)

  return (
    <>
      {/* Search */}
      <div className="admin-row" style={{ marginBottom: 14 }}>
        <div>
          <input
            placeholder="Search guest name or booking ref…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="quick-grid">
        {/* ---- Arrivals ---- */}
        <div>
          <h3 className="quick-h3">
            Arrivals · <span className="quick-count">{arrivalsFiltered.length}</span>
          </h3>
          {arrivalsFiltered.length === 0 ? (
            <div className="quick-empty">No arrivals pending.</div>
          ) : (
            arrivalsFiltered.map((b) => {
              const guest = by('guests', b.g)
              return (
                <div className="quick-card" key={b.id}>
                  <div>
                    <div className="quick-name">{guest?.name || 'Guest'}</div>
                    <div className="quick-meta">
                      #{b.id} · {b.type} · {b.in} → {b.out}
                    </div>
                  </div>
                  <button
                    className="admin-btn"
                    onClick={() => openCheckIn(b.id)}
                  >
                    Check in
                  </button>
                </div>
              )
            })
          )}
        </div>

        {/* ---- In-house ---- */}
        <div>
          <h3 className="quick-h3">
            In-house · <span className="quick-count">{inHouseFiltered.length}</span>
          </h3>
          {inHouseFiltered.length === 0 ? (
            <div className="quick-empty">No guests in-house.</div>
          ) : (
            inHouseFiltered.map((b) => {
              const guest = by('guests', b.g)
              const room = by('rooms', b.room)
              const balance = balanceDue(b)
              return (
                <div className="quick-card" key={b.id}>
                  <div>
                    <div className="quick-name">{guest?.name || 'Guest'}</div>
                    <div className="quick-meta">
                      #{b.id} · Room {room?.no || '—'} · Out {b.out}
                    </div>
                    <div className="quick-meta">
                      Balance:{' '}
                      <b style={{ color: balance > 0 ? '#b23b3b' : '#2e7d5b' }}>
                        {P(balance)}
                      </b>
                    </div>
                  </div>
                  <button
                    className="admin-btn"
                    onClick={() => checkOut(b.id)}
                    disabled={balance > 0}
                    title={balance > 0 ? 'Settle the balance first' : ''}
                  >
                    Check out
                  </button>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* ---- Check-in modal ---- */}
      {checkInModal && bookingBeingCheckedIn && (
        <div className="acc-modal-overlay" onClick={() => setCheckInModal(null)}>
          <div className="acc-modal" onClick={(e) => e.stopPropagation()}>
            <h3>
              Check in #{bookingBeingCheckedIn.id} –{' '}
              {by('guests', bookingBeingCheckedIn.g)?.name}
            </h3>

            <p className="acc-muted">
              Reserved: <b>{bookingBeingCheckedIn.type}</b>,{' '}
              {bookingBeingCheckedIn.in} → {bookingBeingCheckedIn.out}
            </p>

            {checkInBlocked ? (<p className="acc-error" role="alert">{checkInBlocked}</p>) : assignableRooms.length === 0 ? (
              <p className="acc-error">No clean, available rooms for these dates.</p>
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