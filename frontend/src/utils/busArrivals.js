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
  const arrivals = evidence?.availability === 'available' && !stale
    ? [...new Set((evidence.details.arrivals || []).map(bus => bus.EstimatedArrival)
      .filter(value => Number.isFinite(Date.parse(value)) && Date.parse(value) >= now))]
      .sort((a, b) => Date.parse(a) - Date.parse(b)) : []
  return { evidence, arrivals, stale }
}
