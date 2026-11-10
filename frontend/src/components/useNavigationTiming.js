import { useEffect, useRef, useState } from 'react'
import { useBusArrivals } from './useBusArrivals.js'
import { confirmProgress, locateOnRoute, navigationTiming } from '../utils/navigationTiming.js'

// startedAt comes from the caller so leaving and continuing navigation keeps the same trip start.
// busRefreshKey asks for live bus data again at once; resetKey forgets the journey progress
// tracked so far, which a demo simulation needs when its position jumps (progress only ever
// moves forwards through the steps).
export function useNavigationTiming(route, location, startedAt, { busRefreshKey = 0, resetKey = 0 } = {}) {
  const { route: current, now, failed } = useBusArrivals(route, true, busRefreshKey)
  const tracking = useRef({ progress: null, pendingLeg: null })
  const [timing, setTiming] = useState(() => ({
    ...navigationTiming(route, null, startedAt, startedAt),
    updatedAt: startedAt, located: false, now: startedAt,
  }))

  // Declared first so the reset lands before the recalculation below reads it.
  useEffect(() => {
    tracking.current = { progress: null, pendingLeg: null }
  }, [resetKey])

  useEffect(() => {
    // Schedule the calculation so a new GPS fix or provider response updates the
    // display immediately, while the polling hook also supplies a regular clock.
    const timer = setTimeout(() => {
      const found = locateOnRoute(route, location, tracking.current.progress?.index || 0)
      tracking.current = confirmProgress(tracking.current, found, location?.timestamp)
      // While a jump to a later leg is unconfirmed, keep using the last confirmed position.
      const matched = found && tracking.current.progress
      // A failed refresh keeps the last good bus data (see useBusArrivals), so always
      // recalculating keeps the last known times while still following the user's position.
      const next = navigationTiming(current, matched, now, startedAt)
      const retrieved = Object.values(next.buses).map(bus => Date.parse(bus.retrievedAt))
        .filter(Number.isFinite)
      setTiming({ ...next, now, outdated: next.outdated || failed.some(index => next.buses[index]),
        located: Boolean(matched), updatedAt: retrieved.length ? Math.min(...retrieved) :
          matched ? location.timestamp : startedAt })
    }, 0)
    return () => clearTimeout(timer)
  }, [route, current, location, now, failed, startedAt, resetKey])

  return timing
}
