import { useContext, useEffect } from 'react'
import { TripSharingContext } from './TripSharingContext'

// The journey stays shared after Navigation closes (e.g. Back to check route details);
// Routes ends it with endJourney, and uploads then ask the phone for a position directly.
export function useJourneySharing({ id, route, origin, destination, location }) {
  const { setJourney } = useContext(TripSharingContext)
  const from = origin?.name || route.legs?.[0]?.from?.name || ''
  const to = destination?.name || route.legs?.at(-1)?.to?.name || ''
  const summary = route.summary || ''
  useEffect(() => {
    setJourney(id ? { id, origin: from, destination: to, summary, location } : null)
  }, [setJourney, id, from, to, summary, location])
}
