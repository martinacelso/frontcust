import DigitInput from '../DigitInput'
import { useEffect, useRef, useState } from 'react'
import { bookingRequest } from '../../utils/bookingApi'
import PaymentMethod from '../account/PaymentMethod'
const money = (n) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(n / 100)
export default function WalkIn({ onComplete }) {
  const [open, setOpen] = useState(false)
  return <section><button className="admin-btn" disabled={open} onClick={() => setOpen(true)}>New walk-in check-in</button>
    {open && <Form onClose={() => setOpen(false)} onComplete={onComplete} />}</section>
}
function Form({ onClose, onComplete }) {
  const [types, setTypes] = useState([]), [enabled, setEnabled] = useState(false)
  const [stay, setStay] = useState({ roomTypeId: '', checkOut: '', adults: 1, children: 0, requests: '' })
  const [guest, setGuest] = useState({ name: '', phone: '', email: '' })
  const [quote, setQuote] = useState(null), [roomId, setRoomId] = useState('')
  const [method, setMethod] = useState('GCash'), [confirmed, setConfirmed] = useState(false)
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [done, setDone] = useState(null)
  const [pending, setPending] = useState(null)
  const lock = useRef(false), alive = useRef(true)
  useEffect(() => {
    alive.current = true
    Promise.all([bookingRequest('/rooms/catalog'), bookingRequest('/bookings/options')]).then(([r, o]) => {
      if (!alive.current) return
      if (r.error || o.error) setError(r.error || o.error)
      else { setTypes(r.types); setEnabled(o.demoPaymentsEnabled === true) }
    })
    return () => { alive.current = false }
  }, [])
  function changeStay(key, value) { setStay((s) => ({ ...s, [key]: value })); setQuote(null); setRoomId(''); setConfirmed(false) }
  async function search(e) {
    e.preventDefault(); if (lock.current) return
    lock.current = true; setBusy(true); setError(''); setQuote(null); setConfirmed(false)
    try {
      const r = await bookingRequest('/bookings/walk-in/rooms?' + new URLSearchParams(stay))
      if (!alive.current) return
      if (r.error) setError(r.error)
      else { setQuote(r); setRoomId(r.rooms[0]?.id || '') }
    } finally { lock.current = false; if (alive.current) setBusy(false) }
  }
  async function submit() {
    if (lock.current) return
    let payload = pending
    if (!payload) {
      if (!quote || !roomId || !confirmed) return
      if (guest.name.trim().length < 2 || !/^09\d{9}$/.test(guest.phone) || (guest.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guest.email.trim()))) { setError('Enter guest name, 11-digit 09 mobile number, and a valid email if supplied.'); return }
      payload = { ...stay, guest, roomId, checkIn: quote.checkIn, expectedTotalCents: quote.totalCents,
        requestId: crypto.randomUUID(), method, confirmPayment: true }
      setPending(payload)
    }
    lock.current = true; setBusy(true); setError('')
    try {
      const r = await bookingRequest('/bookings/walk-in', payload)
      if (!alive.current) return
      if (r.error) {
        setError(r.error)
        // Unknown results retain the exact request for a safe retry.
        if (r.status && r.status < 500) setPending(null)
      } else { setDone(r); setPending(null); onComplete() }
    } finally { lock.current = false; if (alive.current) setBusy(false) }
  }
  if (done) return <div className="admin-card" role="status"><h3>Walk-in saved — {done.status}</h3>
    <p>Room {done.roomNumber}. Booking: {done.id}</p><p>Deposit: {money(done.paidCents)}. Balance: {money(done.totalCents - done.paidCents)}</p>
    <p>Payment reference: {done.reference}</p><button className="admin-btn" onClick={onClose}>Done</button></div>
  return <div className="admin-card" style={{ padding: 20, margin: '16px 0' }}>
    <h3>Walk-in guest</h3>    <p>Arrival is today, Philippine time. A 20% demo deposit is recorded before check-in. No money is charged.</p>
    {error && <p role="alert" className="acc-error">{error}</p>}
    {!enabled && <p>Enable demo payments with DEMO_PAYMENTS=true in server/.env, then restart the backend before completing a walk-in.</p>}
    <fieldset disabled={busy || !!pending} style={{ border: 0 }}>
      <div style={{ display: 'grid', gap: 10 }}>
        {['name', 'phone', 'email'].map((key) => <label key={key}>{({ name: 'Guest full name', phone: 'Mobile number (0911 222 1233)', email: 'Contact email (optional)' })[key]}
          {key === 'phone' ? <DigitInput style={{ display: 'block' }} value={guest.phone} placeholder="0911 222 1233" onValueChange={(phone) => { setGuest((g) => ({ ...g, phone })); setConfirmed(false) }} /> : <input style={{ display: 'block' }} type={key === 'email' ? 'email' : key === 'phone' ? 'tel' : 'text'} maxLength={key === 'phone' ? 11 : key === 'name' ? 100 : 254} value={guest[key]} onChange={(e) => { setGuest((g) => ({ ...g, [key]: e.target.value })); setConfirmed(false) }} />}</label>)}
      </div>
      <form onSubmit={search} style={{ display: 'grid', gap: 10, marginTop: 16 }}>
        <label>Room type <select required value={stay.roomTypeId} onChange={(e) => changeStay('roomTypeId', e.target.value)}><option value="">Choose type</option>{types.map((t) => <option key={t.id} value={t.id}>{t.name} · capacity {t.capacity}</option>)}</select></label>
        <label>Departure <input type="date" required value={stay.checkOut} onChange={(e) => changeStay('checkOut', e.target.value)} /></label>
        <label>Adults <input type="number" min="1" max="50" required value={stay.adults} onChange={(e) => changeStay('adults', Number(e.target.value))} /></label>
        <label>Children <input type="number" min="0" max="49" required value={stay.children} onChange={(e) => changeStay('children', Number(e.target.value))} /></label>
        <label>Requests <textarea maxLength={1000} value={stay.requests} onChange={(e) => changeStay('requests', e.target.value)} /></label>
        <button className="admin-btn">Find clean rooms</button>
      </form>
      {quote && <><p>Arrival: {quote.checkIn}. Total: {money(quote.totalCents)}. Deposit: {money(quote.depositCents)}.</p>
        {quote.rooms.length ? <label>Room <select value={roomId} onChange={(e) => { setRoomId(e.target.value); setConfirmed(false) }}>{quote.rooms.map((r) => <option key={r.id} value={r.id}>{r.number}</option>)}</select></label> : <p>No clean room is available for the entire stay.</p>}
        {enabled && <PaymentMethod name="walk-in-demo-payment-method" value={method} onChange={(m) => { setMethod(m); setConfirmed(false) }} />}
        <label><input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} /> Confirm guest details, room and {money(quote.depositCents)} demo payment through {method}.</label>
      </>}
    </fieldset>
    {pending && <p>The result is uncertain. Retry the same request to check its result without creating another booking.</p>}
    <button className="admin-btn" disabled={busy || !enabled || (!pending && (!quote || !roomId || !confirmed))} onClick={submit}>{busy ? 'Saving…' : pending ? 'Retry same check-in' : 'Record deposit and check in'}</button>{' '}
    <button className="admin-btn" disabled={busy || !!pending} onClick={onClose}>Close</button>
  </div>
}
