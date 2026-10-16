import { allocationPlan, activeBooking } from '../../utils/inventory'
import { deleteRoomError, roomStatusError } from '../../utils/actionValidation'
import { textError, moneyError } from '../../utils/validation'
import { useState } from 'react'
import { useAdmin, T, sd, P } from '../../context/AdminContext'

const STATUS_OPTIONS = [
  ['available', 'Ready'],
  ['occupied', 'Occupied'],
  ['dirty', 'Clean up'],
  ['maintenance', 'Maintenance'],
]

export default function RoomsModule() {
  const {
    types, rooms, setTypes, setRooms, by, free, nextId, logAction,
  } = useAdmin()

  const { bookings, can } = useAdmin()

  const [roomModal, setRoomModal] = useState(null)
  const [newTypeMode, setNewTypeMode] = useState(false)

  const today = T()
  const tomorrow = sd(1)

  // ---- room edit/add ----
  function openRoom(id) {
    if (!id) {
      setRoomModal({
        id: 0,
        no: '',
        type: types[0]?.n || '',
        status: 'available',
        rate: types[0]?.r || 0,
        capacity: types[0]?.s || 2,
      })
      setNewTypeMode(false)
    } else {
      const r = by('rooms', id)
      const typeRow = types.find((t) => t.n === r.type)
      setRoomModal({
        id: r.id,
        no: r.no,
        type: r.type,
        status: r.status,
        rate: typeRow?.r || 0,
        capacity: typeRow?.s || 2,
      })
      setNewTypeMode(false)
    }
  }

  function saveRoom() {
    if (!can('rooms')) return window.alert('You do not have permission to change rooms.')
    if (!roomModal) return
    const existingRoom = roomModal.id ? by('rooms', roomModal.id) : { status: 'available' }
    const statusError = roomStatusError(existingRoom, roomModal.status, bookings)
    if (statusError) return window.alert(statusError)
    if (existingRoom?.status === 'occupied' && existingRoom.type !== roomModal.type) return window.alert('An occupied room cannot change type.')
    const error = textError(roomModal.no, 'Room number', 20) || textError(roomModal.type, 'Room type', 100) || moneyError(roomModal.rate, 'Nightly rate')
    if (error) return window.alert(error)
    if (rooms.some((r) => r.id !== roomModal.id && String(r.no).trim().toLowerCase() === String(roomModal.no).trim().toLowerCase())) return window.alert('This room number already exists.')
    if (!STATUS_OPTIONS.some(([id]) => id === roomModal.status)) return window.alert('Select a valid room status.')
    const draft = { ...roomModal, no: String(roomModal.no).trim(), type: types.find((t) => t.n.toLowerCase() === roomModal.type.trim().toLowerCase())?.n || roomModal.type.trim() }
    if (!String(draft.no).trim()) return
    if (!draft.type.trim()) return

    const capacity = Number(draft.capacity)
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 50) return window.alert('Capacity must be a whole number from 1 to 50.')
    if (bookings.some((b) => activeBooking(b) && b.type === draft.type && (b.gCount || (b.adults ?? 2) + (b.children ?? 0)) > capacity)) return window.alert('This capacity is too small for an existing reservation.')
    if (draft.id) {
      const proposed = rooms.map((r) => r.id === draft.id ? { ...r, type: draft.type, status: draft.status } : r)
      const affected = bookings.filter((b) => activeBooking(b) && (b.out > today || b.st === 'checked-in') && (b.type === draft.type || b.type === existingRoom.type))
      if (affected.some((b) => !allocationPlan(proposed, bookings, b, b.id))) return window.alert('This room change would leave a reservation without a room. Reassign or cancel that reservation first.')
    }

    // Existing confirmed quotes keep their original rates.
    const existingType = types.find((t) => t.n === draft.type)
    if (!existingType) {
      setTypes((prev) => [
        ...prev,
        { n: draft.type.trim(), r: +draft.rate, s: capacity, img: '/room-1.jpg', desc: 'Contact the hotel for room details.' },
      ])
    } else {
      // Update rate if user changed it
      setTypes((prev) =>
        prev.map((t) =>
          t.n === existingType.n ? { ...t, r: +draft.rate, s: capacity } : t
        )
      )
    }

    if (draft.id) {
      logAction(
        'Edited room',
        `Room ${draft.no}`,
        `${draft.type} · ${draft.status}`
      )
      setRooms((prev) =>
        prev.map((r) =>
          r.id === draft.id
            ? {
                ...r,
                no: draft.no,
                type: draft.type.trim(),
                status: draft.status,
              }
            : r
        )
      )
    } else {
      logAction(
        'Added room',
        `Room ${draft.no}`,
        `${draft.type} · ${draft.status}`
      )
      setRooms((prev) => [
        ...prev,
        {
          id: nextId(),
          no: draft.no,
          type: draft.type.trim(),
          status: draft.status,
          hk: '',
        },
      ])
    }
    setRoomModal(null)
  }

  function deleteRoom(id) {
    if (!can('rooms')) return window.alert('You do not have permission to delete rooms.')
    const error = deleteRoomError(by('rooms', id), bookings)
    if (error) return window.alert(error)
    const proposed = rooms.filter((r) => r.id !== id)
    const affected = bookings.filter((b) => activeBooking(b) && (b.out > today || b.st === 'checked-in') && b.type === by('rooms', id)?.type)
    if (affected.some((b) => !allocationPlan(proposed, bookings, b, b.id))) return window.alert('This room is needed for an existing reservation.')
    if (window.confirm('Delete this room?')) {
      logAction('Deleted room', `Room ${by('rooms', id)?.no}`, '')
      setRooms((prev) => prev.filter((r) => r.id !== id))
    }
  }


  return (
    <>
      <div className="admin-row" style={{ marginBottom: 14 }}>
        <div>
          <button className="admin-btn" onClick={() => openRoom(0)}>
            + Add room
          </button>
        </div>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Room</th>
              <th>Type</th>
              <th>Rate / night</th>
              <th>Status</th>
              <th>Available tonight</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rooms.length === 0 ? (
              <tr>
                <td colSpan="6" className="admin-muted">
                  No rooms yet. Add one to begin.
                </td>
              </tr>
            ) : (
              rooms.map((r) => {
                const isFree = free(r, today, tomorrow) && r.status !== 'occupied'
                const typeRow = types.find((t) => t.n === r.type)
                return (
                  <tr key={r.id}>
                    <td>{r.no}</td>
                    <td>{r.type}</td>
                    <td>{P(typeRow?.r || 0)}</td>
                    <td>
                      <span className={`admin-badge ${r.status}`}>
                        {STATUS_OPTIONS.find(([id]) => id === r.status)?.[1] || r.status}
                      </span>
                    </td>
                    <td>{isFree ? 'Yes' : 'No'}</td>
                    <td>
                      <button
                        className="admin-link"
                        onClick={() => openRoom(r.id)}
                      >
                        Edit
                      </button>
                      <button
                        className="admin-link danger"
                        onClick={() => deleteRoom(r.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ---- Room modal ---- */}
      {roomModal && (
        <div className="acc-modal-overlay" onClick={() => setRoomModal(null)}>
          <div className="acc-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{roomModal.id ? 'Edit room' : 'Add room'}</h3>

            <label>Room number</label>
            <input
              value={roomModal.no}
              onChange={(e) => setRoomModal({ ...roomModal, no: e.target.value })}
            />

            <label>Type</label>
            {!newTypeMode ? (
              <select
                value={roomModal.type}
                onChange={(e) => {
                  const t = types.find((x) => x.n === e.target.value)
                  setRoomModal({
                    ...roomModal,
                    type: e.target.value,
                    rate: t?.r || 0,
                    capacity: t?.s || 2,
                  })
                }}
              >
                {types.map((t) => (
                  <option key={t.n} value={t.n}>{t.n}</option>
                ))}
              </select>
            ) : (
              <input
                value={roomModal.type}
                onChange={(e) =>
                  setRoomModal({ ...roomModal, type: e.target.value })
                }
                placeholder="e.g. Junior Suite"
              />
            )}

            <button
              type="button"
              className="admin-link"
              style={{ marginTop: 8 }}
              onClick={() => {
                setNewTypeMode((v) => !v)
                setRoomModal({ ...roomModal, type: '' })
              }}
            >
              {newTypeMode ? '← Choose existing type' : '+ Type a new type'}
            </button>

            <label>Rate / night (₱)</label>
            <input
              type="number"
              value={roomModal.rate}
              onChange={(e) => setRoomModal({ ...roomModal, rate: e.target.value })}
            />

            <label>Maximum guests for this room type</label>
            <input type="number" min="1" max="50" step="1" value={roomModal.capacity} onChange={(e) => setRoomModal({ ...roomModal, capacity: e.target.value })} />
            <p className="acc-muted acc-small">Rate and capacity apply to every room of this type. Existing reservations keep their agreed rate.</p>
            <label>Status</label>
            <select
              value={roomModal.status}
              onChange={(e) => setRoomModal({ ...roomModal, status: e.target.value })}
            >
              {STATUS_OPTIONS.map(([id, label]) => (
                <option key={id} value={id}>{label}</option>
              ))}
            </select>

            <div className="acc-modal-actions">
              <button className="btn ghost-dark" onClick={() => setRoomModal(null)}>
                Cancel
              </button>
              <button className="btn" onClick={saveRoom}>Save</button>
            </div>
          </div>
        </div>
      )}


    </>
  )
}