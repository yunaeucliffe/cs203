import { API_URL, getCsrfToken } from '../api.js'

async function getJson(path, signal, options = {}) {
  let response
  try {
    response = await fetch(`${API_URL}${path}`, { ...options, signal, credentials: 'include' })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new Error('Cannot reach the backend. Check that it is running and try again.', { cause: error })
  }
  const body = await response.json().catch(() => null)
  if (response.status === 401) throw new Error('Your session has expired. Sign in again to get personalized routes.')
  if (response.status === 403) throw new Error('Your session could not be verified. Refresh the page and sign in again.')
  if (!response.ok) throw new Error(body?.message || 'Route recommendations are unavailable. Please try again.')
  if (body === null) throw new Error('The backend returned an invalid response.')
  return body
}

export function searchLocation(query, signal) {
  return getJson(`/api/location/parsed?${new URLSearchParams({ query })}`, signal)
}

export async function searchLocationCandidates(query, signal) {
  const locations = await getJson(`/api/location/candidates?${new URLSearchParams({ query })}`, signal)
  if (!Array.isArray(locations) || locations.length === 0 || locations.some(location =>
    !location || typeof location.name !== 'string' || !location.name.trim() ||
    !Number.isFinite(location.latitude) || !Number.isFinite(location.longitude) ||
    Math.abs(location.latitude) > 90 || Math.abs(location.longitude) > 180)) {
    throw new Error('No valid address matches were returned. Try a postal code or building and street name.')
  }
  return locations
}

export async function searchRoutes(origin, destination, signal) {
  const token = await getCsrfToken(signal)
  const result = await getJson('/api/route-recommendations', signal, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-XSRF-TOKEN': token },
    body: JSON.stringify({
      origin: origin.name,
      destination: destination.name,
      originCoordinates: coordinates(origin),
      destinationCoordinates: coordinates(destination),
      departureTime: new Date().toISOString(),
    }),
  })
  if (!result.recommendedRoute || !Array.isArray(result.alternatives)) {
    throw new Error('The backend returned an invalid recommendation.')
  }
  const routes = [result.recommendedRoute, ...result.alternatives]
  if (routes.length > 3 || routes.some(route => !route || typeof route.id !== 'string') ||
      new Set(routes.map(route => route.id)).size !== routes.length) {
    throw new Error('The backend returned invalid ranked routes.')
  }
  return { ...result, routes }
}

function coordinates(location) {
  if (!Number.isFinite(location.latitude) || !Number.isFinite(location.longitude)) return undefined
  return { latitude: location.latitude, longitude: location.longitude }
}
