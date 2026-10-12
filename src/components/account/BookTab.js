import { useState, useEffect } from 'react'
import {
  useAccount,
  sd,
  T,
  nights,
  P,
  TYPES,
} from '../../context/AccountContext'
import BookingModal from './BookingModal'

export default function BookTab() {
  const { bookings, addBooking, promo, setPromo } = useAccount()

  const [checkIn, setCheckIn] = useState(sd(1))
  const [checkOut, setCheckOut] = useState(sd(2))
  const [adults, setAdults] = useState(2)
  const [children, setChildren] = useState(0)
  const [form, setForm] = useState({ in: sd(1), out: sd(2), a: 2, c: 0 })
  const [modal, setModal] = useState(null)

  const totalGuests = adults + children

  // Pre-fill search when a promo arrives from the Home tab
  useEffect(() => {
    if (promo?.in && promo?.out) {
      setCheckIn(promo.in)
      setCheckOut(promo.out)
      setAdults(promo.a ?? 2)
      setChildren(promo.c ?? 0)
      setForm({
        in: promo.in,
        out: promo.out,
        a: promo.a ?? 2,
        c: promo.c ?? 0,
      })
    }
  }, [promo])

  function roomsAvailable(roomType, from, to) {
    const overlapping = bookings.filter(
      (b) =>
        b.type === roomType.n &&
        b.st !== 'cancelled' &&
        b.in < to &&
        b.out > from
    ).length
    return roomType.c - overlapping
  }

  // Apply the active promo to a raw total
  function applyDiscount(total) {
    if (!promo?.discount) return { total, label: null }
    const d = promo.discount
    if (d.type === 'percent') {
      return {
        total: Math.round(total * (1 - d.value / 100)),
        label: `${d.value}% off applied`,
      }
    }
    if (d.type === 'fixed') {
      return {
        total: Math.max(0, total - d.value),
        label: `₱${d.value.toLocaleString()} off applied`,
      }
    }
    if (d.type === 'upgrade') {
      return { total, label: 'Free upgrade at check-in' }
    }
    return { total, label: null }
  }

  function handleSearch() {
    if (checkIn >= checkOut) {
      alert('Check-out must be after check-in.')
      return
    }
    if (totalGuests < 1) {
      alert('At least 1 adult is required.')
      return
    }
    setForm({ in: checkIn, out: checkOut, a: adults, c: children })
  }

  function handleBook(roomType) {
    const created = addBooking({
      type: roomType.n,
      in: form.in,
      out: form.out,
      g: form.a + form.c,
      note: '',
      promoId: promo?.id || null,
    })
    setModal({ type: 'confirmed', booking: created })
    setPromo(null)
  }

  const results = TYPES.filter(
    (t) => t.s >= form.a + form.c && form.in < form.out && form.in >= T()
  )

  return (
    <>
      <h2 className="acc-section-title">Find your room</h2>

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
              onChange={(e) => setCheckIn(e.target.value)}
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

      <div className="acc-room-grid">
        {results.map((t) => {
          const available = roomsAvailable(t, form.in, form.out)
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
                    const { total: finalTotal, label } = applyDiscount(total)
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
                    Book
                  </button>
                ) : (
                  <span className="acc-badge cancelled">Sold out</span>
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