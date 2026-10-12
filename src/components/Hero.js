import useReveal from '../hooks/useReveal'

export default function Hero() {
  const ref = useReveal()

  return (
    <div className="hero" id="top">
      <video
        className="hero-video"
        autoPlay
        muted
        loop
        playsInline
        poster=""
      >
        <source src="/video.mp4" type="video/mp4" />
      </video>
      <div className="hero-overlay" />
      <div className="wrap reveal" ref={ref}>
        <div className="eyebrow">Tagaytay · Batangas</div>
        <h1>Old-European charm above Taal Lake</h1>
        <p>Wake up to lake and vineyard views at a ridge-top hotel on the Tagaytay–Nasugbu Highway.</p>
        <a className="btn" href="#rooms">Explore Rooms</a>
      </div>
    </div>
  )
}