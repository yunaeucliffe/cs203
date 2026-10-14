export function retainBusArrivalEvidence(route, legIndex, refreshed, previousUpdates = []) {
  const original = busArrivalDetails(route, legIndex).evidence
  const knownStop = original?.details?.busStopCode
  const matchingEvidence = evidence => busArrivalDetails({ ...route,
    evidence: evidence.filter(item => !knownStop || item.details?.busStopCode === knownStop),
  }, legIndex).evidence
  const previous = matchingEvidence(previousUpdates)
  // Reuse the stop/service/leg matching rules before accepting any refresh.
  const matched = refreshed && matchingEvidence([refreshed])
  if (matched?.availability === 'available') return matched
  if (previous?.availability === 'available') return previous
  if (original?.availability === 'available') return original
  return matched || previous || original || null
}

function expectedStopArrival(route, legIndex) {
  // A preceding walk/ride ends at the boarding stop, before any scheduled wait.
  const previous = route.legs?.[legIndex - 1]
  if (previous) {
    const end = Date.parse(previous.endTime)
    if (Number.isFinite(end)) return end
    const start = Date.parse(previous.startTime)
    if (Number.isFinite(start) && Number.isFinite(previous.durationSeconds) && previous.durationSeconds >= 0) {
      return start + previous.durationSeconds * 1000
    }
  }
  // Scheduled boarding includes waiting; it is not an arrival-at-stop estimate.
  return null
}

export function busArrivalDetails(route, legIndex, now = Date.now()) {
  const leg = route.legs?.[legIndex]
  const stopCode = [leg?.from?.code, leg?.from?.id]
    .map(value => value?.split(':').at(-1)).find(value => /^\d{5}$/.test(value || ''))
  const evidence = route.evidence?.find(item => item.source === 'LTA BusArrival' &&
    item.details?.legIndex === legIndex && item.details?.service === leg?.service &&
    (!stopCode || item.details.busStopCode === stopCode))
  const retrieved = Date.parse(evidence?.retrievedAt)
  const stale = evidence?.availability === 'available' &&
    (!Number.isFinite(retrieved) || now - retrieved >= 60000 || retrieved > now + 60000)
  const expectedAtStop = expectedStopArrival(route, legIndex)
  const readyAt = expectedAtStop === null ? now : Math.max(now, expectedAtStop)
  const currentArrivals = evidence?.availability === 'available' && !stale
    ? [...new Set((evidence.details.arrivals || []).map(bus => bus.EstimatedArrival)
      .filter(value => Number.isFinite(Date.parse(value)) && Date.parse(value) >= now))]
      .sort((a, b) => Date.parse(a) - Date.parse(b)) : []
  const arrivals = currentArrivals.filter(value => Date.parse(value) >= readyAt)
  return { evidence, arrivals, stale, expectedAtStop, readyAt,
    noCatchableArrivals: currentArrivals.length > 0 && arrivals.length === 0 }
}
