import { useEffect, useRef, useState } from 'react'
import { useAdmin } from '../../context/AdminContext'
import { bookingRequest } from '../../utils/bookingApi'
const roles = { admin: 'Administrator', 'front-desk': 'Front Desk', housekeeping: 'Housekeeping' }
export default function StaffModule() {
  const { sessionUser } = useAdmin()
  if (sessionUser?.role !== 'admin') return <p role="alert">Administrator access required.</p>
  return <Staff key={sessionUser.id} self={sessionUser.id} />
}
function Staff({ self }) {
  const [rows, setRows] = useState([]), [page, setPage] = useState(1), [more, setMore] = useState(false)
  const [revision, setRevision] = useState(0), [busy, setBusy] = useState(false), [loading, setLoading] = useState(true)
  const [error, setError] = useState(''), [message, setMessage] = useState(''), [edit, setEdit] = useState(null)
  const lock = useRef(false), alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  useEffect(() => {
    let current = true; setLoading(true); setRows([]); setError('')
    bookingRequest('/staff?page=' + page).then((r) => { if (!current) return; if (r.error) setError(r.error); else { setRows(r.staff); setMore(r.hasMore) } setLoading(false) })
    return () => { current = false }
  }, [page, revision])
  async function save(e) {
    e.preventDefault(); if (lock.current) return
    lock.current = true; setBusy(true); setError(''); setMessage('')
    try {
      const r = await bookingRequest('/staff/save', edit)
      if (!alive.current) return
      if (r.error) { setError(r.error); setEdit((v) => ({ ...v, adminPassword: '', password: '' })) }
      else { setMessage(r.message); setEdit(null); setRevision((n) => n + 1) }
    } finally { lock.current = false; if (alive.current) setBusy(false) }
  }
  return <>
    <p>Create staff accounts, change roles, reset passwords, or disable access. Disabled accounts remain in historical records.</p>
    {error && <p role="alert" className="acc-error">{error}</p>}{message && <p role="status">{message}</p>}
    <button className="admin-btn" disabled={!!edit || loading} onClick={() => setEdit({ name: '', email: '', department: '', role: 'front-desk', active: true, password: '', adminPassword: '' })}>Add employee</button>{' '}
    <button className="admin-btn" disabled={!!edit || loading} onClick={() => setRevision((n) => n + 1)}>Refresh</button>
    <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Name</th><th>Login email</th><th>Role</th><th>Department</th><th>Account</th><th>Action</th></tr></thead>
      <tbody>{rows.map((r) => <tr key={r.id}><td>{r.name}</td><td>{r.email}</td><td>{roles[r.role]}</td><td>{r.department || 'Unavailable'}</td><td>{r.active ? 'Active' : 'Disabled'}</td><td>{r.id === self ? 'Use My account' : <button className="admin-link" disabled={!!edit} onClick={() => { setError(''); setMessage(''); setEdit({ ...r, password: '', adminPassword: '' }) }}>Edit / reset password</button>}</td></tr>)}
        {!rows.length && <tr><td colSpan="6">{loading ? 'Loading…' : 'No staff records on this page.'}</td></tr>}</tbody></table></div>
    <button className="admin-btn" disabled={loading || !!edit || page === 1} onClick={() => setPage((n) => n - 1)}>Previous</button> Page {page} <button className="admin-btn" disabled={loading || !!edit || !more} onClick={() => setPage((n) => n + 1)}>Next</button>
    {edit && <form onSubmit={save} className="admin-card" style={{ padding: 20, marginTop: 16 }}><h3>{edit.id ? 'Edit employee' : 'Create employee'}</h3>
      <fieldset disabled={busy} style={{ display: 'grid', gap: 12, border: 0 }}>
        {['name', 'email', 'department'].map((key) => <label key={key}>{({ name: 'Full name', email: 'Login email', department: 'Department (optional)' })[key]}<input style={{ display: 'block' }} required={key !== 'department'} type={key === 'email' ? 'email' : 'text'} maxLength={key === 'email' ? 254 : key === 'name' ? 100 : 80} value={edit[key]} onChange={(e) => setEdit({ ...edit, [key]: e.target.value })} /></label>)}
        <label>Role <select value={edit.role} onChange={(e) => setEdit({ ...edit, role: e.target.value })}>{Object.entries(roles).map(([v, name]) => <option key={v} value={v}>{name}</option>)}</select></label>
        <label><input type="checkbox" checked={edit.active} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} /> Account active</label>
        <label>{edit.id ? 'New password (leave blank to keep current)' : 'Initial password'}<input type="password" autoComplete="new-password" required={!edit.id} minLength={8} maxLength={72} value={edit.password} onChange={(e) => setEdit({ ...edit, password: e.target.value })} /></label>
        <label>Your administrator password<input type="password" autoComplete="current-password" required value={edit.adminPassword} onChange={(e) => setEdit({ ...edit, adminPassword: e.target.value })} /></label>
        <p>Saving changes signs this employee out of existing sessions. Review role and active status before saving.</p>
        <button className="admin-btn">{busy ? 'Saving…' : 'Confirm and save'}</button><button type="button" className="admin-btn" onClick={() => setEdit(null)}>Cancel</button>
      </fieldset></form>}
    <h3>Role access</h3><ul><li>Administrator: all modules and staff management.</li><li>Front Desk: dashboard, read-only room availability, reservations, guests, check-in/out and billing.</li><li>Housekeeping: dashboard and housekeeping.</li></ul>
    <p>These roles are enforced by the server. Use role assignment to change employee access.</p>
  </>
}
