import { useEffect, useMemo, useState } from 'react'
import { busArrivalDetails, retainBusArrivalEvidence } from '../utils/busArrivals.js'
import { fetchBusArrivals } from '../api/routes.js'

// refreshKey lets a caller ask for the live data again at once instead of waiting for the next
// poll; the demo simulation uses it when its scripted answers change.
export function useBusArrivals(route, enabled = true, refreshKey = 0) {
  const [now, setNow] = useState(Date.now)
  const [updates, setUpdates] = useState([])
  const [failed, setFailed] = useState([])
  useEffect(() => {
    if (!enabled) return
    let stopped = false
    let timer
    let controller
    let refreshing = false
    const targets = (route.legs || []).flatMap((leg, index) => {
      if (leg.mode !== 'BUS' || !leg.service) return []
      const matched = busArrivalDetails(route, index).evidence
      const code = matched?.details?.busStopCode || [leg.from?.code, leg.from?.id]
        .map(value => value?.split(':').at(-1)).find(value => /^\d{5}$/.test(value || ''))
      return code ? [{ index, code, service: leg.service }] : []
    })
    if (!targets.length) return
    const refresh = async () => {
      // A refresh already in progress is fetching fresh data and schedules the next one.
      if (stopped || refreshing) return
      clearTimeout(timer)
      refreshing = true
      try {
        if (!document.hidden) {
          controller = new AbortController()
          const results = await Promise.all(targets.map(async ({ index, code, service }) => {
            try {
              const evidence = await fetchBusArrivals(code, service, controller.signal)
              if (evidence.source !== 'LTA BusArrival' || evidence.details?.busStopCode !== code ||
                  evidence.details?.service !== service) throw new Error('Mismatched arrival data')
              return { ...evidence, details: { ...evidence.details, legIndex: index } }
            } catch {
              return null
            }
          }))
          if (!stopped) {
            setFailed(targets.filter((target, index) => !results[index] ||
              results[index].availability !== 'available').map(target => target.index))
            setUpdates(previous => targets.map(({ index }, targetIndex) =>
              retainBusArrivalEvidence(route, index, results[targetIndex], previous))
              .filter(Boolean))
            setNow(Date.now())
          }
        }
      } finally {
        refreshing = false
        if (!stopped) timer = setTimeout(refresh, 20000)
      }
    }
    const onVisibilityChange = () => {
      if (!document.hidden) {
        setNow(Date.now())
        void refresh()
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    refresh()
    return () => {
      stopped = true
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      controller?.abort()
    }
  }, [route, enabled, refreshKey])
  useEffect(() => {
    if (!enabled) return
    const timer = setInterval(() => setNow(Date.now()), 10000)
    return () => clearInterval(timer)
  }, [enabled])
  const current = useMemo(() => ({ ...route, evidence: [...updates, ...(route.evidence || [])] }), [route, updates])
  return { now, failed, route: current }
}
