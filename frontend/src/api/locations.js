import { API_URL } from '../api.js'

export async function searchSuggestions(query, signal) {
  const message = 'Location suggestions are unavailable. Try again.'
  let response
  try {
    response = await fetch(`${API_URL}/api/location/suggestions?${new URLSearchParams({ query: query.trim() })}`, {
      signal,
      credentials: 'include',
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new Error(message, { cause: error })
  }
  const places = await response.json().catch(() => null)
  if (!response.ok || !Array.isArray(places) || places.some(place =>
    !place || typeof place.name !== 'string' || typeof place.address !== 'string' ||
    !Number.isFinite(place.latitude) || !Number.isFinite(place.longitude) ||
    Math.abs(place.latitude) > 90 || Math.abs(place.longitude) > 180)) {
    throw new Error(message)
  }
  return places.slice(0, 5)
}
