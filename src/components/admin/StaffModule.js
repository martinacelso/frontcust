import { profileError, passwordError } from '../../utils/validation'
import { useState } from 'react'
import { useAdmin, MODS } from '../../context/AdminContext'

export default function StaffModule() {
  const {
    staff, perms, user, setStaff, setPerms, nextId, logAction,
  } = useAdmin()

  const { can } = useAdmin()

  const [tab, setTab] = useState('st')
  const [editModal, setEditModal] = useState(null)

  function openEdit(id) {
    if (!id) {
      setEditModal({ id: 0, name: '', email: '', role: 'Front Desk', dept: 'Front Office', pw: 'welcome1' })
    } else {
      const s = staff.find((x) => x.id === id)
      setEditModal({ id: s.id, name: s.name, email: s.email, role: s.role, dept: s.dept, pw: '' })
    }
  }

  function saveEdit() {
    if (!can('staff')) return window.alert('You do not have permission to manage staff.')
    const error = profileError(editModal, staff, editModal.id) || (!editModal.id ? passwordError(editModal.pw) : '')
    if (error) return window.alert(error)
    if (!roles.includes(editModal.role)) return window.alert('Select a valid role.')
    if (editModal.id === user.id && editModal.role !== user.role) return window.alert('You cannot change your own role.')
    if (editModal.id && !staff.some((s) => s.id === editModal.id)) return window.alert('This employee no longer exists.')
    logAction(
      editModal.id ? 'Edited employee' : 'Added employee',
      editModal.name,
      `${editModal.role} · ${editModal.dept}`
    )
    if (editModal.id) {
      setStaff((prev) =>
        prev.map((s) =>
          s.id === editModal.id
            ? { ...s, name: editModal.name.trim(), email: editModal.email.trim(), role: editModal.role, dept: editModal.dept }
            : s
        )
      )
    } else {
      setStaff((prev) => [
        ...prev,
        {
          id: nextId(),
          name: editModal.name.trim(),
          email: editModal.email.trim(),
          role: editModal.role,
          dept: editModal.dept,
          pw: editModal.pw || 'welcome1',
          on: true,
        },
      ])
    }
    setEditModal(null)
  }

  function toggleStaff(id) {
    if (!can('staff')) return window.alert('You do not have permission to manage staff.')
    if (id === user.id) return window.alert("You can't disable your own account.")
    const s = staff.find((x) => x.id === id)
    if (!s) return window.alert('This employee no longer exists.')
    if (!window.confirm(`${s.on ? 'Disable' : 'Enable'} ${s.name}'s account?`)) return
    logAction(s.on ? 'Disabled employee' : 'Enabled employee', s.name, s.role)
    setStaff((prev) => prev.map((x) => (x.id === id ? { ...x, on: !x.on } : x)))
  }

  function resetPassword(id) {
    if (!can('staff')) return window.alert('You do not have permission to manage staff.')
    const s = staff.find((x) => x.id === id)
    if (!s) return window.alert('This employee no longer exists.')
    if (!window.confirm(`Reset ${s.name}'s password to the default welcome1?`)) return
    logAction('Reset password', s.name, 'Password reset')
    setStaff((prev) => prev.map((x) => (x.id === id ? { ...x, pw: 'welcome1' } : x)))
    window.alert('Password reset to: welcome1')
  }

  function deleteStaff(id) {
    if (!can('staff')) return window.alert('You do not have permission to manage staff.')
    if (id === user.id) return window.alert("You can't delete your own account.")
    if (!staff.some((s) => s.id === id)) return window.alert('This employee no longer exists.')
    if (window.confirm('Delete this employee?')) {
      const s = staff.find((x) => x.id === id)
      logAction('Deleted employee', s.name, s.role)
      setStaff((prev) => prev.filter((s) => s.id !== id))
    }
  }

  function togglePermission(role, moduleId, enabled) {
    if (!can('staff')) return window.alert('You do not have permission to manage staff.')
    if (!Object.hasOwn(perms, role) || !MODS.some(([id]) => id === moduleId)) return window.alert('Choose a valid role and module.')
    if (role === 'Admin' || moduleId === 'dash') return window.alert('Administrator access and dashboard access are required.')
    if (!window.confirm(`${enabled ? 'Grant' : 'Remove'} ${moduleId} access for ${role}?`)) return
    logAction('Edited permissions', role, `${enabled ? 'Enabled' : 'Disabled'} ${moduleId}`)
    setPerms((prev) => {
      const list = [...(prev[role] || [])]
      const idx = list.indexOf(moduleId)
      if (enabled && idx < 0) list.push(moduleId)
      if (!enabled && idx > -1) list.splice(idx, 1)
      return { ...prev, [role]: list }
    })
  }

  const roles = Object.keys(perms)

  return (
    <>
      <div className="admin-tabs">
        <button className={`admin-btn ${tab === 'st' ? '' : 's'}`} onClick={() => setTab('st')}>Employees</button>
        <button className={`admin-btn ${tab === 'ro' ? '' : 's'}`} onClick={() => setTab('ro')}>Roles &amp; permissions</button>
      </div>

      {tab === 'st' && (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr><th>Name</th><th>Email</th><th>Role</th><th>Department</th><th>Account</th><th /></tr>
              </thead>
              <tbody>
                {staff.map((s) => (
                  <tr key={s.id}>
                    <td>{s.name}</td>
                    <td>{s.email}</td>
                    <td>{s.role}</td>
                    <td>{s.dept}</td>
                    <td>
                      <span className={`admin-badge ${s.on ? 'available' : 'cancelled'}`}>
                        {s.on ? 'active' : 'disabled'}
                      </span>
                    </td>
                    <td>
                      <button className="admin-link" onClick={() => openEdit(s.id)}>Edit</button>
                      <button className="admin-link" onClick={() => toggleStaff(s.id)}>{s.on ? 'Disable' : 'Enable'}</button>
                      <button className="admin-link" onClick={() => resetPassword(s.id)}>Reset pw</button>
                      <button className="admin-link danger" onClick={() => deleteStaff(s.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button className="admin-btn" onClick={() => openEdit(0)}>+ Add employee</button>
        </>
      )}

      {tab === 'ro' && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>Module</th>{roles.map((r) => (<th key={r}>{r}</th>))}</tr>
            </thead>
            <tbody>
              {MODS.map(([id, label]) => (
                <tr key={id}>
                  <td>{label}</td>
                  {roles.map((r) => {
                    const isAdmin = r === 'Admin'
                    const isDash = id === 'dash'
                    const checked = isAdmin || isDash ? true : (perms[r] || []).indexOf(id) > -1
                    return (
                      <td key={r} style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={isAdmin || isDash}
                          onChange={(e) => togglePermission(r, id, e.target.checked)}
                        />
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editModal && (
        <div className="acc-modal-overlay" onClick={() => setEditModal(null)}>
          <div className="acc-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editModal.id ? 'Edit employee' : 'Add employee'}</h3>
            <label>Full name</label>
            <input value={editModal.name} onChange={(e) => setEditModal({ ...editModal, name: e.target.value })} />
            <label>Email (login)</label>
            <input type="email" value={editModal.email} onChange={(e) => setEditModal({ ...editModal, email: e.target.value })} />
            <label>Role</label>
            <select value={editModal.role} onChange={(e) => setEditModal({ ...editModal, role: e.target.value })}>
              {roles.map((r) => (<option key={r} value={r}>{r}</option>))}
            </select>
            <label>Department</label>
            <select value={editModal.dept} onChange={(e) => setEditModal({ ...editModal, dept: e.target.value })}>
              {['Management', 'Operations', 'Front Office', 'Housekeeping', 'Food & Beverage', 'Maintenance'].map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            {!editModal.id && (
              <>
                <label>Initial password</label>
                <input value={editModal.pw} onChange={(e) => setEditModal({ ...editModal, pw: e.target.value })} />
              </>
            )}
            <div className="acc-modal-actions">
              <button className="btn ghost-dark" onClick={() => setEditModal(null)}>Cancel</button>
              <button className="btn" onClick={saveEdit}>Save</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}