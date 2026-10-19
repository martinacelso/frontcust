import { useRef, useState } from 'react'
import { useAccount } from '../../context/AccountContext'
import RoomSearch from './RoomSearch'
import BookingModal from './BookingModal'

export default function BookTab({ initialSearch = null, onBooked = () => {} }) {
  const { addBooking, simulatePayment, demoEnabled } = useAccount()
  const [modal, setModal] = useState(null)
  const pending = useRef(null)
  function showHold(booking) {
    if (booking.st !== 'pending-payment') {
      setModal({ type: booking.st === 'confirmed' ? 'confirmed' : 'receipt', booking }); return
    }
    setModal({ type: 'hold', booking, label: 'Continue to payment', onConfirm: demoEnabled ? () => {
      setModal({ type: 'simulate', booking, label: 'Confirm payment', onConfirm: async (method) => {
        const result = await simulatePayment(booking.id, method)
        if (result.error) return result
        setModal({ type: 'confirmed', booking: result.booking })
        return false
      } })
      return false
    } : undefined })
  }
  function choose(selection) {
    const signature = JSON.stringify({ stay: selection.stay, total: selection.quote.totalCents })
    if (pending.current?.signature !== signature) pending.current = { signature, requestId: crypto.randomUUID() }
    const requestId = pending.current.requestId
    setModal({ type: 'checkout', checkout: selection, requestId, label: 'Reserve room', onConfirm: async () => {
      const result = await addBooking({ ...selection.stay, expectedTotalCents: selection.quote.totalCents, requestId })
      if (result.error) return result
      pending.current = null
      onBooked()
      showHold(result.booking)
      return false
    } })
  }
  return <>
    <h2 className="acc-section-title">Find your room</h2>
    {initialSearch?.type && <p>Your selected room was {initialSearch.type}. Check the current availability below.</p>}
    <p className="acc-muted">Prices below are standard room rates. Promotional discounts are not applied in this booking flow yet.</p>
    {!demoEnabled && <p className="acc-muted">Demo payments are disabled. Reservations will remain on hold until DEMO_PAYMENTS=true is set in server/.env and the backend is restarted.</p>}
    <RoomSearch initialSearch={initialSearch} onChoose={choose} disabled={!!modal} />
    <BookingModal modal={modal} onClose={() => setModal(null)} />
  </>
}
