import { useEffect, useState } from 'react'
import useReveal from '../hooks/useReveal'
import { useAuth } from '../hooks/useAuth'
import { bookingRequest } from '../utils/bookingApi'
export default function Rooms() {
  const [rooms, setRooms] = useState([]), [index, setIndex] = useState(0), [error, setError] = useState(''), [loading, setLoading] = useState(true)
  const ref = useReveal(), { openAuth } = useAuth()
  useEffect(() => { let current = true; bookingRequest('/rooms/catalog').then((r) => { if (!current) return; if (r.error) setError(r.error); else setRooms(r.types); setLoading(false) }); return () => { current = false } }, [])
  const room = rooms[index]
  return <section id="rooms"><div className="wrap reveal" ref={ref}><span className="rooms-badge">ROOMS</span><h2 className="rooms-title">Spacious Accommodations</h2>
    {error && <p role="alert">{error}</p>}{loading && <p>Loading rooms…</p>}{!loading && !error && !room && <p>Rooms are currently unavailable.</p>}
    {room && <><div className="rooms-slider"><div className="rooms-photo"><img src={room.image || '/room-1.jpg'} alt={room.name} /></div>
      <div className="rooms-info"><div className="rooms-info-header"><h3>{room.name}</h3><div className="rooms-nav"><button aria-label="Previous room" onClick={() => setIndex((n) => (n + rooms.length - 1) % rooms.length)}>←</button><button aria-label="Next room" onClick={() => setIndex((n) => (n + 1) % rooms.length)}>→</button></div></div>
        <p className="rooms-desc">{room.description}</p><ul className="rooms-details"><li><strong>Capacity:</strong> {room.capacity} guests</li><li><strong>Nightly rate:</strong> {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(room.rate)}</li></ul>
        <button className="btn rooms-book" onClick={openAuth}>Book Now</button></div></div>
      <div className="rooms-dots">{rooms.map((r, n) => <button key={r.id} className={n === index ? 'dot active' : 'dot'} aria-label={'View ' + r.name} onClick={() => setIndex(n)} />)}</div></>}
  </div></section>
}
