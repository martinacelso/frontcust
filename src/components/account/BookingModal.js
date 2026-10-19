import { paymentDetailsError, paymentDetailsPayload } from '../../utils/paymentDetails'
import PaymentMethod from './PaymentMethod'
import { receiptText } from '../../utils/billing'
import { useEffect, useRef, useState } from 'react'
import { P, useAccount } from '../../context/AccountContext'
import { STATUS_LABELS } from '../../utils/bookingApi'

export default function BookingModal({ modal, onClose }) {
  if (!modal) return null
  return <Dialog key={modal.type + (modal.booking?.id || modal.requestId || '')} modal={modal} onClose={onClose} />
}
function Dialog({ modal, onClose }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState('')
  const lock = useRef(false)
  const { user } = useAccount()
  const [method, setMethod] = useState('GCash')
  const [details, setDetails] = useState({})
  const [approved, setApproved] = useState(false)
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const keydown = (e) => { if (e.key === 'Escape' && !lock.current) onClose() }
    document.addEventListener('keydown', keydown)
    return () => { document.body.style.overflow = previous; document.removeEventListener('keydown', keydown) }
  }, [onClose])
  async function confirm() {
    if (lock.current) return
    if (modal.type === 'simulate' && !approved) return
    if (modal.type === 'simulate') { const problem = paymentDetailsError(method, details); if (problem) { setError(problem); return } }
    lock.current = true; setBusy(true); setError('')
    try {
      const result = await modal.onConfirm(method, modal.type === 'simulate' ? paymentDetailsPayload(method, details) : undefined)
      if (result?.error) setError(result.error)
      else if (result !== false) onClose()
    } catch { setError('Unable to confirm the result. Check My bookings before starting another reservation.') }
    finally { lock.current = false; setBusy(false) }
  }
  const b = modal.booking, c = modal.checkout
  const title = { checkout: 'Review reservation', receipt: 'Booking details', cancel: 'Cancel this reservation?', simulate: 'Confirm down payment', confirmed: 'Booking confirmed', hold: 'Room held for you' }[modal.type] || 'Booking'
  return <div className="acc-modal-overlay" onClick={() => { if (!lock.current) onClose() }}>
    <div className="acc-modal" role="dialog" aria-modal="true" aria-labelledby="booking-dialog-title" onClick={(e) => e.stopPropagation()}>
      <h3 id="booking-dialog-title">{title}</h3>
      {c && <><p>{c.type.name}</p><p>{c.stay.checkIn} → {c.stay.checkOut}</p><p>{c.stay.adults} adult(s), {c.stay.children} child(ren)</p>
        <p>Total: <b>{P(c.quote.totalCents / 100)}</b></p><p>20% down payment: <b>{P(c.quote.depositCents / 100)}</b></p><p>Reserve the room for 30 minutes, then pay the down payment to confirm it.</p></>}
      {b && <><p>Reference: <b style={{ overflowWrap: 'anywhere' }}>{b.id}</b></p><p>{b.type} · {b.in} → {b.out}</p>
        <p>Status: <b>{STATUS_LABELS[b.st] || b.st}</b></p>
        <table className="acc-receipt"><tbody><tr><td>Room total</td><td>{P(b.total)}</td></tr>
          <tr><td>{b.simulation ? 'Payment recorded' : 'Paid'}</td><td>{P(b.paid)}</td></tr>
          <tr><td>Remaining balance</td><td>{P(['cancelled', 'expired'].includes(b.st) ? 0 : Math.max(0, b.total - b.paid))}</td></tr></tbody></table>
        {b.st === 'pending-payment' && <p>Hold expires: {new Date(b.holdUntil).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })} (Philippine time).</p>}
        {b.simulation && <p className="acc-muted" style={{ overflowWrap: 'anywhere' }}>{b.simulation.method || 'Payment'} reference: {b.simulation.reference}. No money was charged.</p>}</>}
      {b?.settlement && <p>Balance payment: {P(b.settlement.amountCents / 100)} · {b.settlement.method || 'Payment'} · {b.settlement.reference}</p>}
      {b?.refund && <p role="status">Refund recorded: {P(b.refunded)} · {b.refund.method} · {b.refund.reference}. No real money moved.</p>}
      {modal.type === 'simulate' && <>
        <PaymentMethod value={method} onChange={(value) => { setMethod(value); setDetails({}); setApproved(false) }} details={details} onDetailsChange={(value) => { setDetails(value); setApproved(false); setError('') }} disabled={busy} />
        <p>Down payment: <b>{P(b.deposit)}</b> using <b>{method}</b>.</p>
        <label><input type="checkbox" checked={approved} disabled={busy} onChange={(e) => setApproved(e.target.checked)} /> I confirm this amount and payment method.</label>
      </>}
      {modal.type === 'cancel' && <p>This releases the reservation. Before check-in, any recorded deposit receives a full refund to its original method. Same-day guest cancellations require staff assistance.</p>}
      {modal.type === 'cancel' && b.paid > b.refunded && <p>Refund amount: <b>{P(b.paid - b.refunded)}</b>. Refund recorded in your booking balance; no funds are transferred.</p>}
      {b && ['receipt', 'confirmed'].includes(modal.type) && <button className="btn ghost-dark" onClick={() => {
        const text = receiptText({ id: b.id, guest: { name: user?.name }, roomNumber: 'Assigned at the front desk', type: b.type,
          checkIn: b.in, checkOut: b.out, status: b.st, totalCents: Math.round(b.total * 100), paidCents: Math.round(b.paid * 100),
          refundedCents: Math.round(b.refunded * 100), simulatedPayment: b.simulation, simulatedSettlement: b.settlement, simulatedRefund: b.refund })
        const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }))
        const link = document.createElement('a'); link.href = url; link.download = 'receipt-' + b.id + '.txt'
        document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000)
      }}>Download receipt</button>}
      {error && <p className="acc-error" role="alert">{error}</p>}
      <div className="acc-modal-actions"><button className="btn ghost-dark" disabled={busy} onClick={onClose}>Close</button>
        {modal.onConfirm && <button className="btn" disabled={busy || (modal.type === 'simulate' && !approved)} onClick={confirm}>{busy ? 'Please wait…' : modal.label || 'Confirm'}</button>}
      </div>
    </div>
  </div>
}
