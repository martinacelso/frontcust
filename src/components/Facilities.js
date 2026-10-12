import { useState } from 'react'
import useReveal from '../hooks/useReveal'

const facilities = [
  {
    name: 'Grand Ballroom',
    image: '/facility-1.jpg',
    description:
      "Celebrate life's milestones at Twin Lakes Hotel's Grand Ballroom, a 766 sqm, European-inspired venue in Tagaytay with high ceilings and a pillarless layout that accommodates up to 500 guests.",
  },
  {
    name: "L'Uva Vineyard Spa",
    image: '/facility-2.jpg',
    description:
      "Experience wellness that goes beyond skin-deep at L'Uva Vineyard Spa, open daily from 2pm to 9pm. Allow us to whisk you away into a world of deep relaxation.",
  },
  {
    name: 'Heated Infinity Pool',
    image: '/facility-3.jpg',
    description:
      "Dive into relaxation at Twin Lakes Hotel's heated infinity pool, where you can swim with breathtaking views of nature, including the stunning Taal Lake, rain or shine.",
  },
  {
    name: 'Twin Lakes Wine Gallery',
    image: '/facility-4.jpg',
    description:
      "A hidden gem in Laurel, Twin Lakes Wine Gallery is an unforgettable escape for the discerning palate with its European-inspired cuisine and exclusive collection of Harvey's Sherry.",
  },
  {
    name: 'Glass House',
    image: '/facility-5.jpg',
    description:
      'Experience intimate events in Tagaytay at the Glass House of Twin Lakes Hotel, an all-glass venue with stunning Taal Lake views, perfect for weddings and celebrations.',
  },
  {
    name: 'Grape Vineyard',
    image: '/facility-6.jpg',
    description:
      'Twin Lakes Hotel is home to one of the few grape vineyards in the Philippines. Popular for its annual Grape Harvest Festival held every April or May.',
  },
  {
    name: 'Kids Corner',
    image: '/facility-7.jpg',
    description:
      'A play room filled with fun activities and games, providing a safe and enjoyable space for children to play and make new friends. Open from 8:00am until 6:00pm.',
  },
  {
    name: 'Game Room',
    image: '/facility-8.jpg',
    description:
      'Unwind in our Game Room, where you can play chess, foosball, and billiards or simply relax with a good book and a cup of coffee. Open daily from 8:00am until 9:00pm.',
  },
  {
    name: 'Twin Lakes Cafe',
    image: '/facility-9.jpg',
    description:
      'Indulge in authentic Filipino cuisine at Twin Lakes Cafe, where every dish is crafted from fresh, locally sourced ingredients with a charming ambiance.',
  },
  {
    name: 'Zabana Bar',
    image: '/facility-10.jpg',
    description:
      'Our lobby bar offers an extensive selection of wines, expertly crafted cocktails, and refreshing mocktails, ensuring there is something to please every palate. Open 6:00pm to 10:00pm.',
  },
  {
    name: 'Function Rooms',
    image: '/facility-11.jpg',
    description:
      'Twin Lakes Hotel houses conference rooms that can be divided into three separate spaces, each equipped with projectors, white screens, high-speed Wi-Fi, and ample power outlets.',
  },
  {
    name: 'Fitness Center',
    image: '/facility-12.jpg',
    description:
      'Stay active and maintain your fitness routine when at Twin Lakes Hotel. Our facility is equipped with the latest exercise machines and free weights. Open daily from 7:00am until 9:00pm.',
  },
]

export default function Facilities() {
  const [page, setPage] = useState(0)
  const ref = useReveal()

  const perPage = 3
  const totalPages = Math.ceil(facilities.length / perPage)
  const shown = facilities.slice(page * perPage, page * perPage + perPage)

  const prev = () => setPage((p) => (p - 1 + totalPages) % totalPages)
  const next = () => setPage((p) => (p + 1) % totalPages)

  return (
    <section id="facilities">
      <div className="wrap reveal" ref={ref}>
        <span className="rooms-badge">FACILITIES</span>

        <div className="facilities-header">
          <h2 className="facilities-title">Perfect Blend of Relaxation and Productivity</h2>
          <div className="facilities-nav">
            <button onClick={prev} aria-label="Previous">←</button>
            <button onClick={next} aria-label="Next">→</button>
          </div>
        </div>

        <div className="facilities-grid">
          {shown.map((f, i) => (
            <div className="facility-card" key={i}>
              <div className="facility-photo">
                <img src={f.image} alt={f.name} />
              </div>
              <div className="facility-body">
                <h3>{f.name}</h3>
                <p>{f.description}</p>
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
    </section>
  )
}