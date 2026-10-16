import { quoteStay } from '../../utils/promotions'
import { addDays } from '../../utils/hotel'
import { stayError } from '../../utils/validation'
import { useState } from 'react'
import {
  useAccount,
  sd,
  T,
  nights,
  P,
  downPayment,
} from '../../context/AccountContext'
import BookingModal from './BookingModal'

export default function BookTab({ initialSearch = null, onBooked = () => {} }) {
  const { TYPES, roomsAvailable, addBooking, promo, setPromo } = useAccount()

  const [checkIn, setCheckIn] = useState(promo?.in || initialSearch?.in || sd(1))
  const [checkOut, setCheckOut] = useState(promo?.out || initialSearch?.out || sd(2))
  const [adults, setAdults] = useState(promo?.a ?? initialSearch?.adults ?? 2)
  const [children, setChildren] = useState(promo?.c ?? initialSearch?.children ?? 0)
  const [modal, setModal] = useState(null)

  const totalGuests = adults + children

  // Always the dates/guests currently shown in the search boxes, so prices and the
  // Book now button can never use stale dates.
  const form = { in: checkIn, out: checkOut, a: adults, c: children }
  const datesValid = checkIn >= T() && checkIn < checkOut

  // Keep check-out after check-in
  function handleCheckIn(value) {
    setCheckIn(value)
    if (value && (!checkOut || checkOut <= value)) {
      setCheckOut(addDays(value, 1))
    }
  }

  // Apply the active promo to a raw total
  function applyDiscount(total, roomType) {
    const quote = quoteStay(roomType, form.in, form.out, promo?.id)
    if (quote.error) return { total, label: null, error: quote.error }
    return { total: quote.total, label: quote.label }
  }

  function handleSearch() {
    const error = stayError({ in: checkIn, out: checkOut, adults, children })
    if (error) return window.alert(error)
    if (checkIn >= checkOut) {
      alert('Check-out must be after check-in.')
      return
    }
    if (totalGuests < 1) {
      alert('At least 1 adult is required.')
      return
    }
  }

  // Step 1: open the checkout modal showing the down payment
  function handleBook(roomType) {
    const error = stayError({ in: checkIn, out: checkOut, adults, children }, { capacity: roomType.s })
    if (error) return window.alert(error)
    if (roomsAvailable(roomType.n, checkIn, checkOut) <= 0) return window.alert('No rooms available for these dates.')
    if (!datesValid) {
      alert('Please choose a check-in date (today or later) and a check-out date after it.')
      return
    }
    const rawTotal = roomType.r * nights(form.in, form.out)
    const quote = quoteStay(roomType, form.in, form.out, promo?.id)
    if (quote.error) return window.alert(quote.error)
    const { total, label } = quote
    const proceed = window.confirm(
      `Continue with this booking?\n\nRoom: ${roomType.n}\nCheck-in: ${form.in}\nCheck-out: ${form.out}\nGuests: ${form.a} adult(s), ${form.c} child(ren)\nTotal: ${P(total)}\nDown payment: ${P(downPayment(total))}\n\nSelect OK to continue to payment, or Cancel to go back.`
    )
    if (!proceed) return
    setModal({
      type: 'checkout',
      label: 'Pay down payment',
      checkout: {
        room: roomType.n,
        in: form.in,
        out: form.out,
        nights: nights(form.in, form.out),
        rawTotal,
        total,
        discountLabel: label,
      },
      // Demo only: create the booking and its simulated down-payment record.
      onConfirm: (method, payRef) => {
        const created = addBooking({
          type: roomType.n,
          in: form.in,
          out: form.out,
          adults: form.a,
          children: form.c,
          note: '',
          promoId: promo?.id || null,
          quote,
          paid: downPayment(total),
          payMethod: method,
          payRef,
        })
        if (created.error) return created
        setModal({ type: 'confirmed', booking: created })
        setPromo(null)
        onBooked()
        return false // keep the modal open to show the confirmation
      },
    })
  }

  const selectedRoom = !promo && initialSearch?.type ? TYPES.find((t) => t.n === initialSearch.type) : null

  const results = TYPES.filter(
    (t) => t.s >= form.a + form.c && datesValid
  )

  return (
    <>
      <h2 className="acc-section-title">Find your room</h2>

      {initialSearch && !promo && (
        <div className="acc-card" style={{ marginBottom: 20 }}>
          <p>Your dates and guest count from the availability search are filled in below.</p>
          {selectedRoom ? <>
            <p>Selected room: <b>{selectedRoom.n}</b>. Review your dates and the current price before continuing.</p>
            {datesValid && totalGuests <= selectedRoom.s && roomsAvailable(selectedRoom.n, checkIn, checkOut) > 0 ? (
              <button className="btn" onClick={() => handleBook(selectedRoom)}>Continue with {selectedRoom.n}</button>
            ) : <p className="acc-error" role="alert">Your selected room is unavailable for these dates or guest count. Please choose another option below.</p>}
          </> : <p className="acc-error" role="alert">Your selected room type is no longer offered. Please choose another option below.</p>}
        </div>
      )}

      {promo && (
        <div className="promo-banner">
          <div>
            <span className="acc-promo-badge">{promo.badge}</span>
            <b style={{ marginLeft: 10 }}>{promo.title}</b>
          </div>
          <button className="acc-link" onClick={() => setPromo(null)}>
            Remove
          </button>
        </div>
      )}

      <div className="acc-search">
        <div className="acc-search-row">
          <div>
            <label>Check-in</label>
            <input
              type="date"
              min={T()}
              value={checkIn}
              onChange={(e) => handleCheckIn(e.target.value)}
            />
          </div>
          <div>
            <label>Check-out</label>
            <input
              type="date"
              min={checkIn || T()}
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
                  onClick={() => setAdults((a) => Math.min(a + 1, 20))}
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
                  onClick={() => setChildren((c) => Math.min(c + 1, 10))}
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
          <div>
            <button className="btn acc-search-btn" onClick={handleSearch}>
              Search
            </button>
          </div>
        </div>
      </div>

      {!datesValid && (
        <p className="acc-muted">Choose a check-in date (today or later) and a check-out date after it to see rooms.</p>
      )}

      <div className="acc-room-grid">
        {results.map((t) => {
          const available = roomsAvailable(t.n, form.in, form.out)
          const nightsCount = nights(form.in, form.out)
          const total = t.r * nightsCount

          return (
            <div className="acc-room-card" key={t.n}>
              <div
                className="acc-room-photo"
                style={{ backgroundImage: `url(${t.img})` }}
              />
              <h3>{t.n}</h3>
              <p className="acc-muted acc-small">{t.d}</p>
              <p className="acc-muted acc-small">Sleeps {t.s}</p>

              <div className="acc-room-footer">
                <div>
                  {(() => {
                    const { total: finalTotal, label } = applyDiscount(total, t)
                    const hasDiscount = finalTotal !== total
                    return hasDiscount ? (
                      <>
                        <div
                          className="acc-muted acc-small"
                          style={{ textDecoration: 'line-through' }}
                        >
                          {P(total)}
                        </div>
                        <span className="acc-price">{P(finalTotal)}</span>
                        <span className="acc-muted"> total</span>
                        <div className="acc-promo-valid">✓ {label}</div>
                      </>
                    ) : (
                      <>
                        <span className="acc-price">{P(t.r)}</span>
                        <span className="acc-muted"> /night</span>
                        <div className="acc-muted acc-small">{P(total)} total</div>
                        {label && <div className="acc-promo-valid">✓ {label}</div>}
                      </>
                    )
                  })()}
                </div>
                {available > 0 ? (
                  <button className="btn" onClick={() => handleBook(t)}>
                    Book now
                  </button>
                ) : (
                  <span className="acc-badge cancelled">Unavailable</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <BookingModal modal={modal} onClose={() => setModal(null)} />
    </>
  )
}
