import { useAuth } from '../hooks/useAuth'

export default function Header() {
  const { openAuth } = useAuth()

  return (
    <header>
      <div className="wrap">
        <a className="logo" href="#top">TWIN LAKES HOTEL</a>
        <nav>
          <a href="#rooms">Rooms</a>
          <a href="#facilities">Facilities</a>
          <a href="#promos">Offers</a>
          <a href="#location">Location</a>
        </nav>
        <div className="header-actions">
          <button className="btn ghost-outline" onClick={openAuth}>Log In</button>
          <button className="btn" onClick={openAuth}>Book Now</button>
        </div>
      </div>
    </header>
  )
}