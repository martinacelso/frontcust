import { useEffect, useRef, useState } from 'react'
import { P } from '../../context/AccountContext'
import { STATUS_LABELS } from '../../utils/bookingApi'

export default function BookingModal({ modal, onClose }) {
  if (!modal) return null
  return <Dialog key={modal.type + (modal.booking?.id || modal.requestId || '')} modal={modal} onClose={onClose} />
}
function Dialog({ modal, onClose }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState('')
  const lock = useRef(false)
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const keydown = (e) => { if (e.key === 'Escape' && !lock.current) onClose() }
    document.addEventListener('keydown', keydown)
    return () => { document.body.style.overflow = previous; document.removeEventListener('keydown', keydown) }
  }, [onClose])
  async function confirm() {
    if (lock.current) return
    lock.current = true; setBusy(true); setError('')
    try {
      const result = await modal.onConfirm()
      if (result?.error) setError(result.error)
      else if (result !== false) onClose()
    } catch { setError('Unable to confirm the result. Check My bookings before starting another reservation.') }
    finally { lock.current = false; setBusy(false) }
  }
  const b = modal.booking, c = modal.checkout
  const title = { checkout: 'Review reservation', receipt: 'Booking details', cancel: 'Cancel this reservation?', simulate: 'Simulate down payment?', confirmed: 'Booking confirmed', hold: 'Room held for you' }[modal.type] || 'Booking'
  return <div className="acc-modal-overlay" onClick={() => { if (!lock.current) onClose() }}>
    <div className="acc-modal" role="dialog" aria-modal="true" aria-labelledby="booking-dialog-title" onClick={(e) => e.stopPropagation()}>
      <h3 id="booking-dialog-title">{title}</h3>
      {c && <><p>{c.type.name}</p><p>{c.stay.checkIn} → {c.stay.checkOut}</p><p>{c.stay.adults} adult(s), {c.stay.children} child(ren)</p>
        <p>Total: <b>{P(c.quote.totalCents / 100)}</b></p><p>20% down payment: <b>{P(c.quote.depositCents / 100)}</b></p><p>Reserve the room for 30 minutes, then simulate the down payment to confirm it.</p></>}
      {b && <><p>Reference: <b style={{ overflowWrap: 'anywhere' }}>{b.id}</b></p><p>{b.type} · {b.in} → {b.out}</p>
        <p>Status: <b>{STATUS_LABELS[b.st] || b.st}</b></p>
        <table className="acc-receipt"><tbody><tr><td>Room total</td><td>{P(b.total)}</td></tr>
          <tr><td>{b.simulation ? 'Simulated payment recorded' : 'Paid'}</td><td>{P(b.paid)}</td></tr>
          <tr><td>Remaining balance</td><td>{P(Math.max(0, b.total - b.paid))}</td></tr></tbody></table>
        {b.st === 'pending-payment' && <p>Hold expires: {new Date(b.holdUntil).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })} (Philippine time).</p>}
        {b.simulation && <p className="acc-muted" style={{ overflowWrap: 'anywhere' }}>Test reference: {b.simulation.reference}. No money was charged.</p>}</>}
      {modal.type === 'simulate' && <p>Record a <b>{P(b.deposit)}</b> test down payment and confirm this booking? No money will be charged.</p>}
      {modal.type === 'cancel' && <p>This releases the room hold. You will need to search again to make another reservation.</p>}
      {error && <p className="acc-error" role="alert">{error}</p>}
      <div className="acc-modal-actions"><button className="btn ghost-dark" disabled={busy} onClick={onClose}>Close</button>
        {modal.onConfirm && <button className="btn" disabled={busy} onClick={confirm}>{busy ? 'Please wait…' : modal.label || 'Confirm'}</button>}
      </div>
    </div>
  </div>
}
