import { useState } from 'react'
import { useAdmin } from '../../context/AdminContext'

export default function HousekeepingModule() {
  const { rooms, staff, setRooms, logAction } = useAdmin()
  const [assignModal, setAssignModal] = useState(null)

  function setStatus(id, status) {
    const r = rooms.find((x) => x.id === id)
    logAction('Room status', `Room ${r?.no}`, `→ ${status}`)
    setRooms((prev) =>
      prev.map((x) => (x.id === id ? { ...x, status } : x))
    )
  }

  function openAssign(roomId) {
    const r = rooms.find((x) => x.id === roomId)
    setAssignModal({ roomId, hk: r?.hk || '' })
  }

  function saveAssign() {
    logAction(
      'Assigned cleaner',
      `Room ${rooms.find((x) => x.id === assignModal.roomId)?.no}`,
      assignModal.hk || 'Unassigned'
    )
    setRooms((prev) =>
      prev.map((r) =>
        r.id === assignModal.roomId ? { ...r, hk: assignModal.hk } : r
      )
    )
    setAssignModal(null)
  }

  const cleaners = staff.filter((s) => s.dept === 'Housekeeping' && s.on)

  return (
    <>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Room</th>
              <th>Type</th>
              <th>Status</th>
              <th>Assigned to</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rooms.map((r) => (
              <tr key={r.id}>
                <td>{r.no}</td>
                <td>{r.type}</td>
                <td><span className={`admin-badge ${r.status}`}>{r.status}</span></td>
                <td>{r.hk || '—'}</td>
                <td>
                  {r.status === 'dirty' && (
                    <button className="admin-link" onClick={() => setStatus(r.id, 'available')}>Mark clean</button>
                  )}
                  {r.status === 'available' && (
                    <button className="admin-link" onClick={() => setStatus(r.id, 'dirty')}>Mark dirty</button>
                  )}
                  {r.status !== 'maintenance' && r.status !== 'occupied' && (
                    <button className="admin-link" onClick={() => setStatus(r.id, 'maintenance')}>Maintenance</button>
                  )}
                  {r.status === 'maintenance' && (
                    <button className="admin-link" onClick={() => setStatus(r.id, 'available')}>Maintenance done</button>
                  )}
                  <button className="admin-link" onClick={() => openAssign(r.id)}>Assign</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {assignModal && (
        <div className="acc-modal-overlay" onClick={() => setAssignModal(null)}>
          <div className="acc-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Assign cleaner – Room {rooms.find((x) => x.id === assignModal.roomId)?.no}</h3>
            <label>Staff</label>
            <select value={assignModal.hk} onChange={(e) => setAssignModal({ ...assignModal, hk: e.target.value })}>
              <option value="">Unassigned</option>
              {cleaners.map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
            <div className="acc-modal-actions">
              <button className="btn ghost-dark" onClick={() => setAssignModal(null)}>Cancel</button>
              <button className="btn" onClick={saveAssign}>Save</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}