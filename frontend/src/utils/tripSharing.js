export function estimateArrival(route, startedAt = Date.now()) {
  if (!Number.isFinite(route.durationMinutes) || route.durationMinutes <= 0) {
    throw new Error('The trip duration is unavailable. Please search for a route again.')
  }
  // Sharing starts now; the original itinerary's clock times may no longer match.
  return new Date(startedAt + route.durationMinutes * 60000).toISOString()
}

const MODE_LABELS = { WALK: 'Walk', BUS: 'Bus', SUBWAY: 'Train', RAIL: 'Train', TRAM: 'Train' }

// "WALK → BUS 10 → SUBWAY EW" becomes "Walk → Bus 10 → Train EW" for family members.
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
