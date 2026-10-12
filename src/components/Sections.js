import useReveal from '../hooks/useReveal'
import { useAuth } from '../hooks/useAuth'

export function Experience() {
  const ref = useReveal()
  const { openAuth } = useAuth()
  return (
    <section className="alt" id="experience">
      <div className="wrap split reveal" ref={ref}>
        <div className="ph video-ph">
          <video autoPlay muted loop playsInline>
            <source src="/experience.mp4" type="video/mp4" />
          </video>
        </div>
        <div>
          <div className="eyebrow">The Experience</div>
          <h2 style={{ fontSize: 34, marginBottom: 14 }}>Weddings, vineyards &amp; slow weekends</h2>
          <p style={{ color: 'var(--mut)' }}>
            Set within the Twin Lakes estate, the hotel is known for its terraced vineyard,
            a grand ballroom for celebrations, and a restaurant facing Taal Lake. Perfect for
            couples, families and events.
          </p>
          <button className="btn" style={{ marginTop: 10 }} onClick={openAuth}>Plan your stay</button>
        </div>
      </div>
    </section>
  )
}

export function Location() {
  const ref = useReveal()
  const places = [
    { name: 'Picnic Grove', dist: 'About 8.9 km away', image: '/nearby-1.jpg' },
    { name: "People's Park in the Sky", dist: 'About 13 km away', image: '/nearby-2.jpg' },
    { name: 'Calaruega', dist: 'About 15 km away', image: '/nearby-3.jpg' },
    { name: 'NAIA Airport', dist: 'About 51 km away', image: '/nearby-4.jpg' },
  ]

  return (
    <section className="alt" id="location">
      <div className="wrap reveal" ref={ref}>
        <div className="head">
          <h2>Find us</h2>
          <p>Tagaytay–Nasugbu Highway, Laurel, Batangas, Philippines</p>
        </div>
        <div className="grid">
          {places.map((p, i) => (
            <div className="card nearby-card" key={i}>
              <div className="nearby-photo">
                <img src={p.image} alt={p.name} />
              </div>
              <div className="b">
                <h3>{p.name}</h3>
                <p>{p.dist}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function Footer() {
  return (
    <footer id="footer">
      <div className="wrap footer-grid">
        <div className="footer-left">
          <img className="footer-logo" src="/logo.png" alt="Twin Lakes Hotel" />
          <p className="footer-tagline">Luxuriate with Nature's Splendor</p>
          <p className="footer-desc">
            Nestled in Twin Lakes, an integrated tourism estate development of Megaworld
            Corporation in Laurel, Batangas, Twin Lakes Hotel presents a destination of calm
            where the signature heartwarming Filipino hospitality is felt, seen, and heard,
            further enriched by nature's splendor.
          </p>

          <div className="footer-awards">
            <img src="/award-1.png" alt="Tripadvisor Travelers' Choice 2025" />
            <img src="/award-2.png" alt="Muslim-Friendly Accommodation Establishment" />
            <img src="/award-3.png" alt="Travel Excellence Awards 2024 Winner" />
          </div>
        </div>

        <div className="footer-right">
          <h3 className="footer-heading">CONTACT US</h3>

          <div className="footer-contact">
            <span className="footer-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
            </span>
            <div>
              <p>Trunkline: (043) 302 1688</p>
              <p>Reservations: +63 917 853 7468 or +63 917 846 1389</p>
            </div>
          </div>

          <div className="footer-contact">
            <span className="footer-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
            </span>
            <p>reservations@twinlakeshotel.com.ph</p>
          </div>

          <div className="footer-contact">
            <span className="footer-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
            </span>
            <p>Tagaytay–Nasugbu Highway, Laurel, Batangas, Luzon 4221, Philippines</p>
          </div>

          <div className="footer-socials">
            <a href="#" aria-label="TikTok">
              <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.86a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.84-.29z"/>
              </svg>
            </a>
            <a href="#" aria-label="Facebook">
              <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.51 1.49-3.9 3.77-3.9 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12z"/>
              </svg>
            </a>
            <a href="#" aria-label="Instagram">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                <rect x="3" y="3" width="18" height="18" rx="5"/>
                <circle cx="12" cy="12" r="4"/>
                <circle cx="17.5" cy="6.5" r="1" fill="currentColor"/>
              </svg>
            </a>
            <a href="#" aria-label="Tripadvisor">
              <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                <circle cx="7" cy="13" r="3"/>
                <circle cx="17" cy="13" r="3"/>
                <circle cx="7" cy="13" r="1.2" fill="#1a1a1a"/>
                <circle cx="17" cy="13" r="1.2" fill="#1a1a1a"/>
                <path d="M12 6c-2.5 0-4.7 1-6.4 2.4L3 6l2 4h-.5a4.5 4.5 0 1 0 4.5 4.5c0-.5-.1-1-.3-1.5.5-.1 1-.1 1.6-.1s1.1 0 1.6.1c-.2.5-.3 1-.3 1.5A4.5 4.5 0 1 0 19.5 10H19l2-4-2.6 2.4A10.4 10.4 0 0 0 12 6z"/>
              </svg>
            </a>
          </div>
        </div>
      </div>

      <div className="wrap footer-bottom">
        <div>
          <p>Powered by Archipelago.</p>
          <p>Copyright 2026 © Archipelago International.</p>
        </div>
        <div className="footer-links">
          <a href="#">Club Access</a>
          <a href="#">Privacy Policy</a>
        </div>
      </div>
    </footer>
  )
}