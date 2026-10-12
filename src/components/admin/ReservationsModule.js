import { useState } from 'react'
import { useAdmin, T, sd, nights, P } from '../../context/AdminContext'

const ID_TYPES = ['Passport', 'Driver’s License', 'National ID', 'SSS/UMID', 'Other']
const SOURCES = ['Walk-in', 'Phone', 'Website', 'OTA / Booking.com', 'Facebook', 'Referral']
const MODIFICATION_FEE = 500

export default function ReservationsModule() {
  const {
    rooms, guests, bookings, types, setBookings, setGuests,
    by, rate, total, free, nextId, logAction,
  } = useAdmin()

  const [query, setQuery] = useState({
    in: T(),
    out: sd(1),
    type: '',
    adults: 2,
    children: 0,
  })
  const [form, setForm] = useState(query)

  const [guestModal, setGuestModal] = useState(null)
  const [editModal, setEditModal] = useState(null)
  const [confirmModal, setConfirmModal] = useState(null)
  const [feeConfirm, setFeeConfirm] = useState(null)

  function searchRooms() {
    setForm(query)
  }

  const totalGuests = form.adults + form.children
  const availableRooms = rooms.filter(
    (r) =>
      (!form.type || r.type === form.type) &&
      form.in < form.out &&
      free(r, form.in, form.out)
  )

  // ---------- CREATE ----------
  function openBookModal(roomId) {
    setGuestModal({
      roomId,
      guestId: 0,
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      idType: 'Passport',
      idNumber: '',
      arrivalTime: '14:00',
      source: 'Walk-in',
      requests: '',
      adults: form.adults,
      children: form.children,
    })
  }

  function validateGuestForm(g) {
    if (!g.firstName.trim()) return 'First name is required.'
    if (!g.lastName.trim()) return 'Last name is required.'
    if (!g.phone.trim()) return 'Phone is required.'
    if (!g.email.trim()) return 'Email is required.'
    if (!g.idType) return 'ID type is required.'
    if (!g.idNumber.trim()) return 'ID number is required.'
    return null
  }

  function confirmBook() {
    const err = validateGuestForm(guestModal)
    if (err) {
      window.alert(err)
      return
    }

    const room = by('rooms', guestModal.roomId)
    let guestId = +guestModal.guestId

    if (!guestId) {
      guestId = nextId()
      setGuests((prev) => [
        ...prev,
        {
          id: guestId,
          name: `${guestModal.firstName.trim()} ${guestModal.lastName.trim()}`,
          phone: guestModal.phone.trim(),
          email: guestModal.email.trim(),
          idType: guestModal.idType,
          idNumber: guestModal.idNumber.trim(),
        },
      ])
    }

    const newBooking = {
      id: nextId(),
      g: guestId,
      room: room.id,
      type: room.type,
      in: form.in,
      out: form.out,
      st: 'confirmed',
      rate: rate(room.type),
      extras: [],
      disc: 0,
      pays: [],
      adults: guestModal.adults,
      children: guestModal.children,
      gCount: guestModal.adults + guestModal.children,
      arrivalTime: guestModal.arrivalTime,
      source: guestModal.source,
      requests: guestModal.requests,
    }

    logAction(
      'Created booking',
      `#${newBooking.id}`,
      `${guestModal.firstName} ${guestModal.lastName} · Room ${room.no} · ${newBooking.in} → ${newBooking.out}`
    )

    setBookings((prev) => [...prev, newBooking])
    setGuestModal(null)
    setConfirmModal({
      booking: newBooking,
      room,
      guestName: `${guestModal.firstName} ${guestModal.lastName}`.trim(),
    })
  }

  // ---------- CANCEL ----------
  function cancelBooking(id) {
    if (window.confirm(`Cancel reservation #${id}?`)) {
      logAction('Cancelled booking', `#${id}`, 'Reservation cancelled')
      setBookings((prev) =>
        prev.map((b) => (b.id === id ? { ...b, st: 'cancelled' } : b))
      )
    }
  }

  // ---------- EDIT ----------
  function openEditModal(id) {
    const b = by('bookings', id)
    if (!b) return
    const guest = by('guests', b.g)
    setEditModal({
      id: b.id,
      in: b.in,
      out: b.out,
      type: b.type,
      room: b.room,
      adults: b.adults ?? b.gCount ?? 2,
      children: b.children ?? 0,
      arrivalTime: b.arrivalTime || '14:00',
      requests: b.requests || '',
      guestName: guest?.name || '',
    })
  }

  function attemptSaveEdit() {
    if (editModal.in >= editModal.out) {
      window.alert('Check-out must be after check-in.')
      return
    }
    setFeeConfirm({ pending: { ...editModal } })
  }

  function confirmEditWithFee() {
    const em = feeConfirm.pending
    const b = by('bookings', em.id)
    if (!b) return

    const newExtras = [
      ...b.extras,
      { d: `Modification fee (${T()})`, a: MODIFICATION_FEE },
    ]

    const newTypeRate = rate(em.type)

    setBookings((prev) =>
      prev.map((x) =>
        x.id === b.id
          ? {
              ...x,
              in: em.in,
              out: em.out,
              type: em.type,
              rate: newTypeRate,
              adults: em.adults,
              children: em.children,
              gCount: em.adults + em.children,
              arrivalTime: em.arrivalTime,
              requests: em.requests,
              extras: newExtras,
            }
          : x
      )
    )

    logAction(
      'Edited booking',
      `#${b.id}`,
      `${b.in} → ${em.in} · ${b.out} → ${em.out} · Fee ₱${MODIFICATION_FEE.toLocaleString()}`
    )

    setFeeConfirm(null)
    setEditModal(null)
  }

  const upd = (key, value) => setGuestModal((m) => ({ ...m, [key]: value }))
  const updEdit = (key, value) => setEditModal((m) => ({ ...m, [key]: value }))

  const canEdit = (b) => b.st === 'confirmed' && b.in >= T()

  return (
    <>
      <div className="admin-card">
        <div className="admin-row admin-row-search">
          <div>
            <label>Check-in</label>
            <input
              type="date"
              value={query.in}
              onChange={(e) => setQuery({ ...query, in: e.target.value })}
            />
          </div>
          <div>
            <label>Check-out</label>
            <input
              type="date"
              value={query.out}
              onChange={(e) => setQuery({ ...query, out: e.target.value })}
            />
          </div>
          <div>
            <label>Room type</label>
            <select
              value={query.type}
              onChange={(e) => setQuery({ ...query, type: e.target.value })}
            >
              <option value="">Any</option>
              {types.map((t) => (
                <option key={t.n} value={t.n}>{t.n}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Adults</label>
            <div className="stepper">
              <span className="stepper-value">{query.adults}</span>
              <div className="stepper-btns">
                <button type="button" onClick={() => setQuery({ ...query, adults: Math.min(query.adults + 1, 20) })}>+</button>
                <button type="button" onClick={() => setQuery({ ...query, adults: Math.max(query.adults - 1, 1) })}>−</button>
              </div>
            </div>
          </div>
          <div>
            <label>Children</label>
            <div className="stepper">
              <span className="stepper-value">{query.children}</span>
              <div className="stepper-btns">
                <button type="button" onClick={() => setQuery({ ...query, children: Math.min(query.children + 1, 10) })}>+</button>
                <button type="button" onClick={() => setQuery({ ...query, children: Math.max(query.children - 1, 0) })}>−</button>
              </div>
            </div>
          </div>
          <div>
            <button className="admin-btn" onClick={searchRooms}>Search rooms</button>
          </div>
        </div>
      </div>

      <h2 className="admin-h2">
        Available rooms ({availableRooms.length}) · {totalGuests} guest(s)
      </h2>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Room</th>
              <th>Type</th>
              <th>Rate</th>
              <th>Total</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {availableRooms.length === 0 ? (
              <tr><td colSpan="5" className="admin-muted">No available rooms for those dates.</td></tr>
            ) : (
              availableRooms.map((r) => (
                <tr key={r.id}>
                  <td>{r.no}</td>
                  <td>{r.type}</td>
                  <td>{P(rate(r.type))}</td>
                  <td>{P(rate(r.type) * nights(form.in, form.out))}</td>
                  <td>
                    <button className="admin-link" onClick={() => openBookModal(r.id)}>
                      Select
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <h2 className="admin-h2">All reservations</h2>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Ref</th>
              <th>Guest</th>
              <th>Room</th>
              <th>Guests</th>
              <th>Dates</th>
              <th>Status</th>
              <th>Total</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => {
              const r = by('rooms', b.room)
              const guest = by('guests', b.g)
              return (
                <tr key={b.id}>
                  <td>#{b.id}</td>
                  <td>{guest?.name || '—'}</td>
                  <td>{r ? r.no : b.type}</td>
                  <td>{b.gCount ?? b.g ?? '—'}</td>
                  <td>{b.in} → {b.out}</td>
                  <td><span className={`admin-badge ${b.st}`}>{b.st}</span></td>
                  <td>{P(total(b))}</td>
                  <td>
                    {canEdit(b) && (
                      <button className="admin-link" onClick={() => openEditModal(b.id)}>
                        Edit
                      </button>
                    )}
                    {b.st === 'confirmed' && (
                      <button className="admin-link danger" onClick={() => cancelBooking(b.id)}>
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ---- New booking modal ---- */}
      {guestModal && (
        <div className="acc-modal-overlay" onClick={() => setGuestModal(null)}>
          <div className="acc-modal acc-modal-wide" onClick={(e) => e.stopPropagation()}>
            <h3>Guest information – Room {by('rooms', guestModal.roomId)?.no}</h3>

            <label>Guest</label>
            <select
              value={guestModal.guestId}
              onChange={(e) => upd('guestId', +e.target.value)}
            >
              <option value={0}>+ New guest</option>
              {guests.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>

            {+guestModal.guestId === 0 && (
              <>
                <div className="form-section-title">Personal details</div>
                <div className="form-grid">
                  <div>
                    <label>First name *</label>
                    <input value={guestModal.firstName} onChange={(e) => upd('firstName', e.target.value)} />
                  </div>
                  <div>
                    <label>Last name *</label>
                    <input value={guestModal.lastName} onChange={(e) => upd('lastName', e.target.value)} />
                  </div>
                  <div>
                    <label>Phone *</label>
                    <input value={guestModal.phone} onChange={(e) => upd('phone', e.target.value)} />
                  </div>
                  <div>
                    <label>Email *</label>
                    <input type="email" value={guestModal.email} onChange={(e) => upd('email', e.target.value)} />
                  </div>
                </div>

                <div className="form-section-title">Identification</div>
                <div className="form-grid">
                  <div>
                    <label>ID type *</label>
                    <select value={guestModal.idType} onChange={(e) => upd('idType', e.target.value)}>
                      {ID_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label>ID number *</label>
                    <input value={guestModal.idNumber} onChange={(e) => upd('idNumber', e.target.value)} />
                  </div>
                </div>
              </>
            )}

            <div className="form-section-title">Stay information</div>
            <div className="form-grid">
              <div>
                <label>Adults</label>
                <div className="stepper">
                  <span className="stepper-value">{guestModal.adults}</span>
                  <div className="stepper-btns">
                    <button type="button" onClick={() => upd('adults', Math.min(guestModal.adults + 1, 20))}>+</button>
                    <button type="button" onClick={() => upd('adults', Math.max(guestModal.adults - 1, 1))}>−</button>
                  </div>
                </div>
              </div>
              <div>
                <label>Children</label>
                <div className="stepper">
                  <span className="stepper-value">{guestModal.children}</span>
                  <div className="stepper-btns">
                    <button type="button" onClick={() => upd('children', Math.min(guestModal.children + 1, 10))}>+</button>
                    <button type="button" onClick={() => upd('children', Math.max(guestModal.children - 1, 0))}>−</button>
                  </div>
                </div>
              </div>
              <div>
                <label>Estimated arrival</label>
                <input type="time" value={guestModal.arrivalTime} onChange={(e) => upd('arrivalTime', e.target.value)} />
              </div>
              <div>
                <label>Booking source</label>
                <select value={guestModal.source} onChange={(e) => upd('source', e.target.value)}>
                  {SOURCES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="form-grid-full">
                <label>Special requests</label>
                <textarea rows="2" value={guestModal.requests} onChange={(e) => upd('requests', e.target.value)} />
              </div>
            </div>

            <div className="acc-modal-actions">
              <button className="btn ghost-dark" onClick={() => setGuestModal(null)}>Cancel</button>
              <button className="btn" onClick={confirmBook}>Confirm booking</button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Edit booking modal ---- */}
      {editModal && (
        <div className="acc-modal-overlay" onClick={() => setEditModal(null)}>
          <div className="acc-modal acc-modal-wide" onClick={(e) => e.stopPropagation()}>
            <h3>Edit booking #{editModal.id} – {editModal.guestName}</h3>
            <p className="acc-muted acc-small">
              A modification fee of <b>₱{MODIFICATION_FEE.toLocaleString()}</b> will be added to the folio.
            </p>

            <div className="form-grid">
              <div>
                <label>Check-in</label>
                <input type="date" value={editModal.in} onChange={(e) => updEdit('in', e.target.value)} />
              </div>
              <div>
                <label>Check-out</label>
                <input type="date" value={editModal.out} onChange={(e) => updEdit('out', e.target.value)} />
              </div>
              <div>
                <label>Room type</label>
                <select value={editModal.type} onChange={(e) => updEdit('type', e.target.value)}>
                  {types.map((t) => (
                    <option key={t.n} value={t.n}>{t.n}</option>
                  ))}
                </select>
              </div>
              <div>
                <label>Estimated arrival</label>
                <input type="time" value={editModal.arrivalTime} onChange={(e) => updEdit('arrivalTime', e.target.value)} />
              </div>
              <div>
                <label>Adults</label>
                <div className="stepper">
                  <span className="stepper-value">{editModal.adults}</span>
                  <div className="stepper-btns">
                    <button type="button" onClick={() => updEdit('adults', Math.min(editModal.adults + 1, 20))}>+</button>
                    <button type="button" onClick={() => updEdit('adults', Math.max(editModal.adults - 1, 1))}>−</button>
                  </div>
                </div>
              </div>
              <div>
                <label>Children</label>
                <div className="stepper">
                  <span className="stepper-value">{editModal.children}</span>
                  <div className="stepper-btns">
                    <button type="button" onClick={() => updEdit('children', Math.min(editModal.children + 1, 10))}>+</button>
                    <button type="button" onClick={() => updEdit('children', Math.max(editModal.children - 1, 0))}>−</button>
                  </div>
                </div>
              </div>
              <div className="form-grid-full">
                <label>Special requests</label>
                <textarea rows="2" value={editModal.requests} onChange={(e) => updEdit('requests', e.target.value)} />
              </div>
            </div>

            <div className="acc-modal-actions">
              <button className="btn ghost-dark" onClick={() => setEditModal(null)}>Cancel</button>
              <button className="btn" onClick={attemptSaveEdit}>Save changes</button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Fee confirmation ---- */}
      {feeConfirm && (
        <div className="acc-modal-overlay" onClick={() => setFeeConfirm(null)}>
          <div className="acc-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Confirm modification fee</h3>
            <p className="acc-muted">
              Editing this booking will add a <b>₱{MODIFICATION_FEE.toLocaleString()}</b> modification fee to the folio. Continue?
            </p>
            <div className="acc-modal-actions">
              <button className="btn ghost-dark" onClick={() => setFeeConfirm(null)}>Cancel</button>
              <button className="btn" onClick={confirmEditWithFee}>Yes, apply fee and save</button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Confirmation modal ---- */}
      {confirmModal && (
        <div className="acc-modal-overlay" onClick={() => setConfirmModal(null)}>
          <div className="acc-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Booking confirmed</h3>
            <p><b>Ref #{confirmModal.booking.id}</b></p>
            <p className="acc-muted">
              {confirmModal.guestName}
              <br />
              Room {confirmModal.room.no} ({confirmModal.room.type})
              <br />
              {confirmModal.booking.in} → {confirmModal.booking.out} · {nights(confirmModal.booking.in, confirmModal.booking.out)} night(s)
              <br />
              {confirmModal.booking.adults} adult(s)
              {confirmModal.booking.children > 0 && `, ${confirmModal.booking.children} child(ren)`}
              <br />
              Total {P(total(confirmModal.booking))}
            </p>
            <div className="acc-modal-actions">
              <button className="btn" onClick={() => setConfirmModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}