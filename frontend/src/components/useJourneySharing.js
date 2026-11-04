import { useContext, useEffect } from 'react'
import { TripSharingContext } from './TripSharingContext'

export function useJourneySharing({ id, route, origin, destination, location }) {
  const { setJourney } = useContext(TripSharingContext)
  const from = origin?.name || route.legs?.[0]?.from?.name || ''
  const to = destination?.name || route.legs?.at(-1)?.to?.name || ''
  const summary = route.summary || ''
  useEffect(() => {
    setJourney(id ? { id, origin: from, destination: to, summary, location } : null)
  }, [setJourney, id, from, to, summary, location])
  useEffect(() => () => setJourney(null), [setJourney])
}
