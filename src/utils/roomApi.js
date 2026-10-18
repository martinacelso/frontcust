// Uses the existing Vite /api proxy and the signed-in session cookie.
export async function roomRequest(endpoint = '', method = 'GET', body) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15000)
  try {
    const options = { credentials: 'same-origin', signal: controller.signal, method }
    if (method !== 'GET') {
      const csrf = await fetch('/api/auth/csrf', { credentials: 'same-origin', signal: controller.signal })
      if (!csrf.ok) return { error: 'Unable to verify your session. Sign in again.', status: csrf.status }
      const token = await csrf.json()
      if (!token.csrfToken) return { error: 'Unable to verify your session. Refresh and try again.' }
      options.headers = { 'Content-Type': 'application/json', 'X-CSRF-Token': token.csrfToken }
      options.body = JSON.stringify(body)
    }
    const response = await fetch('/api/rooms' + endpoint, options)
    const result = await response.json()
    if (!response.ok) return { error: result.error || 'Unable to complete the request.', status: response.status }
    return { ...result, ok: true }
  } catch {
    return { error: method === 'GET'
      ? 'Unable to load rooms. Check that the backend is running.'
      : 'The save could not be confirmed. Refresh and check the record before trying again.' }
  } finally {
    clearTimeout(timer)
  }
}
