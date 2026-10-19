import RoomAvailability from './RoomAvailability'
import { useState } from 'react'
import { useAdmin, P } from '../../context/AdminContext'
import useRoomInventory from '../../hooks/useRoomInventory'

export default function RoomsModule() {
  const { sessionUser } = useAdmin()
  if (!sessionUser || !['admin', 'front-desk'].includes(sessionUser.role)) return <p role="alert">You do not have access to room management.</p>
  return <RoomInventory key={sessionUser.id} editable={sessionUser.role === 'admin'} />
}

function RoomInventory({ editable }) {
  const { types, rooms, busy, error, message, refresh, save } = useRoomInventory()
  const [draft, setDraft] = useState(null)
  const [removing, setRemoving] = useState(null)
  const [formError, setFormError] = useState('')
  const open = (kind, row) => {
    setFormError('')
    setDraft({ kind, ...(row || (kind === 'room'
      ? { number: '', roomTypeId: types[0]?.id || '', notes: '' }
      : { name: '', rate: '', capacity: 2, description: '', image: '/room-1.jpg' })) })
  }
  const field = (name, value) => setDraft((old) => ({ ...old, [name]: value }))
  async function submit(event) {
    event.preventDefault()
    if (busy || !draft) return
    setFormError('')
    const isType = draft.kind === 'type'
    const body = isType
      ? { name: draft.name.trim(), rate: Number(draft.rate), capacity: Number(draft.capacity), description: draft.description || '', image: draft.image || '/room-1.jpg' }
      : { number: draft.number.trim(), roomTypeId: draft.roomTypeId, notes: draft.notes || '' }
    if (isType && (!body.name || !Number.isFinite(body.rate) || body.rate <= 0 || body.rate > 10000000 ||
      Math.abs(body.rate * 100 - Math.round(body.rate * 100)) > 0.000001 || !Number.isInteger(body.capacity) || body.capacity < 1 || body.capacity > 50)) {
      setFormError('Enter a name, a positive price with at most two decimals, and a capacity from 1 to 50.')
      return
    }
    if (!isType && (!/^[a-z0-9][a-z0-9 -]{0,19}$/i.test(body.number) || !body.roomTypeId)) {
      setFormError('Enter a room number using letters, numbers, spaces or hyphens, and choose a type.')
      return
    }
    if (draft.id) body.version = draft.version
    const endpoint = (isType ? '/types' : '') + (draft.id ? '/' + draft.id : '')
    const result = await save(endpoint, draft.id ? 'PATCH' : 'POST', body, isType ? 'Room type saved.' : 'Room saved.')
    if (!result.error) setDraft(null)
  }
  if (!editable) return <RoomAvailability />
  return <>
    <RoomAvailability key={rooms.map((r) => r.id + ':' + r.version).join(',')} />
    <h3>Room inventory</h3>
    <div className="admin-row" style={{ gap: 12, marginBottom: 16 }}>
      <button className="admin-btn" disabled={busy || !!draft || !!removing} onClick={refresh}>{busy ? 'Please wait…' : 'Refresh'}</button>
      {editable && <>
        <button className="admin-btn" disabled={busy || !!draft || !!removing || !types.length} onClick={() => open('room')}>+ Add room</button>
        <button className="admin-btn" disabled={busy || !!draft || !!removing} onClick={() => open('type')}>+ Add room type</button>
      </>}
    </div>
    {!draft && error && <p role="alert" className="acc-error">{error} Close any edit form and refresh to get the latest records.</p>}
    {message && <p role="status" className="acc-saved">{message}</p>}
    <div className="admin-table-wrap"><table className="admin-table">
      <thead><tr><th>Room</th><th>Type</th><th>Rate / night</th><th>Status</th><th>Notes</th><th>Action</th></tr></thead>
      <tbody>{rooms.map((room) => {
        const type = types.find((item) => item.id === room.roomTypeId)
        return <tr key={room.id}><td>{room.number}</td><td>{type?.name || 'Unknown type'}</td><td>{type ? P(type.rate) : '—'}</td>
          <td><span className={'admin-badge ' + room.status}>{room.status === 'available' ? 'Clean' : room.status}</span></td><td>{room.notes || '—'}</td>
          <td>{editable && room.status !== 'occupied' && <><button className="admin-link" disabled={busy || !!draft || !!removing} onClick={() => open('room', room)}>Edit</button>{' '}<button className="admin-link" disabled={busy || !!draft || !!removing} onClick={() => { setFormError(''); setRemoving(room) }}>Remove</button></>}</td></tr>
      })}{!rooms.length && <tr><td colSpan="6">{busy ? 'Loading rooms…' : error ? 'Room data could not be loaded.' : 'No rooms yet.'}</td></tr>}</tbody>
    </table></div>
    <h3>Room types</h3>
    <div className="admin-table-wrap"><table className="admin-table">
      <thead><tr><th>Type</th><th>Rate / night</th><th>Maximum guests</th><th>Action</th></tr></thead>
      <tbody>{types.map((type) => <tr key={type.id}><td>{type.name}</td><td>{P(type.rate)}</td><td>{type.capacity}</td>
        <td>{editable && <button className="admin-link" disabled={busy || !!draft || !!removing} onClick={() => open('type', type)}>Edit rate / details</button>}</td></tr>)}</tbody>
    </table></div>
    {removing && <div className="acc-modal-overlay"><div className="acc-modal" role="dialog" aria-modal="true" aria-labelledby="remove-room-title">
      <h3 id="remove-room-title">Remove room {removing.number}?</h3>
      <p>This removes the room from inventory. Only unoccupied rooms without any booking history can be removed.</p>
      {formError && <p role="alert" className="acc-error">{formError}</p>}
      <div className="acc-modal-actions"><button className="btn ghost-dark" disabled={busy} onClick={() => setRemoving(null)}>Cancel</button>
        <button className="btn" disabled={busy} onClick={async () => {
          const result = await save('/' + removing.id, 'DELETE', { version: removing.version, confirm: true }, 'Room removed.')
          if (result.error) setFormError(result.error)
          else setRemoving(null)
        }}>{busy ? 'Removing…' : 'Remove room'}</button></div>
    </div></div>}
    {draft && <div className="acc-modal-overlay"><div className="acc-modal" role="dialog" aria-modal="true" aria-labelledby="room-edit-title">
      <h3 id="room-edit-title">{draft.id ? 'Edit' : 'Add'} {draft.kind === 'type' ? 'room type' : 'room'}</h3>
      <form onSubmit={submit}>
        <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0 }}>
          {draft.kind === 'type' ? <>
            <label htmlFor="type-name">Name</label><input id="type-name" autoFocus required minLength="2" maxLength="100" disabled={!!draft.id} value={draft.name} onChange={(e) => field('name', e.target.value)} />
            <label htmlFor="type-rate">Nightly rate (₱)</label><input id="type-rate" type="number" required min="0.01" max="10000000" step="0.01" value={draft.rate} onChange={(e) => field('rate', e.target.value)} />
            <label htmlFor="type-capacity">Maximum guests</label><input id="type-capacity" type="number" required min="1" max="50" step="1" disabled={!!draft.id} value={draft.capacity} onChange={(e) => field('capacity', e.target.value)} />
            <label htmlFor="type-description">Description</label><textarea id="type-description" maxLength="1000" value={draft.description || ''} onChange={(e) => field('description', e.target.value)} />
            <p className="acc-muted">The rate applies to every room of this type.</p>
          </> : <>
            <label htmlFor="room-number">Room number</label><input id="room-number" autoFocus required maxLength="20" value={draft.number} onChange={(e) => field('number', e.target.value)} />
            <label htmlFor="room-type">Type</label><select id="room-type" required value={draft.roomTypeId} onChange={(e) => field('roomTypeId', e.target.value)}>
              <option value="">Choose a type</option>{types.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
            </select>
            <label htmlFor="room-notes">Notes</label><textarea id="room-notes" maxLength="500" value={draft.notes || ''} onChange={(e) => field('notes', e.target.value)} />
            {!draft.id && <p className="acc-muted">New rooms require cleaning before being marked clean.</p>}
            {draft.id && <p className="acc-muted">Room type and number changes require no active reservations or payment holds. Previous booking receipts keep their original details.</p>}
          </>}
          {(formError || error) && <p role="alert" className="acc-error">{formError || error} {error && 'If this record changed, cancel and refresh before editing again.'}</p>}
          <div className="acc-modal-actions"><button type="button" className="btn ghost-dark" onClick={() => setDraft(null)}>Cancel</button><button className="btn" type="submit">{busy ? 'Saving…' : 'Save'}</button></div>
        </fieldset>
      </form>
    </div></div>}
  </>
}
