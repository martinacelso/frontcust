import { useCallback, useEffect, useRef, useState } from 'react'
import { bookingRequest } from '../../utils/bookingApi'

export default function GuestInbox() {
  const [page, setPage] = useState(1)
  const [data, setData] = useState({ messages: [], hasMore: false })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [opened, setOpened] = useState(null)
  const generation = useRef(0)
  const refresh = useCallback(async () => {
    const ticket = ++generation.current
    setBusy(true)
    setError('')
    const result = await bookingRequest('/inbox?page=' + page)
    if (ticket !== generation.current) return
    if (result.error) setError(result.error)
    else if (!Array.isArray(result.messages)) setError('Inbox returned an invalid response. Try refreshing.')
    else setData(result)
    setBusy(false)
  }, [page])
  useEffect(() => {
    setOpened(null)
    setData({ messages: [], hasMore: false })
    refresh()
    const timer = setInterval(refresh, 30000)
    return () => { generation.current++; clearInterval(timer) }
  }, [refresh])
  const date = (value) => new Date(value).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })
  return <section className="acc-card profile-card" aria-labelledby="guest-inbox-title">
    <div className="profile-card-header">
      <h3 id="guest-inbox-title">Booking inbox</h3>
      <p className="acc-muted acc-small">Your booking confirmations, cancellation notices and checkout receipts appear here. These messages stay inside your profile.</p>
    </div>
    <button type="button" className="btn ghost-dark" disabled={busy} onClick={refresh}>{busy ? 'Loading…' : 'Refresh inbox'}</button>
    {error && <p className="acc-error" role="alert">{error}</p>}
    {!busy && !error && !data.messages.length && <p>No messages yet. A confirmation appears after your booking deposit succeeds.</p>}
    <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
      {data.messages.map((message) => <article key={message.id} style={{ border: '1px solid #dfd2c6', borderRadius: 8, padding: 16 }}>
        <button type="button" className="admin-link" style={{ textAlign: 'left' }} aria-expanded={opened === message.id}
          aria-controls={'inbox-' + message.id} onClick={() => setOpened(opened === message.id ? null : message.id)}>
          <strong>{message.subject}</strong>
        </button>
        <p className="acc-muted acc-small">From: Twin Lakes Reservations · {date(message.createdAt)} (Philippine time)</p>
        <div id={'inbox-' + message.id} hidden={opened !== message.id}>
          <p className="acc-small">To: {message.to}</p>
          <div style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', lineHeight: 1.7 }}>{message.text}</div>
        </div>
      </article>)}
    </div>
    <div className="acc-form-footer" style={{ marginTop: 16 }}>
      <button type="button" className="btn ghost-dark" disabled={busy || page === 1} onClick={() => setPage(page - 1)}>Previous</button>
      <span>Page {page}</span>
      <button type="button" className="btn ghost-dark" disabled={busy || !data.hasMore} onClick={() => setPage(page + 1)}>Next</button>
    </div>
  </section>
}
