import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react'
import { buildTimeline, canSimulate } from './simulatedJourney.js'
import {
  getSimulation,
  jumpToBusStop,
  missNextBus,
  nextBusStop,
  restart,
  seekTo,
  setLiveDataOn,
  setLocationOn,
  setPlaying,
  setScriptedBuses,
  setSpeed,
  simulatedLocation,
  simulatedPosition,
  simulationAvailable,
  startSimulation,
  stopSimulation,
  subscribeToSimulation,
} from './simulationStore.js'

// Drives the demo journey simulation for one route. Inert unless demo mode is switched on
// (see demoMode.js), so the real app behaves exactly as before.
export function useJourneySimulation(route) {
  const state = useSyncExternalStore(subscribeToSimulation, getSimulation)
  const timeline = useMemo(() => buildTimeline(route), [route])

  // Recomputed per tick rather than per render, so one simulated fix is one fix.
  const location = useMemo(() => simulatedLocation(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.active, state.progressSeconds, state.locationOn, state.resetKey, state.fixNonce])

  const position = useMemo(() => simulatedPosition(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.active, state.progressSeconds])

  const stopAhead = useMemo(() => nextBusStop(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.active, state.progressSeconds])

  // Leaving the journey view ends the simulation with it.
  useEffect(() => stopSimulation, [])

  const start = useCallback(() => startSimulation(timeline), [timeline])

  return {
    ...state,
    available: simulationAvailable(),
    ready: canSimulate(timeline),
    location,
    position,
    nextStop: stopAhead,
    start,
    stop: stopSimulation,
    setPlaying,
    setSpeed,
    seekTo,
    restart,
    jumpToBusStop,
    missNextBus,
    setLocationOn,
    setLiveDataOn,
    setScriptedBuses,
  }
}
