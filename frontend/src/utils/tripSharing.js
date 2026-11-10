export function estimateArrival(route, startedAt = Date.now()) {
  if (!Number.isFinite(route.durationMinutes) || route.durationMinutes <= 0) {
    throw new Error('The trip duration is unavailable. Please search for a route again.')
  }
  // Sharing starts now; the original itinerary's clock times may no longer match.
  return new Date(startedAt + route.durationMinutes * 60000).toISOString()
}

export function matchesJourney(share, journey) {
  return Boolean(journey && share.origin === journey.origin.trim()
    && share.destination === journey.destination.trim()
    && share.routeSummary === journey.summary.trim())
}

export function freshJourneyLocation(location, now = Date.now()) {
  return Boolean(location && Number.isFinite(location.latitude) && Number.isFinite(location.longitude)
    && Number.isFinite(location.timestamp) && now - location.timestamp <= 30000
    && location.timestamp <= now)
}

export function isSharingJourney(share, journey, allowed) {
  return Boolean(share.liveLocation && matchesJourney(share, journey) && allowed[share.id] === journey.id)
}

const MODE_LABELS = { WALK: 'Walk', BUS: 'Bus', SUBWAY: 'MRT', RAIL: 'Train', TRAM: 'Train' }

// "WALK → BUS 10 → SUBWAY EW" becomes "Walk → Bus 10 → MRT EW" for travellers and family members.
export function formatRouteSummary(summary) {
  return summary.split(' → ').map(part => {
    const [mode, ...rest] = part.split(' ')
    return [MODE_LABELS[mode] ?? mode, ...rest].join(' ')
  }).join(' → ')
}

export function updatedAgo(updatedAt, now = Date.now()) {
  const minutes = Math.floor((now - new Date(updatedAt).getTime()) / 60000)
  if (minutes < 1) return 'less than a minute ago'
  return `${minutes} minute${minutes === 1 ? '' : 's'} ago`
}

// Family members follow the planned route, not just a moving dot, so the drawn route travels
// with the share. Only coordinate pairs inside Singapore's possible range are kept, and a path
// needs two points to be a line.
export function routeLines(routePath) {
  return (Array.isArray(routePath) ? routePath : [])
    .map(path => (Array.isArray(path) ? path : []).filter(point => Array.isArray(point) && point.length === 2
      && Number.isFinite(point[0]) && Number.isFinite(point[1])
      && Math.abs(point[0]) <= 90 && Math.abs(point[1]) <= 180)
      .map(([latitude, longitude]) => [latitude, longitude]))
    .filter(path => path.length > 1)
}

// Every recipient downloads the route on each poll, so thin long routes to a size the server
// accepts and a phone can reload. Each path keeps its first and last point, so the drawn line
// still starts and ends where the leg does.
const MAX_SHARED_POINTS = 1500

export function shareableRoutePath(routePath) {
  const paths = routeLines(routePath)
  const total = paths.reduce((count, path) => count + path.length, 0)
  if (total <= MAX_SHARED_POINTS) return paths
  const step = Math.ceil(total / MAX_SHARED_POINTS)
  return paths.map(path => path.filter((_, index) => index % step === 0 || index === path.length - 1))
}
