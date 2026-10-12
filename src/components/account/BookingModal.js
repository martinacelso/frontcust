import { useEffect } from 'react'
import { useAccount, nights, P, TYPES } from '../../context/AccountContext'

const STATUS_LABELS = {
  confirmed: 'Confirmed',
  'checked-in': 'Checked in',
  'checked-out': 'Checked out',
  cancelled: 'Cancelled',
}

export default function BookingModal({ modal, onClose }) {
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

  const { type, booking, onConfirm, label } = modal

  return (
    <div className="acc-modal-overlay" onClick={onClose}>
      <div className="acc-modal" onClick={(e) => e.stopPropagation()}>
        <div className="acc-modal-body">
          {type === 'receipt' && booking && <ReceiptBody booking={booking} />}
          {type === 'cancel' && booking && <CancelBody booking={booking} />}
          {type === 'confirmed' && booking && <ConfirmedBody booking={booking} />}
        </div>

        <div className="acc-modal-actions">
          <button className="btn ghost-dark" onClick={onClose}>
            Close
          </button>
          {onConfirm && (
            <button
              className="btn"
              onClick={() => {
                const result = onConfirm()
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
  const { user } = useAccount()
  const room = TYPES.find((t) => t.n === booking.type)
  const nightCount = nights(booking.in, booking.out)
  const total = nightCount * room.r
  const balance = booking.st === 'cancelled' ? 0 : total - booking.paid

  return (
    <>
      <h3>Booking {booking.id}</h3>
      <p className="acc-muted">
        {user.name}
        <br />
        {booking.in} → {booking.out}
      </p>
      <table className="acc-receipt">
        <tbody>
          <tr>
            <td>{booking.type} × {nightCount} night(s)</td>
            <td>{P(nightCount * room.r)}</td>
          </tr>
          <tr>
            <td>Paid</td>
            <td>{P(booking.paid)}</td>
          </tr>
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

function CancelBody({ booking }) {
  return (
    <>
      <h3>Cancel booking {booking.id}?</h3>
      <p className="acc-muted">This can't be undone.</p>
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
    </>
  )
}