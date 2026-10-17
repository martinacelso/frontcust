// Use the Vite /api proxy so browser requests and cookies stay on one origin.
export async function authRequest(endpoint, body) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15000)
  try {
    const options = { credentials: 'same-origin', signal: controller.signal }
    if (body !== undefined) {
      // Fetch a fresh token to handle login/session rotation and other tabs.
      const tokenResponse = await fetch('/api/auth/csrf', options)
      if (!tokenResponse.ok) return { error: 'Unable to start a secure session. Please try again.', status: tokenResponse.status }
      const token = await tokenResponse.json()
      if (!token.csrfToken) return { error: 'Invalid server response. Check the API proxy.' }
      options.method = 'POST'
      options.headers = { 'Content-Type': 'application/json', 'X-CSRF-Token': token.csrfToken }
      options.body = JSON.stringify(body)
    }
    const response = await fetch('/api/auth' + endpoint, options)
    const result = await response.json()
    if (!response.ok) return { error: result.error || 'The request could not be completed.', status: response.status }
    return { ...result, ok: true, status: response.status }
  } catch {
    return { error: 'Unable to reach the backend. Check that it is running, then try again.' }
  } finally {
    clearTimeout(timer)
  }
}
