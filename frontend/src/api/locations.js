import { API_URL } from '../api.js'

export async function searchSuggestions(query, signal) {
  return getLocations(`/api/location/suggestions?${new URLSearchParams({ query: query.trim() })}`, signal,
    'Location suggestions are unavailable. Try again.')
}

export async function lookupPostalCode(code, signal) {
  const postal = code.trim()
  if (!/^[0-9]{6}$/.test(postal)) throw new Error('Enter a 6-digit postal code.')
  const places = await getLocations(`/api/location/postal-code?${new URLSearchParams({ code: postal })}`, signal,
    'Address lookup is unavailable. Try again or enter the address yourself.')
  if (places.some(place => place.postalCode !== postal)) throw new Error('The address does not match this postal code. Try again.')
  return places
}

async function getLocations(path, signal, errorMessage) {
  let response
  try {
    response = await fetch(`${API_URL}${path}`, {
      signal,
      credentials: 'include',
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new Error(errorMessage, { cause: error })
  }
  const body = await response.json().catch(() => null)
  if (!response.ok || !Array.isArray(body)) throw new Error(errorMessage)
  if (body.some(place => !place || typeof place.name !== 'string' || typeof place.address !== 'string' ||
    !Number.isFinite(place.latitude) || !Number.isFinite(place.longitude) ||
    Math.abs(place.latitude) > 90 || Math.abs(place.longitude) > 180)) {
    throw new Error(errorMessage)
  }
  return body
}
