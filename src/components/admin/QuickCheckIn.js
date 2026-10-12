import { useState } from 'react'
import { useAdmin, T, P } from '../../context/AdminContext'

export default function QuickCheckIn() {
  const {
    bookings, rooms, types, setBookings, setRooms,
    by, total, paid, free, logAction,
  } = useAdmin()

  const [checkInModal, setCheckInModal] = useState(null) // { bookingId, roomId }
  const [search, setSearch] = useState('')

  const today = T()

  // Arrivals: confirmed bookings with check-in date today or earlier
  const arrivals = bookings.filter(
    (b) => b.st === 'confirmed' && b.in <= today
  )

  // In-house: currently checked-in
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

    logAction(
      'Checked out',
      `Booking #${b.id}`,
      `Room ${by('rooms', b.room)?.no || '—'}`
    )

    setBookings((prev) =>
      prev.map((x) => (x.id === b.id ? { ...x, st: 'checked-out' } : x))
    )
    if (b.room) {
      setRooms((prev) =>
        prev.map((x) => (x.id === b.room ? { ...x, status: 'dirty' } : x))
      )
    }
  }

  // ---------- Modal data ----------
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
              const balance = total(b) - paid(b)
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

            {assignableRooms.length === 0 ? (
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