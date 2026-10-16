import { PROMOTIONS as DASHBOARD_PROMOS, promotionError } from '../../utils/promotions'
import { hotelDate } from '../../utils/hotel'
import { stayError } from '../../utils/validation'
import { useState } from 'react'
import { useAccount, nights, P, sd, T } from '../../context/AccountContext'
import TripCard from './TripCard'
import BookingModal from './BookingModal'

// ---- Dashboard-only promos ----


export default function HomeTab({ onNavigate }) {
  const { user, myBookings, cancelBooking, setPromo, TYPES } = useAccount()
  const [modal, setModal] = useState(null)
  const [promoModal, setPromoModal] = useState(null)

  const mine = myBookings()
  const today = hotelDate()
  const isUpcoming = (b) =>
    b.st !== 'cancelled' && b.out >= today && b.st !== 'checked-out'

  const upcoming = mine.filter(isUpcoming).sort((a, b) => (a.in > b.in ? 1 : -1))
  const past = mine.filter((b) => b.st === 'checked-out')
  const next = upcoming[0]
  const room = next ? TYPES.find((t) => t.n === next.type) : null

  const totalNights = past.reduce((s, b) => s + nights(b.in, b.out), 0)
  const totalSpent = past.reduce(
    (s, b) => s + b.paid,
    0
  )

  function handleViewDetails(id) {
    const b = mine.find((x) => x.id === id)
    if (b) setModal({ type: 'receipt', booking: b })
  }
  function handleCancel(id) {
    const b = mine.find((x) => x.id === id)
    if (!b) return
    setModal({
      type: 'cancel',
      booking: b,
      label: 'Yes, cancel',
      onConfirm: () => cancelBooking(id),
    })
  }

  // Called when the promo modal's Reserve view validates successfully
  function handlePromoConfirm(promoItem, dates) {
    setPromo({ ...promoItem, ...dates })
    setPromoModal(null)
    onNavigate('book')
  }

  const todayLabel = new Date(today + 'T00:00:00Z').toLocaleDateString('en-US', {
    timeZone: 'UTC',
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <>
      {/* HERO */}
      <div className="acc-hero">
        <div className="acc-hero-content">
          <span className="acc-hero-eyebrow">{todayLabel}</span>
          <h2>Welcome back, {user.name.split(' ')[0]}</h2>
          <p>Your stay at Twin Lakes Hotel, all in one place.</p>
          <div className="acc-hero-actions">
            <button className="btn acc-hero-btn" onClick={() => onNavigate('book')}>
              Book a stay
            </button>
            <button className="btn acc-hero-btn ghost" onClick={() => onNavigate('trips')}>
              View bookings
            </button>
          </div>
        </div>
        <img className="acc-hero-logo" src="/logo.png" alt="Twin Lakes Hotel" />
      </div>

      {/* STATS */}
      <div className="acc-stats">
        <div className="acc-stat-card"><span className="acc-stat-label">Upcoming stays</span><b>{upcoming.length}</b></div>
        <div className="acc-stat-card"><span className="acc-stat-label">Nights with us</span><b>{totalNights}</b></div>
        <div className="acc-stat-card"><span className="acc-stat-label">Past stays</span><b>{past.length}</b></div>
        <div className="acc-stat-card"><span className="acc-stat-label">Lifetime spend</span><b>{P(totalSpent)}</b></div>
      </div>

      {/* NEXT STAY */}
      <h2 className="acc-section-title">Next stay</h2>
      {next ? (
        <div className="acc-next-stay">
          <div className="acc-next-photo" style={{ backgroundImage: `url(${room?.img || '/room-1.jpg'})` }} />
          <div className="acc-next-info">
            <div className="acc-next-header">
              <h3>{next.type}</h3>
              <span className={`acc-badge ${next.st}`}>{next.st === 'checked-in' ? 'Checked in' : 'Confirmed'}</span>
            </div>
            <div className="acc-next-meta">
              <div><span className="acc-meta-label">Check-in</span><b>{next.in}</b></div>
              <div><span className="acc-meta-label">Check-out</span><b>{next.out}</b></div>
              <div><span className="acc-meta-label">Guests</span><b>{next.g}</b></div>
              <div><span className="acc-meta-label">Nights</span><b>{nights(next.in, next.out)}</b></div>
            </div>
            <div className="acc-next-footer">
              <div><span className="acc-meta-label">Reference</span><b>{next.id}</b></div>
              <div><span className="acc-meta-label">Total</span><span className="acc-price">{P(next.total)}</span></div>
            </div>
            <div className="acc-trip-actions">
              <button className="btn ghost-dark" onClick={() => handleViewDetails(next.id)}>View details</button>
              {next.in > today && (
                <button className="btn ghost-dark" onClick={() => handleCancel(next.id)}>Cancel booking</button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="acc-empty">
          No upcoming stays.{' '}
          <button className="acc-link" onClick={() => onNavigate('book')}>Plan one now</button>.
        </div>
      )}

      {/* RECENT */}
      {past.length > 0 && (
        <>
          <h2 className="acc-section-title">Recent stays</h2>
          {past.slice(0, 3).map((b) => (
            <TripCard key={b.id} booking={b} onViewDetails={handleViewDetails} onCancel={handleCancel} />
          ))}
        </>
      )}

      {/* PROMO DEALS */}
      <h2 className="acc-section-title">Exclusive offers for you</h2>
      <div className="acc-promos">
        {DASHBOARD_PROMOS.map((p) => (
          <button
            key={p.id}
            className="acc-promo"
            onClick={() => setPromoModal(p)}
            aria-label={`View details for ${p.title}`}
          >
            <div className="acc-promo-photo" style={{ backgroundImage: `url(${p.image})` }}>
              <span className="acc-promo-badge">{p.badge}</span>
            </div>
            <div className="acc-promo-body">
              <h3>{p.title}</h3>
              <p className="acc-muted acc-small">{p.description}</p>
              <p className="acc-promo-valid">{p.valid}</p>
            </div>
          </button>
        ))}
      </div>

      {/* MODALS */}
      <BookingModal modal={modal} onClose={() => setModal(null)} />

      {promoModal && (
        <PromoModal
          promo={promoModal}
          onClose={() => setPromoModal(null)}
          onConfirm={handlePromoConfirm}
        />
      )}
    </>
  )
}

// ============================================================
// PROMO MODAL (details → reserve → validate → confirm)
// ============================================================
function PromoModal({ promo, onClose, onConfirm }) {
  const [view, setView] = useState('details') // 'details' | 'reserve'
  const [checkIn, setCheckIn] = useState(sd(1))
  const [checkOut, setCheckOut] = useState(sd(2))
  const [adults, setAdults] = useState(2)
  const [children, setChildren] = useState(0)
  const [alert, setAlert] = useState(null) // { title, message }

  function validate() {
    const promoError = promotionError(promo.id, checkIn, checkOut)
    if (promoError) return { title: 'Promotion not applicable', message: promoError }
    const error = stayError({ in: checkIn, out: checkOut, adults, children })
    if (error) return { title: 'Check your reservation', message: error }
    const nightsCount = nights(checkIn, checkOut)

    if (checkIn >= checkOut) {
      return { title: 'Invalid dates', message: 'Check-out must be after check-in.' }
    }
    if (checkIn < T()) {
      return { title: 'Invalid dates', message: 'Check-in cannot be in the past.' }
    }
    if (adults < 1) {
      return { title: 'Invalid guests', message: 'At least 1 adult is required.' }
    }

    const r = promo.rule || {}

    if (r.minNights && nightsCount < r.minNights) {
      return {
        title: 'Promo not applicable',
        message: `"${promo.title}" requires a minimum of ${r.minNights} night(s). You selected ${nightsCount}.`,
      }
    }

    if (r.weekdaysOnly) {
      const day = new Date(checkIn + 'T00:00:00Z').getUTCDay()
      if (!r.weekdaysOnly.includes(day)) {
        return {
          title: 'Promo not applicable',
          message:
            `"${promo.title}" is only valid for check-ins on Sunday through Thursday. ` +
            `You selected a ${new Date(checkIn).toLocaleDateString('en-US', { weekday: 'long' })}.`,
        }
      }
    }

    return null
  }

  function handleConfirm() {
    const err = validate()
    if (err) {
      setAlert(err)
      return
    }
    onConfirm(promo, { in: checkIn, out: checkOut, a: adults, c: children })
  }

  return (
    <>
      <div className="acc-modal-overlay" onClick={onClose}>
        <div className="acc-modal acc-promo-modal" onClick={(e) => e.stopPropagation()}>
          <button className="acc-modal-x" onClick={onClose} aria-label="Close">×</button>

          <div className="acc-promo-modal-photo" style={{ backgroundImage: `url(${promo.image})` }}>
            <span className="acc-promo-badge">{promo.badge}</span>
          </div>

          <div className="acc-promo-modal-body">
            {view === 'details' && (
              <>
                <h3>{promo.title}</h3>
                <p className="acc-muted">{promo.description}</p>

                <div className="acc-promo-terms">
                  <h4>Terms &amp; Conditions</h4>
                  <ul>
                    {promo.terms.map((t, i) => <li key={i}>{t}</li>)}
                  </ul>
                </div>

                <div className="acc-promo-modal-actions">
                  <button className="btn ghost-dark" onClick={onClose}>Close</button>
                  <button className="btn" onClick={() => setView('reserve')}>Book now</button>
                </div>
              </>
            )}

            {view === 'reserve' && (
              <>
                <h3>Reserve your stay</h3>
                <p className="acc-muted acc-small">
                  Fulfilling <b>{promo.title}</b> — {promo.valid}
                </p>

                <div className="promo-form">
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
                        <button type="button" onClick={() => setAdults((a) => Math.min(a + 1, 20))}>+</button>
                        <button type="button" onClick={() => setAdults((a) => Math.max(a - 1, 1))}>−</button>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label>Children</label>
                    <div className="stepper">
                      <span className="stepper-value">{children}</span>
                      <div className="stepper-btns">
                        <button type="button" onClick={() => setChildren((c) => Math.min(c + 1, 10))}>+</button>
                        <button type="button" onClick={() => setChildren((c) => Math.max(c - 1, 0))}>−</button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="acc-promo-modal-actions">
                  <button className="btn ghost-dark" onClick={() => setView('details')}>Back</button>
                  <button className="btn" onClick={handleConfirm}>Confirm &amp; search rooms</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {alert && (
        <div className="alert-overlay" onClick={() => setAlert(null)}>
          <div className="alert-box" onClick={(e) => e.stopPropagation()}>
            <h3>{alert.title}</h3>
            <p>{alert.message}</p>
            <div className="alert-actions">
              <button className="btn" onClick={() => setAlert(null)}>OK</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}