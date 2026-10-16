import { refundLimit, roundMoney } from '../../utils/hotel'
import { billingActionError } from '../../utils/actionValidation'
import { moneyError, textError } from '../../utils/validation'
import { useState } from 'react'
import { useAdmin, T, nights, P } from '../../context/AdminContext'
import { PAYMENT_METHODS } from '../../context/AccountContext'
import { validatePayment, PaymentFields } from '../../utils/payment'

// Same methods as the guest booking checkout, plus Cash for the front desk
const BILLING_METHODS = [...PAYMENT_METHODS, 'Cash']

export default function BillingModule() {
  const {
    bookings, by, total, paid, setBookings, logAction, collected, refunded, balanceDue,
  } = useAdmin()

  const { can } = useAdmin()
  const actionError = () => !can('bill') ? 'You do not have permission to change bills.' : billingActionError(b)

  const [bookingId, setBookingId] = useState(0)
  const [extraModal, setExtraModal] = useState(null)
  const [discountModal, setDiscountModal] = useState(null)
  const [paymentModal, setPaymentModal] = useState(null)
  const [refundModal, setRefundModal] = useState(null)
  const [receiptOpen, setReceiptOpen] = useState(false)

  const billable = bookings
  const b = bookingId ? by('bookings', bookingId) : null

  function openExtra() { if (actionError()) return window.alert(actionError()); setExtraModal({ description: 'Room service', amount: '' }) }

  function saveExtra() {
    const blocked = actionError()
    if (blocked) return window.alert(blocked)
    if (!b) return
    const error = textError(extraModal.description, 'Charge description', 200) || moneyError(extraModal.amount)
    if (error) return window.alert(error)
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

  function openDiscount() { if (actionError()) return window.alert(actionError()); setDiscountModal({ amount: b.disc }) }

  function saveDiscount() {
    const blocked = actionError()
    if (blocked) return window.alert(blocked)
    if (!b) return
    const error = moneyError(discountModal.amount, 'Discount', { allowZero: true, max: Math.max(0, total(b) + b.disc - paid(b)) })
    if (error) return window.alert(error)
    logAction('Set discount', `Booking #${b.id}`, `${P(+discountModal.amount || 0)}`)
    setBookings((prev) =>
      prev.map((x) => (x.id === b.id ? { ...x, disc: +discountModal.amount || 0, promoId: null } : x))
    )
    setDiscountModal(null)
  }

  function openPayment() {
    if (actionError()) return window.alert(actionError())
    if (Math.round((total(b) - paid(b)) * 100) <= 0) return window.alert('This bill has no outstanding balance.')
    setPaymentModal({ amount: Math.max(0, total(b) - paid(b)), method: PAYMENT_METHODS[0], details: {}, error: '' })
  }

  function changePayMethod(method) {
    setPaymentModal((m) => ({ ...m, method, details: {}, error: '' }))
  }

  function setPayField(key, value) {
    setPaymentModal((m) => ({ ...m, details: { ...m.details, [key]: value }, error: '' }))
  }

  function savePayment() {
    const blocked = actionError()
    if (blocked) return window.alert(blocked)
    if (!b) return
    const { amount, method, details } = paymentModal
    const error = moneyError(amount, 'Payment', { max: Math.max(0, total(b) - paid(b)) })
    if (error) return setPaymentModal({ ...paymentModal, error })
    if (!(+amount > 0)) {
      setPaymentModal({ ...paymentModal, error: 'Enter the payment amount.' })
      return
    }
    // Same validation as the guest booking payment; Cash needs no account details
    let ref = ''
    if (method !== 'Cash') {
      const res = validatePayment(method, details)
      if (res.error) {
        setPaymentModal({ ...paymentModal, error: res.error })
        return
      }
      ref = res.ref
    }
    if (!BILLING_METHODS.includes(method)) return setPaymentModal({ ...paymentModal, error: 'Choose a valid payment method.' })
    if (!window.confirm(`Record ${P(+amount)} by ${method} for booking #${b.id}?`)) return
    logAction('Recorded payment', `Booking #${b.id}`, `${method} · ${P(+amount)}${ref ? ` · ${ref}` : ''}`)
    setBookings((prev) =>
      prev.map((x) =>
        x.id === b.id
          ? { ...x, pays: [...x.pays, { id: crypto.randomUUID(), d: T(), a: roundMoney(amount), m: method, ref, status: 'succeeded', demo: true, recordedAt: new Date().toISOString() }] }
          : x
      )
    )
    setPaymentModal(null)
  }

  function saveRefund() {
    if (!can('bill')) return window.alert('You do not have permission to record refunds.')
    const current = by('bookings', bookingId)
    if (!current || !refundModal) return
    const error = moneyError(refundModal.amount, 'Refund', { max: refundLimit(current) }) ||
      textError(refundModal.reason, 'Refund reason', 200) || textError(refundModal.reference, 'Refund reference', 100)
    if (error) return setRefundModal({ ...refundModal, error })
    if (!BILLING_METHODS.includes(refundModal.method)) return setRefundModal({ ...refundModal, error: 'Choose a valid refund method.' })
    if (!window.confirm('Record a refund of ' + P(+refundModal.amount) + '? No money will be transferred. A refund on an active booking reopens its balance.')) return
    const refund = { id: crypto.randomUUID(), d: T(), a: roundMoney(refundModal.amount), m: refundModal.method,
      reason: refundModal.reason.trim(), ref: refundModal.reference.trim(), status: 'succeeded', demo: true, recordedAt: new Date().toISOString() }
    setBookings((prev) => prev.map((x) => x.id === current.id ? { ...x, refunds: [...(x.refunds || []), refund] } : x))
    logAction('Recorded refund', 'Booking #' + current.id, P(refund.a) + ' · ' + refund.reason)
    setRefundModal(null)
  }

  return (
    <>
      <div className="admin-card">
        <div className="admin-row">
          <div>
            <label>Select booking</label>
            <select value={bookingId} onChange={(e) => { setBookingId(+e.target.value); setExtraModal(null); setDiscountModal(null); setPaymentModal(null); setRefundModal(null); setReceiptOpen(false) }}>
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

          {!actionError() && <><button className="admin-btn s" onClick={openExtra}>+ Additional charge</button>{' '}
          <button className="admin-btn s" onClick={openDiscount}>Set discount</button></>}

          <h2 className="admin-h2">Payments</h2>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr><th>Date</th><th>Method</th><th>Paid from</th><th>Amount</th></tr>
              </thead>
              <tbody>
                {b.pays.length === 0 ? (
                  <tr><td colSpan="4" className="admin-muted">No payments yet.</td></tr>
                ) : (
                  b.pays.map((p, i) => (
                    <tr key={i}><td>{p.d}</td><td>{p.m}</td><td>{p.ref || '—'}</td><td>{P(p.a)}</td></tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <p className="admin-summary">
            Collected <b>{P(collected(b))}</b> · Refunded <b>{P(refunded(b))}</b> · Net paid <b>{P(paid(b))}</b> · Balance <b>{P(balanceDue(b))}</b>
          </p>

          {!actionError() && balanceDue(b) > 0 && <button className="admin-btn" onClick={openPayment}>Record payment</button>}{' '}
          <button className="admin-btn s" onClick={() => setReceiptOpen(true)}>Receipt</button>{' '}
          {can('bill') && refundLimit(b) > 0 && <button className="admin-btn s" onClick={() => setRefundModal({ amount: '', method: b.pays[0]?.m || 'Cash', reason: '', reference: '', error: '' })}>Record refund</button>}
          {b.st === 'cancelled' && <p className="admin-muted">The original charges are kept for history. No further stay balance is due. Refunds require review and a separate refund record.</p>}
          {(b.refunds || []).length > 0 && <div className="admin-table-wrap"><table className="admin-table">
            <thead><tr><th>Refund date</th><th>Method / reference</th><th>Reason</th><th>Amount</th></tr></thead>
            <tbody>{b.refunds.map((p) => <tr key={p.id}><td>{p.d}</td><td>{p.m} · {p.ref}</td><td>{p.reason}</td><td>−{P(p.a)}</td></tr>)}</tbody>
          </table></div>}
        </>
      )}

      {refundModal && b && (
        <div className="acc-modal-overlay" onClick={() => setRefundModal(null)}>
          <div className="acc-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Record refund · #{b.id}</h3>
            <p className="acc-muted">Maximum {P(refundLimit(b))}. This records a refund entry only; it does not transfer money. Review the booking’s cancellation terms first.</p>
            <label>Amount (₱)</label>
            <input type="number" min="0.01" step="0.01" value={refundModal.amount} onChange={(e) => setRefundModal({ ...refundModal, amount: e.target.value, error: '' })} />
            <label>Method</label>
            <select value={refundModal.method} onChange={(e) => setRefundModal({ ...refundModal, method: e.target.value })}>{BILLING_METHODS.map((m) => <option key={m}>{m}</option>)}</select>
            <label>Refund reference</label>
            <input value={refundModal.reference} onChange={(e) => setRefundModal({ ...refundModal, reference: e.target.value, error: '' })} />
            <label>Reason</label>
            <input value={refundModal.reason} onChange={(e) => setRefundModal({ ...refundModal, reason: e.target.value, error: '' })} />
            {refundModal.error && <p className="acc-error" role="alert">{refundModal.error}</p>}
            <div className="acc-modal-actions"><button className="btn ghost-dark" onClick={() => setRefundModal(null)}>Cancel</button><button className="btn" onClick={saveRefund}>Record refund</button></div>
          </div>
        </div>
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

      {paymentModal && b && (
        <div className="acc-modal-overlay" onClick={() => setPaymentModal(null)}>
          <div className="acc-modal" onClick={(e) => e.stopPropagation()}>
            <div className="acc-modal-body">
              <h3>Record payment</h3>
              <p className="acc-muted">Use test details only. No money is charged.</p>
              <p className="acc-muted">
                {by('guests', b.g)?.name}
                <br />
                {b.in} → {b.out} · {nights(b.in, b.out)} night(s)
              </p>
              <table className="acc-receipt">
                <tbody>
                  <tr><td>Total bill</td><td>{P(total(b))}</td></tr>
                  <tr><td>Paid so far</td><td>{P(paid(b))}</td></tr>
                  <tr><td><b>Balance due</b></td><td><b>{P(Math.max(0, total(b) - paid(b)))}</b></td></tr>
                </tbody>
              </table>

              <label htmlFor="bill-amount">Amount (₱)</label>
              <input
                id="bill-amount"
                type="number"
                min="0"
                value={paymentModal.amount}
                onChange={(e) => setPaymentModal({ ...paymentModal, amount: e.target.value, error: '' })}
              />

              <label htmlFor="bill-method">Payment method</label>
              <select id="bill-method" value={paymentModal.method} onChange={(e) => changePayMethod(e.target.value)}>
                {BILLING_METHODS.map((m) => (<option key={m} value={m}>{m}</option>))}
              </select>

              <PaymentFields
                method={paymentModal.method}
                details={paymentModal.details}
                setField={setPayField}
                error={paymentModal.error}
                idPrefix="bill"
              />
            </div>
            <div className="acc-modal-actions">
              <button className="btn ghost-dark" onClick={() => setPaymentModal(null)}>Cancel</button>
              <button className="btn" onClick={savePayment}>Confirm payment</button>
            </div>
          </div>
        </div>
      )}

      {receiptOpen && b && (
        <div className="acc-modal-overlay" onClick={() => setReceiptOpen(false)}>
          <div className="acc-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Receipt #{b.id}</h3>
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
                  <tr><td>Collected</td><td>{P(collected(b))}</td></tr>
                  <tr><td>Refunded</td><td>{P(refunded(b))}</td></tr>
                  <tr><td>Net paid</td><td>{P(paid(b))}</td></tr>
                  <tr><td><b>Balance</b></td><td><b>{P(balanceDue(b))}</b></td></tr>
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