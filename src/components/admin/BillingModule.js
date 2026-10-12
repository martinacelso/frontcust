import { useState } from 'react'
import { useAdmin, T, nights, P } from '../../context/AdminContext'

export default function BillingModule() {
  const {
    bookings, by, total, paid, setBookings, logAction,
  } = useAdmin()

  const [bookingId, setBookingId] = useState(0)
  const [extraModal, setExtraModal] = useState(null)
  const [discountModal, setDiscountModal] = useState(null)
  const [paymentModal, setPaymentModal] = useState(null)
  const [receiptOpen, setReceiptOpen] = useState(false)

  const billable = bookings.filter((b) => b.st !== 'cancelled')
  const b = bookingId ? by('bookings', bookingId) : null

  function openExtra() { setExtraModal({ description: 'Room service', amount: '' }) }

  function saveExtra() {
    if (!extraModal.amount) return
    logAction('Added charge', `Booking #${b.id}`, `${extraModal.description} · ${P(+extraModal.amount)}`)
    setBookings((prev) =>
      prev.map((x) =>
        x.id === b.id
          ? { ...x, extras: [...x.extras, { d: extraModal.description, a: +extraModal.amount }] }
          : x
      )
    )
    setExtraModal(null)
  }

  function openDiscount() { setDiscountModal({ amount: b.disc }) }

  function saveDiscount() {
    logAction('Set discount', `Booking #${b.id}`, `${P(+discountModal.amount || 0)}`)
    setBookings((prev) =>
      prev.map((x) => (x.id === b.id ? { ...x, disc: +discountModal.amount || 0 } : x))
    )
    setDiscountModal(null)
  }

  function openPayment() {
    setPaymentModal({ amount: Math.max(0, total(b) - paid(b)), method: 'Cash' })
  }

  function savePayment() {
    if (!(+paymentModal.amount > 0)) return
    logAction('Recorded payment', `Booking #${b.id}`, `${paymentModal.method} · ${P(+paymentModal.amount)}`)
    setBookings((prev) =>
      prev.map((x) =>
        x.id === b.id
          ? { ...x, pays: [...x.pays, { d: T(), a: +paymentModal.amount, m: paymentModal.method }] }
          : x
      )
    )
    setPaymentModal(null)
  }

  return (
    <>
      <div className="admin-card">
        <div className="admin-row">
          <div>
            <label>Select booking</label>
            <select value={bookingId} onChange={(e) => setBookingId(+e.target.value)}>
              <option value={0}>— choose —</option>
              {billable.map((x) => (
                <option key={x.id} value={x.id}>
                  #{x.id} {by('guests', x.g)?.name} ({x.st})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {!b && <p className="admin-muted">Choose a booking to open its folio.</p>}

      {b && (
        <>
          <div className="admin-card">
            <b>{by('guests', b.g)?.name}</b> · {b.in} → {b.out}{' '}
            <span className={`admin-badge ${b.st}`}>{b.st}</span>
          </div>

          <h2 className="admin-h2">Charges</h2>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr><th>Description</th><th>Amount</th></tr>
              </thead>
              <tbody>
                <tr>
                  <td>Room ({nights(b.in, b.out)} × {P(b.rate)})</td>
                  <td>{P(nights(b.in, b.out) * b.rate)}</td>
                </tr>
                {b.extras.map((x, i) => (
                  <tr key={i}><td>{x.d}</td><td>{P(x.a)}</td></tr>
                ))}
                <tr><td>Discount</td><td>−{P(b.disc)}</td></tr>
                <tr><td><b>Total bill</b></td><td><b>{P(total(b))}</b></td></tr>
              </tbody>
            </table>
          </div>

          <button className="admin-btn s" onClick={openExtra}>+ Additional charge</button>{' '}
          <button className="admin-btn s" onClick={openDiscount}>Set discount</button>

          <h2 className="admin-h2">Payments</h2>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr><th>Date</th><th>Method</th><th>Amount</th></tr>
              </thead>
              <tbody>
                {b.pays.length === 0 ? (
                  <tr><td colSpan="3" className="admin-muted">No payments yet.</td></tr>
                ) : (
                  b.pays.map((p, i) => (
                    <tr key={i}><td>{p.d}</td><td>{p.m}</td><td>{P(p.a)}</td></tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <p className="admin-summary">
            Paid <b>{P(paid(b))}</b> · Balance <b>{P(total(b) - paid(b))}</b>
          </p>

          <button className="admin-btn" onClick={openPayment}>Record payment</button>{' '}
          <button className="admin-btn s" onClick={() => setReceiptOpen(true)}>Receipt</button>
        </>
      )}

      {extraModal && (
        <div className="acc-modal-overlay" onClick={() => setExtraModal(null)}>
          <div className="acc-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Additional charge</h3>
            <label>Description</label>
            <input value={extraModal.description} onChange={(e) => setExtraModal({ ...extraModal, description: e.target.value })} />
            <label>Amount (₱)</label>
            <input type="number" value={extraModal.amount} onChange={(e) => setExtraModal({ ...extraModal, amount: e.target.value })} />
            <div className="acc-modal-actions">
              <button className="btn ghost-dark" onClick={() => setExtraModal(null)}>Cancel</button>
              <button className="btn" onClick={saveExtra}>Save</button>
            </div>
          </div>
        </div>
      )}

      {discountModal && (
        <div className="acc-modal-overlay" onClick={() => setDiscountModal(null)}>
          <div className="acc-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Discount</h3>
            <label>Discount amount (₱)</label>
            <input type="number" value={discountModal.amount} onChange={(e) => setDiscountModal({ ...discountModal, amount: e.target.value })} />
            <div className="acc-modal-actions">
              <button className="btn ghost-dark" onClick={() => setDiscountModal(null)}>Cancel</button>
              <button className="btn" onClick={saveDiscount}>Save</button>
            </div>
          </div>
        </div>
      )}

      {paymentModal && (
        <div className="acc-modal-overlay" onClick={() => setPaymentModal(null)}>
          <div className="acc-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Record payment</h3>
            <label>Amount (₱)</label>
            <input type="number" value={paymentModal.amount} onChange={(e) => setPaymentModal({ ...paymentModal, amount: e.target.value })} />
            <label>Method</label>
            <select value={paymentModal.method} onChange={(e) => setPaymentModal({ ...paymentModal, method: e.target.value })}>
              {['Cash', 'Card', 'GCash', 'Bank transfer'].map((m) => (<option key={m} value={m}>{m}</option>))}
            </select>
            <div className="acc-modal-actions">
              <button className="btn ghost-dark" onClick={() => setPaymentModal(null)}>Cancel</button>
              <button className="btn" onClick={savePayment}>Save</button>
            </div>
          </div>
        </div>
      )}

      {receiptOpen && b && (
        <div className="acc-modal-overlay" onClick={() => setReceiptOpen(false)}>
          <div className="acc-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Official Receipt #{b.id}</h3>
            <p><b>Twin Lakes Hotel</b><br />Tagaytay–Nasugbu Highway, Laurel, Batangas<br />{T()}</p>
            <p className="acc-muted">Guest: {by('guests', b.g)?.name}</p>

            <div className="admin-table-wrap">
              <table className="admin-table">
                <tbody>
                  <tr><td>Room × {nights(b.in, b.out)}</td><td>{P(nights(b.in, b.out) * b.rate)}</td></tr>
                  {b.extras.map((x, i) => (
                    <tr key={i}><td>{x.d}</td><td>{P(x.a)}</td></tr>
                  ))}
                  <tr><td>Discount</td><td>−{P(b.disc)}</td></tr>
                  <tr><td><b>Total</b></td><td><b>{P(total(b))}</b></td></tr>
                  <tr><td>Paid</td><td>{P(paid(b))}</td></tr>
                  <tr><td><b>Balance</b></td><td><b>{P(total(b) - paid(b))}</b></td></tr>
                </tbody>
              </table>
            </div>

            <div className="acc-modal-actions">
              <button className="btn ghost-dark" onClick={() => setReceiptOpen(false)}>Close</button>
              <button className="btn no-print" onClick={() => window.print()}>Print</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}