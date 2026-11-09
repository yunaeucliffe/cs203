// Live bus times during a demo are whatever LTA happens to be publishing: there may be no bus
// for twenty minutes, or none at all at night, and nothing will ever be missed on cue. These
// scripted arrivals stand in for the provider's answer so the countdown and the "can't reach
// that one" skip happen on demand.
//
// Every time here is a real wall-clock time, so countdowns, "Last updated" and the staleness
// rules behave exactly as they do against the live provider.

// How long the traveller stands at the stop before the scripted bus pulls in.
export const BOARDING_GRACE_SECONDS = 60
export const HEADWAY_SECONDS = 240
// How far short of "the earliest the traveller could be at the stop" a missed bus arrives.
export const MISS_MARGIN_SECONDS = 30
// The bus after a missed one has to be comfortably reachable, whatever the playback speed.
const CATCHABLE_MARGIN_SECONDS = 45
const BUSES = 3

// planSecondsToStop is how much of the planned journey is left before the traveller reaches the
// stop, which is also what the app uses to decide which buses are still catchable; speed is the
// playback rate, so the dot reaches the stop that much sooner in real time.
export function scriptedSchedule({ now, planSecondsToStop, speed = 1, missFirst = false }) {
  const remaining = Math.max(0, planSecondsToStop)
  const scaled = seconds => seconds / speed * 1000
  // The app will not count a bus the traveller cannot reach, so this is the cut-off.
  const reachable = now + remaining * 1000
  if (!missFirst) {
    const first = now + scaled(remaining + BOARDING_GRACE_SECONDS)
    return Array.from({ length: BUSES }, (unused, index) =>
      Math.round(first + scaled(index * HEADWAY_SECONDS)))
  }
  // A live estimate moving earlier is how a bus becomes unreachable in real use; the app then
  // counts down to the one after it.
  const missed = reachable - MISS_MARGIN_SECONDS * 1000
  const second = Math.max(missed + scaled(HEADWAY_SECONDS),
    reachable + CATCHABLE_MARGIN_SECONDS * 1000)
  return [missed, second, second + scaled(HEADWAY_SECONDS)].map(Math.round)
}

// Shaped like the backend's LTA BusArrival evidence, including the fields the frontend checks
// before it accepts a refresh.
export function scriptedEvidence({ busStopCode, service, arrivals, retrievedAt }) {
  return {
    source: 'LTA BusArrival',
    observedAt: new Date(retrievedAt).toISOString(),
    retrievedAt: new Date(retrievedAt).toISOString(),
    availability: 'available',
    details: {
      busStopCode,
      service,
      arrivals: arrivals.map(at => ({
        EstimatedArrival: new Date(at).toISOString(),
        Load: 'SEA',
        Feature: 'WAB',
        Type: 'SD',
      })),
      note: 'Simulated arrivals from the demo tool, not live LTA data.',
    },
  }
}
