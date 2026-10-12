import { useState } from 'react'
import useReveal from '../hooks/useReveal'
import { useAuth } from '../hooks/useAuth'

const rooms = [
  {
    name: 'Superior Room',
    image: '/room-1.jpg',
    description:
      'A comfortable base for two adults and two kids, with a private balcony overlooking the estate and a modern bath with bidet.',
    floorSpace: '32 sqm',
    capacity: '2 adults and 2 kids',
    available: 'King and twin bed configurations',
  },
  {
    name: 'Deluxe Room',
    image: '/room-2.jpg',
    description:
      'A spacious room with a seating area, soundproofed walls, and a private balcony with sweeping views of Taal Lake.',
    floorSpace: '36 sqm',
    capacity: '2 adults and 1 child',
    available: 'King bed configuration',
  },
  {
    name: 'Premier King',
    image: '/room-3.jpg',
    description:
      'An elegant retreat with a king-size bed, plush seating, and refined interiors designed for restful stays.',
    floorSpace: '36 sqm',
    capacity: '2 adults',
    available: 'King or queen bed configurations',
  },
  {
    name: 'Deluxe Executive King',
    image: '/room-4.jpg',
    description:
      'Wake up to lake views from your private balcony in this generously sized executive room.',
    floorSpace: '36 sqm',
    capacity: '2 adults',
    available: 'King bed with lake view',
  },
  {
    name: '2-Bedroom Family Suite',
    image: '/room-5.jpg',
    description:
      'Marvel at the breathtaking Taal Lake view from the comfort of a 2-Bedroom Suite, designed for families or groups of 4–6 guests. Features a chic receiving area, a master bedroom with a king-size bed, a second bedroom with two single beds, and two bathrooms.',
    floorSpace: '106 sqm',
    capacity: '4 adults and 2 kids',
    available: 'King and twin bed configurations',
  },
  {
    name: 'Presidential Suite',
    image: '/room-6.jpg',
    description:
      'The pinnacle of luxury — 106 sqm of refined space with panoramic lake views, a private living area, and premium amenities throughout.',
    floorSpace: '106 sqm',
    capacity: '4 adults and 2 kids',
    available: 'King and twin bed configurations',
  },
]

export default function Rooms() {
  const [index, setIndex] = useState(0)
  const ref = useReveal()
  const { openAuth } = useAuth()
  const room = rooms[index]

  const prev = () => setIndex((i) => (i - 1 + rooms.length) % rooms.length)
  const next = () => setIndex((i) => (i + 1) % rooms.length)

  return (
    <section id="rooms">
      <div className="wrap reveal" ref={ref}>
        <span className="rooms-badge">ROOMS</span>
        <h2 className="rooms-title">Spacious Accommodations</h2>

        <div className="rooms-slider">
          <div className="rooms-photo">
            <img src={room.image} alt={room.name} />
          </div>

          <div className="rooms-info">
            <div className="rooms-info-header">
              <h3>{room.name}</h3>
              <div className="rooms-nav">
                <button onClick={prev} aria-label="Previous room">←</button>
                <button onClick={next} aria-label="Next room">→</button>
              </div>
            </div>

            <p className="rooms-desc">{room.description}</p>

            <ul className="rooms-details">
              <li><strong>Floor space:</strong> {room.floorSpace}</li>
              <li><strong>Capacity:</strong> {room.capacity}</li>
              <li><strong>Available in:</strong> {room.available}</li>
            </ul>

            <button className="btn rooms-book" onClick={openAuth}>Book Now</button>
          </div>
        </div>

        <div className="rooms-dots">
          {rooms.map((_, i) => (
            <button
              key={i}
              className={i === index ? 'dot active' : 'dot'}
              onClick={() => setIndex(i)}
              aria-label={`Go to room ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  )
}