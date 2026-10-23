import { API_URL, getCsrfToken } from '../api'

export async function shareRequest(path = '', method = 'GET', body) {
  // One 10-second limit for the whole request, CSRF token included, so nothing can hang
  // and a slow upload can't store an old location as fresh.
  const signal = AbortSignal.timeout(10000)
  let response
  try {
    const headers = {}
    if (method !== 'GET') headers['X-XSRF-TOKEN'] = await getCsrfToken(signal)
    if (body) headers['Content-Type'] = 'application/json'
    response = await fetch(`${API_URL}/api/users/me/trip-shares${path}`, {
      method, headers, credentials: 'include', cache: 'no-store', signal,
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new Error('Unable to reach SilverRoute. Check your connection.')
  }
  if (!response.ok) {
    const error = new Error(response.status === 401
      ? 'Please sign in to manage trip sharing.' : 'Unable to update sharing. Please try again.')
    error.status = response.status
    throw error
  }
  return response.status === 204 ? null : response.json()
}
export const shareUrl = token => `${window.location.origin}/#share/${token}`
export function requestLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Location is unavailable. You can still share trip details.'))
    navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 })
  })
}
