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

  const [roomModal, setRoomModal] = useState(null)
  const [typeEditModal, setTypeEditModal] = useState(null)
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
      })
      setNewTypeMode(false)
    }
  }

  function saveRoom() {
    if (!String(roomModal.no).trim()) return
    if (!roomModal.type.trim()) return

    // If new type was typed, create it in the types list first
    const existingType = types.find((t) => t.n === roomModal.type)
    if (!existingType) {
      setTypes((prev) => [
        ...prev,
        { n: roomModal.type.trim(), r: +roomModal.rate || 0 },
      ])
    } else if (+roomModal.rate && existingType.r !== +roomModal.rate) {
      // Update rate if user changed it
      setTypes((prev) =>
        prev.map((t) =>
          t.n === existingType.n ? { ...t, r: +roomModal.rate } : t
        )
      )
    }

    if (roomModal.id) {
      logAction(
        'Edited room',
        `Room ${roomModal.no}`,
        `${roomModal.type} · ${roomModal.status}`
      )
      setRooms((prev) =>
        prev.map((r) =>
          r.id === roomModal.id
            ? {
                ...r,
                no: roomModal.no,
                type: roomModal.type.trim(),
                status: roomModal.status,
              }
            : r
        )
      )
    } else {
      logAction(
        'Added room',
        `Room ${roomModal.no}`,
        `${roomModal.type} · ${roomModal.status}`
      )
      setRooms((prev) => [
        ...prev,
        {
          id: nextId(),
          no: roomModal.no,
          type: roomModal.type.trim(),
          status: roomModal.status,
          hk: '',
        },
      ])
    }
    setRoomModal(null)
  }

  function deleteRoom(id) {
    if (window.confirm('Delete this room?')) {
      logAction('Deleted room', `Room ${by('rooms', id)?.no}`, '')
      setRooms((prev) => prev.filter((r) => r.id !== id))
    }
  }

  // ---- type edit ----
  function openTypeEdit(name) {
    const t = types.find((x) => x.n === name)
    setTypeEditModal({ originalName: name, rate: t?.r || 0 })
  }

  function saveTypeEdit() {
    if (!typeEditModal.rate) return
    logAction(
      'Edited room type',
      typeEditModal.originalName,
      `New rate ${P(+typeEditModal.rate)}`
    )
    setTypes((prev) =>
      prev.map((t) =>
        t.n === typeEditModal.originalName ? { ...t, r: +typeEditModal.rate } : t
      )
    )
    setTypeEditModal(null)
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

      {/* ---- Type edit modal (only reachable from a "Manage types" flow if needed) ---- */}
      {typeEditModal && (
        <div className="acc-modal-overlay" onClick={() => setTypeEditModal(null)}>
          <div className="acc-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Edit rate – {typeEditModal.originalName}</h3>
            <label>Rate per night (₱)</label>
            <input
              type="number"
              value={typeEditModal.rate}
              onChange={(e) =>
                setTypeEditModal({ ...typeEditModal, rate: e.target.value })
              }
            />
            <div className="acc-modal-actions">
              <button className="btn ghost-dark" onClick={() => setTypeEditModal(null)}>
                Cancel
              </button>
              <button className="btn" onClick={saveTypeEdit}>Save</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}