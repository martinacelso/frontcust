import { nights, P, TYPES } from '../../context/AccountContext'

const STATUS_LABELS = {
  confirmed: 'Confirmed',
  'checked-in': 'Checked in',
  'checked-out': 'Checked out',
  cancelled: 'Cancelled',
}

export default function TripCard({ booking, onViewDetails, onCancel }) {
  const room = TYPES.find((t) => t.n === booking.type)
  const nightCount = nights(booking.in, booking.out)
  const total = nightCount * room.r
  const today = new Date().toISOString().slice(0, 10)
  const canCancel = booking.st === 'confirmed' && booking.in > today

  return (
    <div className="acc-trip">
      <div className="acc-trip-top">
        <div>
          <h3>{booking.type}</h3>
          <div className="acc-muted">
            {booking.in} → {booking.out} · {nightCount} night(s) · {booking.g} guest(s)
          </div>
          <div className="acc-muted acc-small">
            Ref {booking.id}
            {booking.note ? ` · ${booking.note}` : ''}
          </div>
        </div>
        <div className="acc-trip-right">
          <span className={`acc-badge ${booking.st}`}>
            {STATUS_LABELS[booking.st] || booking.st}
          </span>
          <div className="acc-price">{P(total)}</div>
        </div>
      </div>

      <div className="acc-trip-actions">
        <button className="btn ghost-dark" onClick={() => onViewDetails?.(booking.id)}>
          View details
        </button>
        {canCancel && (
          <button className="btn ghost-dark" onClick={() => onCancel?.(booking.id)}>
            Cancel booking
          </button>
        )}
      </div>
    </div>
  )
}