import { useState } from 'react'
import useReveal from '../hooks/useReveal'
import { useAuth } from '../hooks/useAuth'

const promos = [
  {
    name: 'TARA Promo',
    image: '/promo-1.jpg',
    description:
      'Travel Away & Reignite Adventure with Megaworld Hotels & Resorts. Book now and enjoy special rates starting at Php 3,800. Use promo code TARAMHR when booking directly. Valid for stays until November 30, 2026.',
  },
  {
    name: 'Kiddie Stay & Play',
    image: '/promo-2.jpg',
    description:
      'A fun-filled getaway for the little ones! Let your kids enjoy our indoor play area and game room while you unwind. Perfect for family staycations with children.',
  },
  {
    name: 'Daylightful Day Tour Packages',
    image: '/promo-3.jpg',
    description:
      'Make the most of your day with our day tour package. Enjoy access to the heated infinity pool, scenic views of Taal Lake, and a relaxing escape from the city.',
  },
  {
    name: 'Salaam Stay',
    image: '/promo-4.jpg',
    description:
      'Muslim-friendly accommodations designed for comfort and inclusivity. Enjoy in-room amenities and halal dining options for a worry-free stay.',
  },
  {
    name: 'Mindful Stays',
    image: '/promo-5.jpg',
    description:
      'Reconnect with nature and find your inner calm. Our wellness-focused package includes spa treatments and tranquil surroundings for a truly restorative experience.',
  },
  {
    name: 'Cheers and Celebrations',
    image: '/promo-6.jpg',
    description:
      "Celebrate life's special moments with us. Whether it's a birthday, anniversary, or intimate gathering, we'll make your occasion unforgettable.",
  },
  {
    name: 'Blissful Stay',
    image: '/promo-7.jpg',
    description:
      'Escape the hustle and bustle with a blissful staycation. Enjoy comfortable accommodations, stunning views, and warm Filipino hospitality.',
  },
  {
    name: 'Sampaguita Experience',
    image: '/promo-8.jpg',
    description:
      'Experience the warmth of Filipino hospitality with our signature Sampaguita touch. Thoughtful service, local flavors, and memorable moments await.',
  },
]

export default function Promos() {
  const [page, setPage] = useState(0)
  const [details, setDetails] = useState(null)
  const ref = useReveal()
  const { openAuth } = useAuth()

  const perPage = 3
  const totalPages = Math.ceil(promos.length / perPage)
  const shown = promos.slice(page * perPage, page * perPage + perPage)

  const prev = () => setPage((p) => (p - 1 + totalPages) % totalPages)
  const next = () => setPage((p) => (p + 1) % totalPages)

  return (
    <section id="promos">
      <div className="wrap reveal" ref={ref}>
        <span className="rooms-badge">PROMOS</span>

        <div className="facilities-header">
          <h2 className="facilities-title">Offers</h2>
          <div className="facilities-nav">
            <button onClick={prev} aria-label="Previous">←</button>
            <button onClick={next} aria-label="Next">→</button>
          </div>
        </div>

        <div className="promos-grid">
          {shown.map((p, i) => (
            <div className="promo-card" key={i}>
              <div className="promo-photo">
                <img src={p.image} alt={p.name} />
              </div>
              <div className="promo-body">
                <h3>{p.name}</h3>
                <div className="promo-actions">
                  <button
                    className="promo-btn outline"
                    onClick={() => setDetails(p)}
                  >
                    View details
                  </button>
                  <button
                    className="promo-btn filled"
                    onClick={openAuth}
                  >
                    Book now
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="facilities-dots">
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              className={i === page ? 'dot active' : 'dot'}
              onClick={() => setPage(i)}
              aria-label={`Go to page ${i + 1}`}
            />
          ))}
        </div>
      </div>

      {details && (
        <div className="acc-modal-overlay" onClick={() => setDetails(null)}>
          <div className="acc-modal promo-details" onClick={(e) => e.stopPropagation()}>
            <button className="acc-modal-x" onClick={() => setDetails(null)} aria-label="Close">×</button>
            <div className="promo-details-photo">
              <img src={details.image} alt={details.name} />
            </div>
            <div className="promo-details-body">
              <h3>{details.name}</h3>
              <p className="acc-muted">{details.description}</p>
              <div className="acc-promo-modal-actions">
                <button className="btn ghost-dark" onClick={() => setDetails(null)}>Close</button>
                <button className="btn" onClick={() => { setDetails(null); openAuth() }}>Book now</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}