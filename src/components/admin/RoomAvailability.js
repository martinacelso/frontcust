import { useEffect, useRef, useState } from 'react'
import { roomRequest } from '../../utils/roomApi'
import { hotelDate, addDays } from '../../utils/hotel'
import { P } from '../../context/AdminContext'

export default function RoomAvailability() {
  const [checkIn, setCheckIn] = useState(hotelDate())
  const [checkOut, setCheckOut] = useState(addDays(hotelDate(), 1))
  const [onlyAvailable, setOnlyAvailable] = useState(true)
  const [data, setData] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const generation = useRef(0)
  const lock = useRef(false)
  async function search(event) {
    event?.preventDefault()
    if (lock.current) return
    lock.current = true
    const ticket = ++generation.current
    setBusy(true); setError(''); setData(null)
    const result = await roomRequest('/availability?' + new URLSearchParams({ checkIn, checkOut }))
    if (ticket !== generation.current) return
    if (result.error) setError(result.error)
    else if (!Array.isArray(result.rooms) || !Array.isArray(result.types)) setError('Invalid availability response. Refresh and try again.')
    else setData(result)
    lock.current = false; setBusy(false)
  }
  useEffect(() => () => { generation.current++ }, [])
  const rows = data?.rooms.filter((room) => !onlyAvailable || room.available) || []
  return <section className="acc-card" style={{ marginBottom: 24, padding: 20 }} aria-labelledby="staff-availability-title">
    <h3 id="staff-availability-title">Room availability</h3>
    <p>Check rooms for the whole stay. Rooms awaiting cleaning are labelled separately and cannot be checked in yet.</p>
    <form onSubmit={search}>
      <fieldset disabled={busy} style={{ border: 0, padding: 0, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'end' }}>
        <div><label htmlFor="staff-room-arrival">Arrival</label><input id="staff-room-arrival" type="date" required min={hotelDate()} max={addDays(hotelDate(), 365)} value={checkIn}
          onChange={(e) => { setCheckIn(e.target.value); setData(null); setError('') }} /></div>
        <div><label htmlFor="staff-room-departure">Departure</label><input id="staff-room-departure" type="date" required min={addDays(checkIn, 1)} max={addDays(checkIn, 90)} value={checkOut}
          onChange={(e) => { setCheckOut(e.target.value); setData(null); setError('') }} /></div>
        <button className="admin-btn" type="submit">{busy ? 'Checking…' : 'Check availability'}</button>
      </fieldset>
    </form>
    {error && <p className="acc-error" role="alert">{error}</p>}
    {data && <>
      <p role="status">{data.rooms.filter((r) => r.available).length} rooms available from {data.checkIn} to {data.checkOut}.</p>
      <label><input type="checkbox" style={{ width: 'auto', marginRight: 8 }} checked={onlyAvailable} onChange={(e) => setOnlyAvailable(e.target.checked)} />Show available rooms only</label>
      <div className="admin-table-wrap"><table className="admin-table">
        <thead><tr><th>Room</th><th>Type</th><th>Capacity</th><th>Rate / night</th><th>Availability</th></tr></thead>
        <tbody>{rows.map((room) => {
          const type = data.types.find((t) => t.id === room.roomTypeId)
          return <tr key={room.id}><td>{room.number}</td><td>{type?.name || 'Unknown type'}</td><td>{type?.capacity ?? '—'}</td><td>{type ? P(type.rate) : '—'}</td><td>{room.availability}</td></tr>
        })}{!rows.length && <tr><td colSpan="5">No rooms match this filter.</td></tr>}</tbody>
      </table></div>
      <p className="acc-muted acc-small">Checked at {new Date(data.checkedAt).toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila' })} Philippine time. Check again before booking; this search does not hold a room.</p>
    </>}
  </section>
}
