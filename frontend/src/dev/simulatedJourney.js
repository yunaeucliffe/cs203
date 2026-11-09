// Turns a route from the normal route engine into a timeline the demo can play back:
// where the traveller is after N seconds of the planned journey. Nothing here reads the
// clock, so it can be tested directly.

const METRES_PER_DEGREE = 111320

// A leg with no decoded geometry still has its stops, which is enough to walk a straight line.
export function legPath(leg) {
  const path = (leg?.path || []).filter(point =>
    Number.isFinite(point?.[0]) && Number.isFinite(point?.[1]))
  if (path.length > 1) return path.map(point => [point[0], point[1]])
  return [leg?.from, leg?.to]
    .filter(stop => Number.isFinite(stop?.latitude) && Number.isFinite(stop?.longitude))
    .map(stop => [stop.latitude, stop.longitude])
}

// Local metres, as in locateOnRoute: good enough for a Singapore itinerary.
function metres(a, b) {
  const scale = Math.cos((a[0] + b[0]) / 2 * Math.PI / 180)
  return Math.hypot((b[1] - a[1]) * METRES_PER_DEGREE * scale, (b[0] - a[0]) * METRES_PER_DEGREE)
}

// Same rule the live bus polling uses, so a scripted stop matches a real request.
export function boardingStopCode(leg) {
  return [leg?.from?.code, leg?.from?.id]
    .map(value => value?.split(':').at(-1))
    .find(value => /^\d{5}$/.test(value || '')) || null
}

// A bus leg needs a visible wait at the stop, otherwise there is nothing to miss a bus with.
export const MIN_BUS_WAIT_SECONDS = 120
const MAX_WAIT_SECONDS = 300
// A leg the engine gave no duration for still has to take some time to walk through.
const FALLBACK_LEG_SECONDS = 300

export function legWaitSeconds(legs, index) {
  if (index === 0) return 0
  const planned = Date.parse(legs[index]?.startTime) - Date.parse(legs[index - 1]?.endTime)
  const wait = Number.isFinite(planned) ? Math.max(0, planned) / 1000 : 0
  const minimum = legs[index]?.mode === 'BUS' ? MIN_BUS_WAIT_SECONDS : 0
  return Math.min(MAX_WAIT_SECONDS, Math.max(minimum, wait))
}

function measured(path) {
  const points = [{ point: path[0], along: 0 }]
  let total = 0
  for (let index = 1; index < path.length; index++) {
    total += metres(path[index - 1], path[index])
    points.push({ point: path[index], along: total })
  }
  return { points, total }
}

// Segments in planned-journey seconds: 'wait' holds position at a stop, 'travel' moves along
// the leg's own geometry at a constant pace.
export function buildTimeline(route) {
  const legs = route?.legs || []
  const segments = []
  const stops = []
  let seconds = 0
  for (let index = 0; index < legs.length; index++) {
    const leg = legs[index]
    const path = legPath(leg)
    if (path.length === 0) continue
    const wait = legWaitSeconds(legs, index)
    const reachedAt = seconds
    if (wait > 0) {
      segments.push({ kind: 'wait', legIndex: index, from: seconds, to: seconds + wait, at: path[0] })
      seconds += wait
    }
    const duration = Number.isFinite(leg.durationSeconds) && leg.durationSeconds > 0
      ? leg.durationSeconds : FALLBACK_LEG_SECONDS
    const { points, total } = measured(path)
    segments.push({ kind: 'travel', legIndex: index, from: seconds, to: seconds + duration, points, total })
    seconds += duration
    if (leg.mode === 'BUS') {
      stops.push({ legIndex: index, reachedAt, departsAt: reachedAt + wait, service: leg.service || null,
        code: boardingStopCode(leg), name: leg.from?.name || null })
    }
  }
  return { segments, stops, totalSeconds: seconds, legCount: legs.length }
}

export const canSimulate = timeline => timeline.segments.length > 0

function along(points, total, distance) {
  if (total <= 0) return points[0].point
  for (let index = 1; index < points.length; index++) {
    const previous = points[index - 1]
    const current = points[index]
    if (distance > current.along && index < points.length - 1) continue
    const span = current.along - previous.along
    const fraction = span > 0 ? Math.max(0, Math.min(1, (distance - previous.along) / span)) : 0
    return [previous.point[0] + (current.point[0] - previous.point[0]) * fraction,
      previous.point[1] + (current.point[1] - previous.point[1]) * fraction]
  }
  return points.at(-1).point
}

// Where the traveller is after `seconds` of the planned journey. The accuracy is tight so the
// position is accepted as being on the route, exactly as a good GPS fix would be.
export const SIMULATED_ACCURACY_METRES = 8

export function positionAt(timeline, seconds) {
  const { segments, totalSeconds } = timeline
  if (!segments.length) return null
  const clamped = Math.max(0, Math.min(totalSeconds, seconds))
  const segment = segments.find(candidate => clamped < candidate.to) || segments.at(-1)
  const point = segment.kind === 'wait' ? segment.at
    : along(segment.points, segment.total,
      segment.total * Math.max(0, Math.min(1, (clamped - segment.from) / (segment.to - segment.from))))
  return { latitude: point[0], longitude: point[1], accuracy: SIMULATED_ACCURACY_METRES,
    legIndex: segment.legIndex, waiting: segment.kind === 'wait' }
}

// The next bus stop the traveller has not left yet; what "jump to the bus stop" aims at.
export function nextStop(timeline, seconds) {
  return timeline.stops.find(stop => seconds < stop.departsAt) || null
}

export function stopFor(timeline, code, service) {
  return timeline.stops.find(stop => stop.code === code && stop.service === service) || null
}
