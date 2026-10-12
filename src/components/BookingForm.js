import { useState } from 'react'
import useReveal from '../hooks/useReveal'

const today = new Date().toISOString().slice(0, 10)

export default function BookingForm() {
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [adults, setAdults] = useState(2)
  const [children, setChildren] = useState(0)
  const [message, setMessage] = useState('')
  const ref = useReveal()

  function handleCheckIn(e) {
    const val = e.target.value
    setCheckIn(val)
    if (checkOut && checkOut < val) setCheckOut('')
  }

  function handleCheckAvailability() {
    if (checkIn && checkOut) {
      setMessage(
        `Demo only: ${adults} adult${adults !== 1 ? 's' : ''}` +
          (children > 0 ? `, ${children} child${children !== 1 ? 'ren' : ''}` : '') +
          `. Connect this form to your booking engine.`
      )
    } else {
      setMessage('Please choose check-in and check-out dates.')
    }
  }

  return (
    <div className="wrap reveal book-wrap" ref={ref}>
      <form className="book" id="book" onSubmit={(e) => e.preventDefault()}>
        <div>
          <label htmlFor="ci">Check-in</label>
          <input id="ci" type="date" min={today} value={checkIn} onChange={handleCheckIn} />
        </div>

        <div>
          <label htmlFor="co">Check-out</label>
          <input
            id="co"
            type="date"
            min={checkIn || today}
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
          />
        </div>

        <div>
          <label>Adults</label>
          <div className="stepper">
            <span className="stepper-value">{adults}</span>
            <div className="stepper-btns">
              <button
                type="button"
                onClick={() => setAdults((a) => Math.min(a + 1, 50))}
                aria-label="Add adult"
              >
                +
              </button>
              <button
                type="button"
                onClick={() => setAdults((a) => Math.max(a - 1, 1))}
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
                onClick={() => setChildren((c) => Math.min(c + 1, 50))}
                aria-label="Add child"
              >
                +
              </button>
              <button
                type="button"
                onClick={() => setChildren((c) => Math.max(c - 1, 0))}
                aria-label="Remove child"
              >
                −
              </button>
            </div>
          </div>
        </div>

        <button className="btn" id="chk" type="button" onClick={handleCheckAvailability}>
          Check availability
        </button>
      </form>

      <p
        id="msg"
        style={{ textAlign: 'center', color: 'var(--acc)', minHeight: 24, margin: '10px 0 0' }}
      >
        {message}
      </p>
    </div>
  )
}