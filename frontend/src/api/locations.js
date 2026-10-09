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

export async function lookupPostalCode(code, signal) {
  const postal = code.trim()
  if (!/^[0-9]{6}$/.test(postal)) throw new Error('Enter a 6-digit postal code.')
  const places = await getLocations(postal, signal,
    'Address lookup is unavailable. Try again or enter the address yourself.')
  return places.filter(place => place.postalCode === postal)
}

async function getLocations(query, signal, errorMessage) {
  let response
  try {
    response = await fetch(`${API_URL}/api/location/search?${new URLSearchParams({ query })}`, {
      signal,
      credentials: 'include',
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new Error(errorMessage, { cause: error })
  }
  const body = await response.json().catch(() => null)
  if (!response.ok || body?.error || !Array.isArray(body?.results)) throw new Error(errorMessage)

  const places = []
  const seen = new Set()
  for (const result of body.results) {
    const address = typeof result?.ADDRESS === 'string' ? result.ADDRESS.trim() : ''
    const building = typeof result?.BUILDING === 'string' ? result.BUILDING.trim() : ''
    const latitude = Number(result?.LATITUDE)
    const longitude = Number(result?.LONGITUDE)
    if (!address || result?.LATITUDE == null || result?.LONGITUDE == null ||
      String(result.LATITUDE).trim() === '' || String(result.LONGITUDE).trim() === '' ||
      !Number.isFinite(latitude) || !Number.isFinite(longitude) ||
      Math.abs(latitude) > 90 || Math.abs(longitude) > 180) continue

    const key = `${address.toLowerCase()}:${latitude}:${longitude}`
    if (seen.has(key)) continue
    seen.add(key)
    places.push({
      name: building && !['nil', 'null'].includes(building.toLowerCase()) ? building : address,
      address,
      postalCode: String(result.POSTAL ?? '').trim(),
      latitude,
      longitude,
    })
  }
  if (body.results.length && !places.length) throw new Error(errorMessage)
  return places
}
