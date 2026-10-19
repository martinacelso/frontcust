import { useEffect, useState } from 'react'
import { useAccount } from '../../context/AccountContext'
import TripCard from './TripCard'
import BookingModal from './BookingModal'
import RoomSearch from './RoomSearch'
export default function TripsTab() {
  const { myBookings, refreshBookings, bookingLoading, bookingError, bookingBusy, cancelBooking, simulatePayment, updateBooking,
    archiveBooking, restoreBooking, demoEnabled } = useAccount()
  const [modal, setModal] = useState(null)
  const [editing, setEditing] = useState(null)
  const [editError, setEditError] = useState('')
  const [message, setMessage] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  useEffect(() => { refreshBookings(showArchived) }, [refreshBookings, showArchived])
  const mine = myBookings().filter((booking) => showArchived || !booking.archived)
  function details(id) { setModal({ type: 'receipt', booking: mine.find((b) => b.id === id) }) }
  function cancel(id) {
    const booking = mine.find((b) => b.id === id)
    setModal({ type: 'cancel', booking, label: booking.paid > booking.refunded ? 'Cancel and refund' : 'Cancel reservation', onConfirm: async () => {
      const result = await cancelBooking(id, booking.paid > booking.refunded)
      if (result.error) return result
      setModal({ type: 'receipt', booking: result.booking }); return false
    } })
  }
  function pay(id) {
    setModal({ type: 'simulate', booking: mine.find((b) => b.id === id), label: 'Confirm payment', onConfirm: async (method) => {
      const result = await simulatePayment(id, method)
      if (result.error) return result
      setModal({ type: 'confirmed', booking: result.booking }); return false
    } })
  }
  async function saveEdit(selection) {
    if (!editing) return
    setEditError('')
    const result = await updateBooking(editing.id, {
      ...selection.stay, expectedTotalCents: selection.quote.totalCents,
      version: editing.version, requests: editing.requests || '',
    })
    if (result.error) setEditError(result.error)
    else {
      setEditing(null)
      setMessage('Booking details updated and saved.')
    }
  }
  async function setArchived(id, restore = false) {
    if (!restore && !window.confirm('Archive this booking record? It will remain stored with its payment and booking history.')) return
    const result = restore ? await restoreBooking(id) : await archiveBooking(id)
    if (result.error) setEditError(result.error)
    else { setEditError(''); setMessage(restore ? 'Booking restored from archive.' : 'Booking archived.'); refreshBookings(showArchived) }
  }
  return <>
    <h2 className="acc-section-title">My bookings</h2>
    <button className="btn ghost-dark" disabled={bookingLoading || bookingBusy || !!modal} onClick={() => refreshBookings(showArchived)}>{bookingLoading ? 'Loading…' : 'Refresh bookings'}</button>
    <label style={{ marginLeft: 12 }}><input type="checkbox" checked={showArchived} disabled={bookingLoading || bookingBusy}
      onChange={(event) => { setShowArchived(event.target.checked); setEditError('') }} /> Show archived bookings</label>
    {bookingError && <p className="acc-error" role="alert">{bookingError}</p>}
    {message && <p className="acc-saved" role="status">{message}</p>}
    {editError && !editing && <p role="alert" className="acc-error">{editError}</p>}
    {!bookingLoading && !bookingError && mine.length === 0 && <div className="acc-empty">You have no saved bookings yet.</div>}
    {mine.map((b) => <TripCard key={b.id} booking={b} busy={bookingBusy || bookingLoading || !!modal || !!editing} onViewDetails={details} onCancel={cancel} onPay={demoEnabled ? pay : undefined}
      onEdit={(id) => { setEditing(mine.find((row) => row.id === id)); setEditError(''); setMessage('') }}
      onArchive={(id) => setArchived(id)} onRestore={(id) => setArchived(id, true)} />)}
    {editing && <div className="acc-modal-overlay"><div className="acc-modal" role="dialog" aria-modal="true" aria-labelledby="edit-booking-title">
      <h3 id="edit-booking-title">Edit unpaid booking hold</h3>
      <p>Choose dates and guest counts again. The room and price will be checked and saved together. Payment has not been recorded for this hold.</p>
      {editError && <p role="alert" className="acc-error">{editError}</p>}
      <RoomSearch initialSearch={{ in: editing.in, out: editing.out, adults: editing.adults, children: editing.children }}
        disabled={bookingBusy} onChoose={saveEdit} />
      <div className="acc-modal-actions"><button className="btn ghost-dark" disabled={bookingBusy} onClick={() => setEditing(null)}>Close</button></div>
    </div></div>}
    <BookingModal modal={modal} onClose={() => setModal(null)} />
  </>
}
