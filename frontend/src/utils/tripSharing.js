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
