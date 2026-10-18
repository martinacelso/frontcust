import RoomSearch from './account/RoomSearch'
export default function BookingForm({ onBook }) {
  return <section className="wrap book-wrap" id="book">
    <h2>Check availability</h2>
    <RoomSearch onChoose={({ type, stay }) => onBook?.({ type: type.name, in: stay.checkIn, out: stay.checkOut, adults: stay.adults, children: stay.children })} />
  </section>
}
