// VITE_API_URL is unset in local dev (falls back to the backend's local port).
// In production it is set to "/" so requests stay on the frontend's own
// origin and are routed to the backend by Vercel; the trailing slash is
// stripped so "${API_URL}/api/..." doesn't become "//api/...".
// import.meta.env only exists under Vite; "?." lets `npm test` (plain Node) load this file too.
export const API_URL = (import.meta.env?.VITE_API_URL ?? 'http://localhost:8081').replace(/\/+$/, '')

export const CONNECTION_ERROR = "Can't connect to SilverRoute. Check your internet connection and try again."

export async function getCsrfToken(signal) {
  let response
  try {
    response = await fetch(`${API_URL}/api/auth/csrf`, {
      credentials: 'include',
      signal,
    })
  } catch (error) {
    // Let cancelled requests through; otherwise show a message instead of "Failed to fetch".
    if (error.name === 'AbortError' || error.name === 'TimeoutError') throw error
    throw new Error(CONNECTION_ERROR, { cause: error })
  }
  if (!response.ok) {
    throw new Error('Unable to prepare the request. Please try again.')
  }
  return (await response.json()).token
}
