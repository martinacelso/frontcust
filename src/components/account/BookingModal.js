import { useEffect, useState } from 'react'
import {
  useAccount,
  nights,
  P,
  DOWN_PAYMENT_RATE,
  downPayment,
  PAYMENT_METHODS,
} from '../../context/AccountContext'
import { validatePayment, PaymentFields } from '../../utils/payment'

const STATUS_LABELS = {
  confirmed: 'Confirmed',
  'checked-in': 'Checked in',
  'checked-out': 'Checked out',
  cancelled: 'Cancelled',
}

export default function BookingModal({ modal, onClose }) {
  if (!modal) return null
  const key = [modal.type, modal.booking?.id, modal.checkout?.room, modal.checkout?.in, modal.checkout?.out].join(':')
  return <BookingDialog key={key} modal={modal} onClose={onClose} />
}

function BookingDialog({ modal, onClose }) {
  const [method, setMethod] = useState(PAYMENT_METHODS[0])
  const [details, setDetails] = useState({})
  const [error, setError] = useState('')

  const changeMethod = (m) => {
    setMethod(m)
    setDetails({})
    setError('')
  }
  const setField = (key, value) => {
    setDetails((d) => ({ ...d, [key]: value }))
    setError('')
  }

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  if (!modal) return null

  const { type, booking, checkout, onConfirm, label } = modal

  return (
    <div className="acc-modal-overlay" onClick={onClose}>
      <div className="acc-modal" onClick={(e) => e.stopPropagation()}>
        <div className="acc-modal-body">
          {type === 'checkout' && checkout && (
            <CheckoutBody
              checkout={checkout}
              method={method}
              setMethod={changeMethod}
              details={details}
              setField={setField}
              error={error}
            />
          )}
          {type === 'receipt' && booking && <ReceiptBody booking={booking} />}
          {type === 'cancel' && booking && <CancelBody booking={booking} />}
          {type === 'confirmed' && booking && <ConfirmedBody booking={booking} />}
        </div>

        {type !== 'checkout' && error && <p className="acc-error" role="alert">{error}</p>}
        <div className="acc-modal-actions">
          <button className="btn ghost-dark" onClick={onClose}>
            {type === 'checkout' ? 'Cancel' : 'Close'}
          </button>
          {onConfirm && (
            <button
              className="btn"
              onClick={() => {
                let args = []
                if (type === 'checkout') {
                  const res = validatePayment(method, details)
                  if (res.error) {
                    setError(res.error)
                    return
                  }
                  if (!checkout || !Number.isFinite(checkout.total) || checkout.total < 0) {
                    setError('The booking total is invalid. Close this form and select your room again.')
                    return
                  }
                  setError('')
                  const proceed = window.confirm(
                    `Confirm down payment?\n\nRoom: ${checkout.room}\nCheck-in: ${checkout.in}\nCheck-out: ${checkout.out}\nPayment method: ${method}\nDown payment: ${P(downPayment(checkout.total))}\n\nSelect OK to confirm, or Cancel to review your payment details.`
                  )
                  if (!proceed) return
                  args = [method, res.ref]
                }
                const result = onConfirm(...args)
                if (result?.error) { setError(result.error); return }
                if (result !== false) onClose()
              }}
            >
              {label || 'Confirm'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function ReceiptBody({ booking }) {
  const { user, TYPES } = useAccount()
  const room = TYPES.find((t) => t.n === booking.type)
  const nightCount = nights(booking.in, booking.out)
  const roomCharge = booking.roomCharge ?? nightCount * (room?.r || 0)
  const extrasTotal = (booking.extras || []).reduce((s, x) => s + x.a, 0)
  const total = booking.total ?? roomCharge
  const balance = booking.st === 'cancelled' ? 0 : total - booking.paid

  return (
    <>
      <h3>Booking {booking.id}</h3>
      <p className="acc-muted">
        {user?.name}
        <br />
        {booking.in} → {booking.out}
      </p>
      <table className="acc-receipt">
        <tbody>
          <tr>
            <td>{booking.type} × {nightCount} night(s)</td>
            <td>{P(roomCharge)}</td>
          </tr>
          {extrasTotal > 0 && (
            <tr>
              <td>Extras</td>
              <td>{P(extrasTotal)}</td>
            </tr>
          )}
          {booking.disc > 0 && (
            <tr>
              <td>Discount</td>
              <td>−{P(booking.disc)}</td>
            </tr>
          )}
          <tr>
            <td>Net paid after refunds</td>
            <td>{P(booking.paid)}</td>
          </tr>
          {booking.refunded > 0 && <tr><td>Refunded</td><td>{P(booking.refunded)}</td></tr>}
          <tr>
            <td><b>Balance due at hotel</b></td>
            <td><b>{P(balance)}</b></td>
          </tr>
        </tbody>
      </table>
      <p>
        <span className={`acc-badge ${booking.st}`}>
          {STATUS_LABELS[booking.st] || booking.st}
        </span>
      </p>
      <button className="btn ghost-dark no-print" onClick={() => window.print()}>
        Print
      </button>
    </>
  )
}

function CheckoutBody({ checkout, method, setMethod, details, setField, error }) {
  const { room, in: checkIn, out: checkOut, nights: nightCount, rawTotal, total, discountLabel } = checkout
  const down = downPayment(total)
  const balance = total - down
  const pct = Math.round(DOWN_PAYMENT_RATE * 100)

  return (
    <>
      <h3>Confirm &amp; pay down payment</h3>
      <p className="acc-muted">
        {room}
        <br />
        {checkIn} → {checkOut} · {nightCount} night(s)
      </p>
      <table className="acc-receipt">
        <tbody>
          <tr>
            <td>Room total</td>
            <td>{discountLabel && rawTotal !== total ? <s>{P(rawTotal)}</s> : null} {P(total)}</td>
          </tr>
          <tr>
            <td><b>Down payment ({pct}%) due now</b></td>
            <td><b>{P(down)}</b></td>
          </tr>
          <tr>
            <td>Balance due at hotel</td>
            <td>{P(balance)}</td>
          </tr>
        </tbody>
      </table>
      <label htmlFor="pay-method">Payment method</label>
      <select id="pay-method" value={method} onChange={(e) => setMethod(e.target.value)}>
        {PAYMENT_METHODS.map((m) => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>

      <PaymentFields method={method} details={details} setField={setField} error={error} />
      <p className="acc-muted acc-small">
        Use test details only. No money is charged and no confirmation email is sent. Your booking is saved for this session.
      </p>
    </>
  )
}

function CancelBody({ booking }) {
  return (
    <>
      <h3>Cancel booking {booking.id}?</h3>
      <p className="acc-muted">This cannot be undone. Cancellation does not automatically issue a refund. Contact the hotel to review any payment on record.</p>
    </>
  )
}

function ConfirmedBody({ booking }) {
  return (
    <>
      <h3>Booking confirmed 🎉</h3>
      <p>
        Your reference is <b>{booking.id}</b>.
      </p>
      <p className="acc-muted">
        {booking.type}
        <br />
        {booking.in} → {booking.out}
      </p>
      {booking.total != null && (
        <table className="acc-receipt">
          <tbody>
            <tr>
              <td>
                Down payment paid{booking.payMethod ? ` (${booking.payMethod})` : ''}
                {booking.payRef && <div className="acc-muted acc-small">{booking.payRef}</div>}
              </td>
              <td>{P(booking.paid)}</td>
            </tr>
            <tr>
              <td><b>Balance due at hotel</b></td>
              <td><b>{P(booking.total - booking.paid)}</b></td>
            </tr>
          </tbody>
        </table>
      )}
    </>
  )
}
