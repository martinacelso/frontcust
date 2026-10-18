import { useAdmin } from '../../context/AdminContext'
import useRoomInventory from '../../hooks/useRoomInventory'

export default function HousekeepingModule() {
  const { sessionUser } = useAdmin()
  if (!sessionUser || !['admin', 'housekeeping'].includes(sessionUser.role)) return <p role="alert">You do not have access to housekeeping.</p>
  return <HousekeepingInventory key={sessionUser.id} />
}

function HousekeepingInventory() {
  const { types, rooms, busy, error, message, refresh, save } = useRoomInventory()
  async function changeStatus(room, status) {
    if (busy || !window.confirm(`Change room ${room.number} to ${status === 'available' ? 'clean' : status}?`)) return
    await save('/' + room.id + '/status', 'PATCH', { status, version: room.version }, 'Room status saved.')
  }
  return <>
    <button className="admin-btn" style={{ marginBottom: 16 }} disabled={busy} onClick={refresh}>{busy ? 'Please wait…' : 'Refresh'}</button>
    {error && <p role="alert" className="acc-error">{error} Refresh before trying again.</p>}
    {message && <p role="status" className="acc-saved">{message}</p>}
    <div className="admin-table-wrap"><table className="admin-table">
      <thead><tr><th>Room</th><th>Type</th><th>Status</th><th>Notes</th><th>Action</th></tr></thead>
      <tbody>{rooms.map((room) => <tr key={room.id}>
        <td>{room.number}</td><td>{types.find((type) => type.id === room.roomTypeId)?.name || 'Unknown type'}</td>
        <td><span className={'admin-badge ' + room.status}>{room.status === 'available' ? 'Clean' : room.status}</span></td><td>{room.notes || '—'}</td>
        <td>
          {room.status === 'dirty' && <button className="admin-link" disabled={busy} onClick={() => changeStatus(room, 'available')}>Mark clean</button>}
          {room.status === 'available' && <button className="admin-link" disabled={busy} onClick={() => changeStatus(room, 'dirty')}>Mark dirty</button>}
          {['available', 'dirty'].includes(room.status) && <button className="admin-link" disabled={busy} onClick={() => changeStatus(room, 'maintenance')}>Maintenance</button>}
          {room.status === 'maintenance' && <button className="admin-link" disabled={busy} onClick={() => changeStatus(room, 'dirty')}>Maintenance done — needs cleaning</button>}
          {room.status === 'occupied' && 'Guest in room'}
        </td>
      </tr>)}{!rooms.length && <tr><td colSpan="5">{busy ? 'Loading rooms…' : error ? 'Room data could not be loaded.' : 'No rooms yet.'}</td></tr>}</tbody>
    </table></div>
  </>
}
