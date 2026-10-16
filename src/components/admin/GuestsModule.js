import { guestError } from '../../utils/validation'
import { useState } from 'react'
import { useAdmin, P } from '../../context/AdminContext'

const ID_TYPES = ['Passport', 'Driver’s License', 'National ID', 'SSS/UMID', 'Other']

export default function GuestsModule() {
  const {
    guests, bookings, setGuests, by, total, nextId, logAction, can,
  } = useAdmin()

  const [search, setSearch] = useState('')
  const [editModal, setEditModal] = useState(null)
  const [profileId, setProfileId] = useState(null)

  const filtered = guests.filter((g) =>
    (g.name + (g.email || '') + (g.phone || ''))
      .toLowerCase()
      .includes(search.toLowerCase())
  )

  function openEdit(id) {
    if (!id) {
      setEditModal({
        id: 0,
        firstName: '',
        lastName: '',
        phone: '',
        email: '',
        idType: 'Passport',
        idNumber: '',
      })
    } else {
      const g = by('guests', id)
      const parts = (g.name || '').split(' ')
      const lastName = parts.length > 1 ? parts.pop() : ''
      const firstName = parts.join(' ')
      setEditModal({
        id: g.id,
        firstName,
        lastName,
        phone: g.phone || '',
        email: g.email || '',
        idType: g.idType || 'Passport',
        idNumber: g.idNumber || '',
      })
    }
  }

  function saveEdit() {
    if (!can('guests')) return window.alert('You do not have permission to edit guests.')
    const error = guestError(editModal)
    if (error) return window.alert(error)
    if (!editModal.firstName.trim()) return window.alert('First name is required.')
    if (!editModal.lastName.trim()) return window.alert('Last name is required.')
    if (!editModal.phone.trim()) return window.alert('Phone is required.')
    if (!editModal.email.trim()) return window.alert('Email is required.')
    if (!editModal.idType) return window.alert('ID type is required.')
    if (!editModal.idNumber.trim()) return window.alert('ID number is required.')

    const fullName = `${editModal.firstName.trim()} ${editModal.lastName.trim()}`

    if (editModal.id) {
      logAction('Edited guest', fullName, 'Guest contact details updated')
      setGuests((prev) =>
        prev.map((g) =>
          g.id === editModal.id
            ? {
                ...g,
                name: fullName,
                phone: editModal.phone.trim(),
                email: editModal.email.trim(),
                idType: editModal.idType,
                idNumber: editModal.idNumber.trim(),
              }
            : g
        )
      )
    } else {
      logAction('Registered guest', fullName, 'Guest contact details updated')
      setGuests((prev) => [
        ...prev,
        {
          id: nextId(),
          name: fullName,
          phone: editModal.phone.trim(),
          email: editModal.email.trim(),
          idType: editModal.idType,
          idNumber: editModal.idNumber.trim(),
        },
      ])
    }
    setEditModal(null)
  }

  const upd = (key, value) => setEditModal((m) => ({ ...m, [key]: value }))

  const profileGuest = profileId ? by('guests', profileId) : null
  const profileBookings = profileId
    ? bookings.filter((b) => b.g === profileId)
    : []

  return (
    <>
      <div className="admin-row">
        <div>
          <input
            placeholder="Search guests by name, email, phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div>
          <button className="admin-btn" onClick={() => openEdit(0)}>
            + Register guest
          </button>
        </div>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Email</th>
              <th>ID</th>
              <th>Stays</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan="6" className="admin-muted">No guests found.</td></tr>
            ) : (
              filtered.map((g) => {
                const stays = bookings.filter(
                  (b) => b.g === g.id && b.st !== 'cancelled'
                ).length
                return (
                  <tr key={g.id}>
                    <td>{g.name}</td>
                    <td>{g.phone}</td>
                    <td>{g.email}</td>
                    <td className="admin-muted">
                      {g.idType ? `${g.idType}${g.idNumber ? ' · ' + g.idNumber : ''}` : '—'}
                    </td>
                    <td>{stays}</td>
                    <td>
                      <button className="admin-link" onClick={() => setProfileId(g.id)}>
                        Profile
                      </button>
                      <button className="admin-link" onClick={() => openEdit(g.id)}>
                        Edit
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ---- Add/edit modal ---- */}
      {editModal && (
        <div className="acc-modal-overlay" onClick={() => setEditModal(null)}>
          <div className="acc-modal acc-modal-wide" onClick={(e) => e.stopPropagation()}>
            <h3>{editModal.id ? 'Edit guest' : 'Register guest'}</h3>

            <div className="form-section-title">Personal details</div>
            <div className="form-grid">
              <div>
                <label>First name *</label>
                <input
                  value={editModal.firstName}
                  onChange={(e) => upd('firstName', e.target.value)}
                />
              </div>
              <div>
                <label>Last name *</label>
                <input
                  value={editModal.lastName}
                  onChange={(e) => upd('lastName', e.target.value)}
                />
              </div>
              <div>
                <label>Phone *</label>
                <input
                  value={editModal.phone}
                  onChange={(e) => upd('phone', e.target.value)}
                />
              </div>
              <div>
                <label>Contact email *</label>
                <input
                  type="email"
                  value={editModal.email}
                  onChange={(e) => upd('email', e.target.value)}
                />
              </div>
            </div>

            <p className="acc-muted acc-small">This is the reservation contact email. Editing it does not change an online account’s login email or ownership.</p>
            <div className="form-section-title">Identification</div>
            <div className="form-grid">
              <div>
                <label>ID type *</label>
                <select
                  value={editModal.idType}
                  onChange={(e) => upd('idType', e.target.value)}
                >
                  {ID_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label>ID number *</label>
                <input
                  value={editModal.idNumber}
                  onChange={(e) => upd('idNumber', e.target.value)}
                />
              </div>
            </div>

            <div className="acc-modal-actions">
              <button className="btn ghost-dark" onClick={() => setEditModal(null)}>Cancel</button>
              <button className="btn" onClick={saveEdit}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Profile modal ---- */}
      {profileGuest && (
        <div className="acc-modal-overlay" onClick={() => setProfileId(null)}>
          <div className="acc-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{profileGuest.name}</h3>

            <div className="form-grid" style={{ marginTop: 12 }}>
              <div>
                <label>Phone</label>
                <div className="acc-muted">{profileGuest.phone || '—'}</div>
              </div>
              <div>
                <label>Email</label>
                <div className="acc-muted">{profileGuest.email || '—'}</div>
              </div>
              <div>
                <label>ID type</label>
                <div className="acc-muted">{profileGuest.idType || '—'}</div>
              </div>
              <div>
                <label>ID number</label>
                <div className="acc-muted">{profileGuest.idNumber || '—'}</div>
              </div>
            </div>

            <h4 className="admin-h4">Booking history</h4>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Ref</th>
                    <th>Dates</th>
                    <th>Status</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {profileBookings.length === 0 ? (
                    <tr><td colSpan="4" className="admin-muted">No bookings yet.</td></tr>
                  ) : (
                    profileBookings.map((b) => (
                      <tr key={b.id}>
                        <td>#{b.id}</td>
                        <td>{b.in} → {b.out}</td>
                        <td><span className={`admin-badge ${b.st}`}>{b.st}</span></td>
                        <td>{P(total(b))}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="acc-modal-actions">
              <button className="btn" onClick={() => setProfileId(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}