import { P } from '../../context/AccountContext'
import { STATUS_LABELS } from '../../utils/bookingApi'
export default function TripCard({ booking: b, onViewDetails, onCancel, onPay, busy = false }) {
  return <article className="acc-trip">
    <div className="acc-trip-top"><div><h3>{b.type}</h3><p>{b.in} → {b.out} · {b.g} guest(s)</p>
      <p className="acc-muted" style={{ overflowWrap: 'anywhere' }}>Reference: {b.id}</p></div>
      <div className="acc-trip-right"><span className={'acc-badge ' + b.st}>{STATUS_LABELS[b.st] || b.st}</span><div className="acc-price">{P(b.total)}</div></div></div>
    {b.simulation && <p className="acc-muted">Payment recorded. No funds were transferred.</p>}
    {b.refund && <p className="acc-muted">Refund recorded: {P(b.refunded)} · {b.refund.method}</p>}
    <div className="acc-trip-actions">
      <button className="btn ghost-dark" disabled={busy} onClick={() => onViewDetails?.(b.id)}>View details</button>
      {['pending-payment', 'confirmed'].includes(b.st) && <>
        {onPay && b.st === 'pending-payment' && <button className="btn" disabled={busy} onClick={() => onPay(b.id)}>Pay down payment</button>}
        <button className="btn ghost-dark" disabled={busy} onClick={() => onCancel?.(b.id)}>Cancel reservation</button>
      </>}
    </div>
  </article>
}
