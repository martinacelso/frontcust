import { useState } from 'react'
import { useAccount } from '../../context/AccountContext'
import TripCard from './TripCard'
import BookingModal from './BookingModal'

export default function TripsTab() {
  const { myBookings, cancelBooking } = useAccount()
  const [modal, setModal] = useState(null)

  const mine = myBookings()
  const today = new Date().toISOString().slice(0, 10)
  const isUpcoming = (b) =>
    b.st !== 'cancelled' && b.out >= today && b.st !== 'checked-out'

  const upcoming = mine.filter(isUpcoming)
  const pastAndCancelled = mine.filter((b) => !isUpcoming(b))

  function handleViewDetails(id) {
    const b = mine.find((x) => x.id === id)
    if (b) setModal({ type: 'receipt', booking: b })
  }

  function handleCancel(id) {
    const b = mine.find((x) => x.id === id)
    if (!b) return
    setModal({
      type: 'cancel',
      booking: b,
      label: 'Yes, cancel',
      onConfirm: () => cancelBooking(id),
    })
  }

  return (
    <>
      <h2 className="acc-section-title">Upcoming</h2>
      {upcoming.length > 0 ? (
        upcoming.map((b) => (
          <TripCard
            key={b.id}
            booking={b}
            onViewDetails={handleViewDetails}
            onCancel={handleCancel}
          />
        ))
      ) : (
        <div className="acc-empty">Nothing upcoming.</div>
      )}

      <h2 className="acc-section-title">Past &amp; cancelled</h2>
      {pastAndCancelled.length > 0 ? (
        pastAndCancelled.map((b) => (
          <TripCard
            key={b.id}
            booking={b}
            onViewDetails={handleViewDetails}
            onCancel={handleCancel}
          />
        ))
      ) : (
        <div className="acc-empty">No past bookings yet.</div>
      )}

      <BookingModal modal={modal} onClose={() => setModal(null)} />
    </>
  )
}