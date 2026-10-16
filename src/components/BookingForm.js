import { stayError, localDate } from '../utils/validation'
import { useState } from 'react'
import { useAccount, nights, P } from '../context/AccountContext'
import { addDays } from '../utils/hotel'
import { quoteStay } from '../utils/promotions'
import useReveal from '../hooks/useReveal'



export default function BookingForm({ onBook }) {
  const { TYPES, roomsAvailable } = useAccount()
  const [search, setSearch] = useState(null)
  const today = localDate()
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [adults, setAdults] = useState(2)
  const [children, setChildren] = useState(0)
  const [message, setMessage] = useState('')
  const ref = useReveal()

  function handleCheckIn(e) {
    const val = e.target.value
    setCheckIn(val)
    setSearch(null)
    setMessage('')
    if (checkOut && checkOut <= val) setCheckOut('')
  }

  function handleCheckAvailability() {
    const selection = { in: checkIn, out: checkOut, adults, children }
    const error = stayError(selection)
    if (error) { setSearch(null); setMessage(error); return }
    setMessage('')
    setSearch(selection)
  }

  function updateSearchField(setter, value) {
    setter(value)
    setSearch(null)
    setMessage('')
  }

  const matches = search ? TYPES.filter((t) =>
    t.s >= search.adults + search.children &&
    !stayError(search, { capacity: t.s }) &&
    roomsAvailable(t.n, search.in, search.out) > 0
  ).map((t) => ({ type: t, quote: quoteStay(t, search.in, search.out) })).filter((item) => !item.quote.error) : []

  function chooseRoom(type) {
    if (!search) return
    const error = stayError(search, { capacity: type.s })
    if (error) return setMessage(error)
    if (roomsAvailable(type.n, search.in, search.out) <= 0) return setMessage('This room is no longer available. Please choose another room or different dates.')
    if (typeof onBook !== 'function') return setMessage('Booking is temporarily unavailable. Please try again.')
    onBook({ ...search, type: type.n })
  }

  return (
    <div className="wrap reveal book-wrap" ref={ref}>
      <form className="book" id="book" onSubmit={(e) => { e.preventDefault(); handleCheckAvailability() }}>
        <div>
          <label htmlFor="ci">Check-in</label>
          <input id="ci" type="date" min={today} value={checkIn} onChange={handleCheckIn} />
        </div>

        <div>
          <label htmlFor="co">Check-out</label>
          <input
            id="co"
            type="date"
            min={checkIn ? addDays(checkIn, 1) : addDays(today, 1)}
            value={checkOut}
            onChange={(e) => updateSearchField(setCheckOut, e.target.value)}
          />
        </div>

        <div>
          <label>Adults</label>
          <div className="stepper">
            <span className="stepper-value">{adults}</span>
            <div className="stepper-btns">
              <button
                type="button"
                onClick={() => updateSearchField(setAdults, Math.min(adults + 1, 50))}
                aria-label="Add adult"
              >
                +
              </button>
              <button
                type="button"
                onClick={() => updateSearchField(setAdults, Math.max(adults - 1, 1))}
                aria-label="Remove adult"
              >
                −
              </button>
            </div>
          </div>
        </div>

        <div>
          <label>Children</label>
          <div className="stepper">
            <span className="stepper-value">{children}</span>
            <div className="stepper-btns">
              <button
                type="button"
                onClick={() => updateSearchField(setChildren, Math.min(children + 1, 50))}
                aria-label="Add child"
              >
                +
              </button>
              <button
                type="button"
                onClick={() => updateSearchField(setChildren, Math.max(children - 1, 0))}
                aria-label="Remove child"
              >
                −
              </button>
            </div>
          </div>
        </div>

        <button className="btn" id="chk" type="submit">
          Check availability
        </button>
      </form>

      <p
        id="msg"
        role="alert"
        style={{ textAlign: 'center', color: 'var(--acc)', minHeight: 24, margin: '10px 0 0' }}
      >
        {message}
      </p>
      {search && (
        <div aria-labelledby="availability-title" style={{ marginTop: 24 }}>
          <h2 id="availability-title">Available rooms</h2>
          <p role="status" aria-live="polite" className="acc-muted">
            {search.in} → {search.out} · {nights(search.in, search.out)} night(s) · {search.adults} adult(s), {search.children} child(ren) · {matches.length} room type(s) available
          </p>
          {matches.length === 0 ? (
            <div className="acc-empty">No rooms available for these dates. Please try different dates or fewer guests.</div>
          ) : <>
            <p className="acc-muted acc-small">Choose a room to sign in or create an account. Your selection will be carried over. Availability is checked again before booking.</p>
            <div className="acc-room-grid">
              {matches.map(({ type, quote }) => (
                <article className="acc-room-card" key={type.n}>
                  <img className="acc-room-photo" src={type.img || '/room-1.jpg'} alt={type.n} style={{ width: '100%', objectFit: 'cover', display: 'block' }} />
                  <h3>{type.n}</h3>
                  <p className="acc-muted acc-small">{type.d || type.desc}</p>
                  <p className="acc-muted acc-small">Sleeps {type.s} · {nights(search.in, search.out)} night(s)</p>
                  <div className="acc-room-footer">
                    <div><span className="acc-price">{P(quote.rate)}</span><span className="acc-muted"> /night</span><div className="acc-muted acc-small">{P(quote.total)} total</div></div>
                    <button type="button" className="btn" onClick={() => chooseRoom(type)}>Book now</button>
                  </div>
                </article>
              ))}
            </div>
          </>}
        </div>
      )}
    </div>
  )
}