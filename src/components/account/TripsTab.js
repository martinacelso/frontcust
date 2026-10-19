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
  function cancel(id) {
    const booking = mine.find((b) => b.id === id)
    setModal({ type: 'cancel', booking, label: booking.paid > booking.refunded ? 'Cancel and refund' : 'Cancel reservation', onConfirm: async () => {
      const result = await cancelBooking(id, booking.paid > booking.refunded)
      if (result.error) return result
      setModal({ type: 'receipt', booking: result.booking }); return false
    } })
  }
  function pay(id) {
    setModal({ type: 'simulate', booking: mine.find((b) => b.id === id), label: 'Confirm payment', onConfirm: async (method, paymentDetails) => {
      const result = await simulatePayment(id, method, paymentDetails)
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
