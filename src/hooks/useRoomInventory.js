import { useCallback, useEffect, useRef, useState } from 'react'
import { roomRequest } from '../utils/roomApi'

// This inventory is kept separate from the old browser-only reservations.
export default function useRoomInventory(includeArchived = false) {
  const [data, setData] = useState({ types: [], rooms: [] })
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const alive = useRef(false)
  const locked = useRef(false)
  const generation = useRef(0)

  const refresh = useCallback(async () => {
    if (locked.current) return
    locked.current = true
    const ticket = ++generation.current
    setBusy(true)
    setError('')
    setMessage('')
    const result = await roomRequest(includeArchived ? '?includeArchived=true' : '')
    if (!alive.current || ticket !== generation.current) return
    if (result.error) setError(result.error)
    else if (!Array.isArray(result.types) || !Array.isArray(result.rooms)) setError('Invalid room data returned by the server.')
    else setData({ types: result.types, rooms: result.rooms })
    locked.current = false
    setBusy(false)
  }, [includeArchived])

  useEffect(() => {
    alive.current = true
    locked.current = false
    refresh()
    return () => { alive.current = false; generation.current++ }
  }, [refresh])

  async function save(endpoint, method, body, success) {
    if (locked.current) return { error: 'Please wait for the current request.' }
    locked.current = true
    const ticket = ++generation.current
    setBusy(true)
    setError('')
    setMessage('')
    const result = await roomRequest(endpoint, method, body)
    if (!alive.current || ticket !== generation.current) return { error: 'This screen has closed.' }
    if (result.error) setError(result.error)
    else if (result.removedId) {
      setData((previous) => ({ ...previous, rooms: previous.rooms.filter((r) => r.id !== result.removedId) }))
      setMessage(success)
    } else if (!result.room && !result.type) {
      result.error = 'The save returned an unexpected response. Refresh before trying again.'
      setError(result.error)
    } else {
      const key = result.room ? 'rooms' : 'types'
      const row = result.room || result.type
      setData((previous) => ({ ...previous, [key]: previous[key].some((item) => item.id === row.id)
        ? previous[key].map((item) => item.id === row.id ? row : item)
        : [...previous[key], row] }))
      setMessage(success)
    }
    locked.current = false
    setBusy(false)
    return result
  }

  return { ...data, busy, error, message, refresh, save }
}
