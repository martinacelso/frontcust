import useReveal from '../hooks/useReveal'

export default function About() {
  const ref = useReveal()
  return (
    <section id="about">
      <div className="wrap about reveal" ref={ref}>
        <div className="about-text">
          <h2>Twin Lakes Hotel near Tagaytay, Philippines</h2>
          <p>
            Nestled in Twin Lakes, an integrated tourism estate development of Megaworld
            Corporation in Laurel, Batangas, Twin Lakes Hotel presents a destination of calm
            where the signature heartwarming Filipino hospitality is felt, seen, and heard,
            further enriched by nature's splendor.
          </p>
          <p>
            Featuring 122 rooms with balconies offering captivating views of lush landscapes,
            family-friendly amenities, a heated infinity pool, a picturesque cafe, a wine
            gallery on the property's vineyard deck, and versatile function halls, every
            facet is designed to elevate your experience.
          </p>
        </div>
        <div className="about-image">
          <img src="/pool.jpg" alt="Twin Lakes Hotel pool" />
        </div>
      </div>
    </section>
  )
}