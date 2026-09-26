async function getJson(path, signal) {
  let response
  try {
    response = await fetch(path, { signal })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new Error('Cannot reach the backend. Check that it is running and try again.', { cause: error })
  }
  const body = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(body?.message || 'Route search is unavailable. Check the backend and try again.')
  }
  if (body === null) throw new Error('The backend returned an invalid response.')
  return body
}

export function searchLocation(query, signal) {
  return getJson(`/api/location/parsed?${new URLSearchParams({ query })}`, signal)
}

export function searchRoutes(origin, destination, signal) {
  const params = new URLSearchParams({
    originLat: origin.latitude,
    originLon: origin.longitude,
    destinationLat: destination.latitude,
    destinationLon: destination.longitude,
    departureTime: new Date().toISOString(),
  })
  return getJson(`/api/route/parsed?${params}`, signal)
}