import { useRef, useState } from 'react'
import { bookingRequest } from '../../utils/bookingApi'
import { stayError } from '../../utils/validation'
import { P, T, sd } from '../../context/AccountContext'

export default function RoomSearch({ initialSearch, onChoose, disabled = false }) {
  const [form, setForm] = useState({ in: initialSearch?.in || sd(1), out: initialSearch?.out || sd(2), adults: initialSearch?.adults ?? 2, children: initialSearch?.children ?? 0 })
  const [results, setResults] = useState(null), [busy, setBusy] = useState(false), [error, setError] = useState('')
  const sequence = useRef(0), lock = useRef(false)
  function field(key, value) {
    sequence.current++; setForm((old) => ({ ...old, [key]: value })); setResults(null); setError('')
  }
  async function search(event) {
    event.preventDefault()
    if (lock.current) return
    const validation = stayError(form)
    if (validation) return setError(validation)
    lock.current = true
    const ticket = ++sequence.current
    setBusy(true); setResults(null); setError('')
    const catalog = await bookingRequest('/rooms/catalog')
    let rows = [], problem = catalog.error
    if (!problem && !Array.isArray(catalog.types)) problem = 'Unexpected room catalog response.'
    if (!problem) {
      rows = await Promise.all(catalog.types.filter((t) => t.capacity >= form.adults + form.children).map(async (type) => {
        const stay = { roomTypeId: type.id, checkIn: form.in, checkOut: form.out, adults: form.adults, children: form.children }
        const quote = await bookingRequest('/bookings/availability?' + new URLSearchParams(stay))
        return { type, stay, quote }
      }))
      problem = rows.find((row) => row.quote.error)?.quote.error
    }
    if (ticket === sequence.current) {
      if (problem) setError(problem)
      else setResults(rows)
    }
    lock.current = false; setBusy(false)
  }
  return <>
    <form className="acc-search" onSubmit={search}>
      <fieldset disabled={busy || disabled} style={{ border: 0, padding: 0 }}><div className="acc-search-row">
        <div><label htmlFor="search-in">Check-in</label><input id="search-in" required type="date" min={T()} value={form.in} onChange={(e) => field('in', e.target.value)} /></div>
        <div><label htmlFor="search-out">Check-out</label><input id="search-out" required type="date" min={form.in || T()} value={form.out} onChange={(e) => field('out', e.target.value)} /></div>
        <div><label htmlFor="search-adults">Adults</label><input id="search-adults" required type="number" min="1" max="50" step="1" value={form.adults} onChange={(e) => field('adults', Number(e.target.value))} /></div>
        <div><label htmlFor="search-children">Children</label><input id="search-children" required type="number" min="0" max="49" step="1" value={form.children} onChange={(e) => field('children', Number(e.target.value))} /></div>
        <button className="btn" type="submit">{busy ? 'Checking…' : 'Check availability'}</button>
      </div></fieldset>
    </form>
    {error && <p role="alert" className="acc-error">{error}</p>}
    {results && results.length === 0 && <p role="status">No room types accommodate this guest count.</p>}
    {results && <div className="acc-room-grid">{results.map(({ type, stay, quote }) => <article className="acc-room-card" key={type.id}>
      <img className="acc-room-photo" src={type.image || '/room-1.jpg'} alt={type.name} style={{ width: '100%', objectFit: 'cover' }} />
      <h3>{type.name}</h3><p>{type.description}</p><p>Sleeps {type.capacity}</p>
      <p>{stay.checkIn} → {stay.checkOut}</p>
      <div className="acc-room-footer"><div><span className="acc-price">{P(quote.rateCents / 100)}</span> /night<p>{P(quote.totalCents / 100)} total</p></div>
        {quote.available > 0 ? <button className="btn" disabled={busy || disabled} onClick={() => onChoose({ type, stay, quote })}>Book now</button> : <span className="acc-badge cancelled">Unavailable</span>}
      </div>
    </article>)}</div>}
  </>
}
