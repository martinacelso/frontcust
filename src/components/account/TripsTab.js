import { useEffect, useState } from 'react'
import { useAccount } from '../../context/AccountContext'
import TripCard from './TripCard'
import BookingModal from './BookingModal'
export default function TripsTab() {
  const { myBookings, refreshBookings, bookingLoading, bookingError, bookingBusy, cancelBooking, simulatePayment, demoEnabled } = useAccount()
  const [modal, setModal] = useState(null)
  useEffect(() => { refreshBookings() }, [refreshBookings])
  const mine = myBookings()
  function details(id) { setModal({ type: 'receipt', booking: mine.find((b) => b.id === id) }) }
  function cancel(id) { setModal({ type: 'cancel', booking: mine.find((b) => b.id === id), label: 'Cancel reservation', onConfirm: () => cancelBooking(id) }) }
  function pay(id) {
    setModal({ type: 'simulate', booking: mine.find((b) => b.id === id), label: 'Simulate down payment', onConfirm: async () => {
      const result = await simulatePayment(id)
      if (result.error) return result
      setModal({ type: 'confirmed', booking: result.booking }); return false
    } })
  }
  return <>
    <h2 className="acc-section-title">My bookings</h2>
    <button className="btn ghost-dark" disabled={bookingLoading || bookingBusy || !!modal} onClick={refreshBookings}>{bookingLoading ? 'Loading…' : 'Refresh bookings'}</button>
    {bookingError && <p className="acc-error" role="alert">{bookingError}</p>}
    {!bookingLoading && !bookingError && mine.length === 0 && <div className="acc-empty">You have no saved bookings yet.</div>}
    {mine.map((b) => <TripCard key={b.id} booking={b} busy={bookingBusy || bookingLoading || !!modal} onViewDetails={details} onCancel={cancel} onPay={demoEnabled ? pay : undefined} />)}
    <BookingModal modal={modal} onClose={() => setModal(null)} />
  </>
}
