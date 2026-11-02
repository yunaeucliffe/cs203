import { busArrivalDetails } from './busArrivals.js'

export const clockTime = value => new Date(value).toLocaleTimeString('en-SG', {
  timeZone: 'Asia/Singapore', hour: 'numeric', minute: '2-digit',
})

// Project the GPS fix onto each leg's path. Distances are local metres; this is
// sufficient for a Singapore itinerary and avoids an extra routing request.
export function locateOnRoute(route, location, minimumLeg = 0) {
  if (!location || location.accuracy > 100) return null
  const scale = Math.cos(location.latitude * Math.PI / 180)
  const point = ([lat, lon]) => [(lon - location.longitude) * 111320 * scale,
    (lat - location.latitude) * 111320]
  let best = null
  for (let index = minimumLeg; index < (route.legs || []).length; index++) {
    const leg = route.legs[index]
    const path = leg.path?.length > 1 ? leg.path : [leg.from, leg.to]
      .filter(stop => Number.isFinite(stop?.latitude) && Number.isFinite(stop?.longitude))
      .map(stop => [stop.latitude, stop.longitude])
    const segments = []
    let total = 0
    for (let j = 1; j < path.length; j++) {
      const a = point(path[j - 1]), b = point(path[j])
      const dx = b[0] - a[0], dy = b[1] - a[1]
      const length = Math.hypot(dx, dy)
      if (!length) continue
      const fraction = Math.max(0, Math.min(1, -(a[0] * dx + a[1] * dy) / length ** 2))
      segments.push({ distance: Math.hypot(a[0] + fraction * dx, a[1] + fraction * dy),
        along: total + fraction * length })
      total += length
    }
    for (const segment of segments) {
      // Prefer the earlier leg at shared stops and overlapping paths.
      if (!best || segment.distance + 10 < best.distance) {
        best = { index, fraction: segment.along / total, distance: segment.distance }
      }
    }
  }
  return best && best.distance <= Math.max(60, location.accuracy || 0) ? best : null
}

// One inaccurate fix shouldn't skip journey steps (e.g. where a later leg runs close to an
// earlier one), so only move to a later leg once two fixes in a row agree on it.
// fixAt is the GPS timestamp: recalculating for the clock or bus data reuses the same fix,
// which must not count as its own confirmation.
export function confirmProgress(state, matched, fixAt) {
  const { progress, pendingLeg } = state
  if (fixAt === state.fixAt) return state
  if (matched && matched.index > (progress?.index ?? 0) && pendingLeg !== matched.index) {
    return { progress, pendingLeg: matched.index, fixAt }
  }
  return { progress: matched || progress, pendingLeg: null, fixAt }
}

// Planned wait between the previous leg ending and this one starting (0 if unknown).
const plannedWait = (legs, index) =>
  Math.max(0, Date.parse(legs[index]?.startTime) - Date.parse(legs[index - 1]?.endTime)) || 0

// Live arrivals for a bus leg from time `from` onwards (when the traveller can be at the stop).
function liveBus(route, index, now, from) {
  const { evidence, stale } = busArrivalDetails(route, index, now)
  const arrivals = evidence?.availability === 'available' ? [...new Set((evidence.details.arrivals || [])
    .map(bus => Date.parse(bus.EstimatedArrival)).filter(time => Number.isFinite(time) && time >= from))]
    .sort((a, b) => a - b) : []
  return { at: arrivals[0], arrivals, stale, retrievedAt: evidence?.retrievedAt }
}

// Without a usable position we can't tell where the traveller is, so show the planned journey
// from when navigation started. Live bus times are listed for information only.
function plannedTiming(route, now, startedAt) {
  const legs = route.legs || []
  const buses = {}
  const stepMinutes = {}
  const stepTimes = {}
  let time = startedAt
  for (let index = 0; index < legs.length && Number.isFinite(legs[index].durationSeconds); index++) {
    const leg = legs[index]
    if (leg.mode === 'BUS') buses[index] = liveBus(route, index, now, Math.max(now, time))
    time += plannedWait(legs, index)
    stepMinutes[index] = Math.ceil(leg.durationSeconds / 60)
    stepTimes[index] = { departure: time, arrival: time + leg.durationSeconds * 1000 }
    time = stepTimes[index].arrival
  }
  const arrival = Number.isFinite(route.durationMinutes) ? startedAt + route.durationMinutes * 60000 : time
  return { minutes: Math.max(0, Math.ceil((arrival - now) / 60000)), arrival, buses, stepMinutes,
    stepTimes, outdated: Object.values(buses).some(bus => bus.stale) }
}

export function navigationTiming(route, progress, now, startedAt) {
  if (!progress) return plannedTiming(route, now, startedAt)
  const legs = route.legs || []
  const first = progress.index
  let arrival = now
  let outdated = false
  const buses = {}
  const stepMinutes = {}
  const stepTimes = {}
  for (let index = first; index < legs.length; index++) {
    const leg = legs[index]
    const fraction = index === first ? progress.fraction : 0
    // A partly completed bus leg means the traveller is already on board.
    if (leg.mode === 'BUS' && fraction <= 0.001) {
      const bus = liveBus(route, index, now, arrival)
      // Only expired data is outdated. No catchable bus listed yet is normal: LTA lists
      // only the next few buses, so fall back to the planned wait.
      outdated ||= bus.stale
      buses[index] = bus
      arrival = Number.isFinite(bus.at) ? bus.at : arrival + plannedWait(legs, index)
    } else if (index > first) {
      arrival += plannedWait(legs, index)
    }
    if (!Number.isFinite(leg.durationSeconds)) {
      return { minutes: route.durationMinutes, arrival: startedAt + route.durationMinutes * 60000,
        buses, stepMinutes, stepTimes, outdated: true }
    }
    const duration = leg.durationSeconds * (1 - fraction)
    stepMinutes[index] = Math.ceil(duration / 60)
    stepTimes[index] = { departure: arrival, arrival: arrival + duration * 1000 }
    arrival += duration * 1000
  }
  return { minutes: Math.max(0, Math.ceil((arrival - now) / 60000)), arrival,
    buses, stepMinutes, stepTimes, outdated }
}
