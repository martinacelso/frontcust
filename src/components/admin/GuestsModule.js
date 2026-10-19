import { formatDigits } from '../../utils/digitFormatting'
import DigitInput from '../DigitInput'
import { useEffect, useRef, useState } from 'react'
import { useAdmin } from '../../context/AdminContext'
import { bookingRequest, STATUS_LABELS } from '../../utils/bookingApi'
const money = (n) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(n / 100)
export default function GuestsModule() {
  const { sessionUser } = useAdmin()
  if (!sessionUser || !['admin', 'front-desk'].includes(sessionUser.role)) return <p role="alert">Staff sign-in required.</p>
  return <Guests key={sessionUser.id} />
}
function Guests() {
  const [search, setSearch] = useState(''), [q, setQ] = useState('')
  const [page, setPage] = useState(1), [rows, setRows] = useState([]), [more, setMore] = useState(false)
  const [busy, setBusy] = useState(true), [error, setError] = useState(''), [reload, setReload] = useState(0)
  const [selected, setSelected] = useState(null)
  useEffect(() => {
    let current = true; setBusy(true); setError(''); setRows([])
    bookingRequest(`/guests?q=${encodeURIComponent(q)}&page=${page}`).then((r) => {
      if (!current) return
      if (r.error) setError(r.error)
      else { setRows(r.guests); setMore(r.hasMore) }
      setBusy(false)
    })
    return () => { current = false }
  }, [q, page, reload])
  return <>
    <form className="admin-row" style={{ gap: 12 }} onSubmit={(e) => { e.preventDefault(); setQ(/^[\d\s]+$/.test(search) ? search.replace(/\s/g, '') : search.trim()); setPage(1); setReload((n) => n + 1) }}>
      <label>Search guests <input value={search} maxLength={100} disabled={!!selected} placeholder="Name, email or phone" onChange={(e) => setSearch(e.target.value)} /></label>
      <button className="admin-btn" disabled={busy || !!selected}>Search / refresh</button>
    </form>
    <p>Registered guest accounts. Guests create accounts through Sign up; staff can update their contact details here.</p>
    {error && <p role="alert" className="acc-error">{error}</p>}
    <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Name</th><th>Contact email</th><th>Phone</th><th>Account</th><th>Action</th></tr></thead>
      <tbody>{rows.map((g) => <tr key={g.id}><td>{g.name}</td><td>{g.contactEmail}</td><td>{formatDigits(g.phone) || 'Unavailable'}</td><td>{g.active ? 'Active' : 'Disabled'}</td><td><button className="admin-link" disabled={!!selected} onClick={() => setSelected(g.id)}>Profile and bookings</button></td></tr>)}
        {!rows.length && <tr><td colSpan="5">{busy ? 'Loading…' : error ? 'Guest records unavailable.' : 'No matching guests.'}</td></tr>}</tbody></table></div>
    <div className="admin-row" style={{ gap: 12, marginTop: 12 }}><button className="admin-btn" disabled={busy || !!selected || page === 1} onClick={() => setPage((p) => p - 1)}>Previous</button><span>Page {page}</span>
      <button className="admin-btn" disabled={busy || !!selected || !!error || !more} onClick={() => setPage((p) => p + 1)}>Next</button></div>
    {/* ---- Profile modal ---- */}
    {selected && <Profile key={selected} id={selected} onClose={() => { setSelected(null); setReload((n) => n + 1) }} />}
  </>
}
function Profile({ id, onClose }) {
  const [data, setData] = useState(null), [form, setForm] = useState(null), [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true), [saving, setSaving] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('')
  const lock = useRef(false)
  useEffect(() => {
    let current = true; setLoading(true); setData(null); setForm(null); setError('')
    bookingRequest(`/guests/${id}/bookings?page=${page}`).then((r) => {
      if (!current) return
      if (r.error) setError(r.error)
      else { setData(r); setForm(r.guest) }
      setLoading(false)
    })
    return () => { current = false }
  }, [id, page])
  async function save(e) {
    e.preventDefault(); if (lock.current) return
    lock.current = true; setSaving(true); setError(''); setMessage('')
    try {
      const r = await bookingRequest(`/guests/${id}/contact`, { name: form.name, phone: form.phone, contactEmail: form.contactEmail, updatedAt: form.updatedAt })
      if (r.error) setError(r.error)
      else { setForm(r.guest); setData((old) => ({ ...old, guest: r.guest })); setMessage('Guest contact details saved.') }
    } finally { lock.current = false; setSaving(false) }
  }
  async function setActive(active) {
    if (saving || !data?.guest) return
    const action = active ? 'restore' : ''
    if (!active && !window.confirm('Disable this guest account? It will no longer be able to sign in, but its booking history will be retained.')) return
    setSaving(true); setError(''); setMessage('')
    try {
      const result = active
        ? await bookingRequest(`/guests/${id}/${action}`, { updatedAt: data.guest.updatedAt })
        : await bookingRequest(`/guests/${id}`, { updatedAt: data.guest.updatedAt, confirm: true }, 'DELETE')
      if (result.error) setError(result.error)
      else {
        setData((old) => ({ ...old, guest: result.guest }))
        setForm(result.guest)
        setMessage(result.message)
      }
    } finally { setSaving(false) }
  }
  const dirty = form && data && ['name', 'phone', 'contactEmail'].some((key) => form[key] !== data.guest[key])
  return <section style={{ border: '1px solid #ddd', borderRadius: 12, padding: 20, marginTop: 20 }}>
    <h3>Guest profile</h3>
    {loading && <p>Loading profile…</p>}{error && <p role="alert" className="acc-error">{error}</p>}{message && <p role="status" className="acc-saved">{message}</p>}
    {/* ---- Add/edit modal ---- */}
    {form && <form onSubmit={save}>
      <p>Login email: {data.guest.email} · Account: {data.guest.active ? 'Active' : 'Disabled'}</p>
      <div style={{ display: 'grid', gap: 12 }}>
        {['name', 'contactEmail', 'phone'].map((key) => <label key={key}>{({ name: 'Full name', contactEmail: 'Contact email', phone: 'Mobile number (optional)' })[key]}
          {key === 'phone' ? <DigitInput style={{ display: 'block' }} value={form.phone} disabled={saving} placeholder="0911 222 1233" onValueChange={(phone) => setForm((old) => ({ ...old, phone }))} /> : <input style={{ display: 'block' }} type={key === 'contactEmail' ? 'email' : key === 'phone' ? 'tel' : 'text'} required={key !== 'phone'} maxLength={key === 'phone' ? 11 : key === 'name' ? 100 : 254} value={form[key]} disabled={saving} onChange={(e) => setForm((old) => ({ ...old, [key]: e.target.value }))} />}
        </label>)}
      </div>
      <button className="admin-btn" style={{ marginTop: 12 }} disabled={saving || !dirty}>{saving ? 'Saving…' : 'Save contact details'}</button>
      {dirty && <button type="button" className="admin-btn" disabled={saving} onClick={() => setForm(data.guest)}>Discard edits</button>}
      <button type="button" className="admin-btn" style={{ marginTop: 12 }} disabled={saving || dirty}
        onClick={() => setActive(!data.guest.active)}>{data.guest.active ? 'Disable account' : 'Restore account'}</button>
    </form>}
    {data && <><h3>Booking history</h3><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Reference</th><th>Room</th><th>Dates</th><th>Status</th><th>Payments</th><th>Refunds</th></tr></thead>
      <tbody>{data.bookings.map((b) => <tr key={b.id}><td>{b.id}</td><td>{b.roomNumber} · {b.type}</td><td>{b.checkIn} to {b.checkOut}</td><td>{STATUS_LABELS[b.status]}</td><td>{money(b.paidCents)}</td><td>{money(b.refundedCents)}</td></tr>)}
        {!data.bookings.length && <tr><td colSpan="6">No bookings on this page.</td></tr>}</tbody></table></div>
      <button className="admin-btn" disabled={saving || dirty || page === 1} onClick={() => setPage((p) => p - 1)}>Previous bookings</button>{' '}<span>Page {page}</span>{' '}
      <button className="admin-btn" disabled={saving || dirty || !data.hasMore} onClick={() => setPage((p) => p + 1)}>Next bookings</button>
    </>}
    <button className="admin-btn" style={{ marginTop: 12 }} disabled={saving || dirty} onClick={onClose}>Close profile</button>
    {dirty && <p>Save or discard edits before closing or changing pages.</p>}
  </section>
}
