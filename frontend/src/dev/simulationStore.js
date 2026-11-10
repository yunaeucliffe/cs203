// State for the demo journey simulation. It lives outside React because the fake live-data
// answers are needed by the API layer (see api/routes.js), which is not a component.
//
// The wall clock is never touched: playback moves the traveller along the planned journey
// faster or slower, while Date.now() stays the real time everywhere in the app.
import { DEMO_MODE } from './demoMode.js'
import { canSimulate, nextStop, positionAt, stopFor } from './simulatedJourney.js'
import { scriptedEvidence, scriptedSchedule } from './scriptedBuses.js'

export const SPEEDS = [0.5, 1, 2, 4, 8]

const IDLE = {
  active: false,
  playing: false,
  speed: 1,
  progressSeconds: 0,
  totalSeconds: 0,
  // "Turn location off" and "make live data fail" are the two failure demos.
  locationOn: true,
  liveDataOn: true,
  scriptedBuses: true,
  // Bumped when the live answers change, so the polling hook asks again straight away.
  busRefreshKey: 0,
  // Bumped when the position jumps, so journey progress is tracked from scratch.
  resetKey: 0,
  // Bumped to emit another fix at the same position (see nudgeFix).
  fixNonce: 0,
}

let state = IDLE
let timeline = null
// Kept out of the snapshot: generating a schedule must not cause a re-render.
let schedules = new Map()
let anchor = null
let ticker = null

const listeners = new Set()

export const simulationAvailable = () => DEMO_MODE

export function subscribeToSimulation(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export const getSimulation = () => state
export const getTimeline = () => timeline

function set(patch) {
  state = { ...state, ...patch }
  listeners.forEach(listener => listener())
}

const TICK_MS = 500

// Moving to a later step needs two fixes that agree on it, so one fix at a brand new position
// is never enough (see confirmProgress). After a jump, send a second fix at the same place so
// the step is confirmed even while playback is paused.
function nudgeFix() {
  setTimeout(() => {
    if (state.active) set({ fixNonce: state.fixNonce + 1 })
  }, 150)
}

function progressNow() {
  if (!anchor) return state.progressSeconds
  return Math.min(timeline.totalSeconds,
    anchor.progressSeconds + (Date.now() - anchor.at) / 1000 * state.speed)
}

function stopTicker() {
  if (ticker !== null) clearInterval(ticker)
  ticker = null
  anchor = null
}

function startTicker() {
  stopTicker()
  anchor = { at: Date.now(), progressSeconds: state.progressSeconds }
  ticker = setInterval(() => {
    const progressSeconds = progressNow()
    if (progressSeconds >= timeline.totalSeconds) {
      stopTicker()
      set({ progressSeconds: timeline.totalSeconds, playing: false })
      return
    }
    set({ progressSeconds })
  }, TICK_MS)
}

export function startSimulation(nextTimeline) {
  if (!DEMO_MODE || !canSimulate(nextTimeline)) return
  timeline = nextTimeline
  schedules = new Map()
  state = { ...IDLE, busRefreshKey: state.busRefreshKey + 1, resetKey: state.resetKey + 1 }
  set({ active: true, playing: true, totalSeconds: timeline.totalSeconds })
  startTicker()
  nudgeFix()
}

export function stopSimulation() {
  if (!state.active) return
  stopTicker()
  timeline = null
  schedules = new Map()
  // Clearing the scripted answers means the next poll gets real live data again.
  set({ ...IDLE, busRefreshKey: state.busRefreshKey + 1, resetKey: state.resetKey + 1 })
}

export function setPlaying(playing) {
  if (!state.active) return
  if (playing && state.progressSeconds >= timeline.totalSeconds) return restart()
  set({ playing, progressSeconds: progressNow() })
  if (playing) startTicker()
  else {
    stopTicker()
    nudgeFix()
  }
}

export function setSpeed(speed) {
  if (!state.active || !SPEEDS.includes(speed)) return
  set({ speed, progressSeconds: progressNow() })
  if (state.playing) startTicker()
}

// Jumping ahead or back is a new starting position, so journey tracking starts again: it only
// ever moves forwards through the steps, by design.
export function seekTo(progressSeconds) {
  if (!state.active) return
  const clamped = Math.max(0, Math.min(timeline.totalSeconds, progressSeconds))
  schedules = new Map()
  set({ progressSeconds: clamped, resetKey: state.resetKey + 1,
    busRefreshKey: state.busRefreshKey + 1 })
  if (state.playing) startTicker()
  nudgeFix()
}

export function restart() {
  if (!state.active) return
  schedules = new Map()
  set({ progressSeconds: 0, playing: true, resetKey: state.resetKey + 1,
    busRefreshKey: state.busRefreshKey + 1 })
  startTicker()
  nudgeFix()
}

export function jumpToBusStop() {
  if (!state.active) return
  const stop = nextStop(timeline, state.progressSeconds)
  if (stop) seekTo(stop.reachedAt)
}

export function setLocationOn(locationOn) {
  if (state.active) set({ locationOn })
}

export function setLiveDataOn(liveDataOn) {
  if (state.active) set({ liveDataOn, busRefreshKey: state.busRefreshKey + 1 })
}

export function setScriptedBuses(scriptedBuses) {
  if (!state.active) return
  schedules = new Map()
  set({ scriptedBuses, busRefreshKey: state.busRefreshKey + 1 })
}

// Re-times the next bus so the traveller cannot reach it; the app drops it and counts down to
// the one after. This is the predictable point in the demo where a bus is skipped.
export function missNextBus() {
  if (!state.active || !state.scriptedBuses) return
  const stop = nextStop(timeline, state.progressSeconds)
  if (!stop?.code) return
  schedules.set(stop.legIndex, scriptedSchedule({
    now: Date.now(),
    planSecondsToStop: stop.reachedAt - state.progressSeconds,
    speed: state.speed,
    missFirst: true,
  }))
  set({ busRefreshKey: state.busRefreshKey + 1 })
}

// Where the traveller is, whether or not the app is being told about it.
export const simulatedPosition = () =>
  state.active ? positionAt(timeline, state.progressSeconds) : null

export const simulatedLocation = () => {
  if (!state.locationOn) return null
  // A real fix is stamped with the real time, and so is this one.
  const position = simulatedPosition()
  return position && { ...position, timestamp: Date.now() }
}

export const nextBusStop = () => state.active ? nextStop(timeline, state.progressSeconds) : null

// Stands in for the live bus arrival request while a simulation is running. Returns null when
// the real provider should answer instead.
export function simulatedBusArrival(busStopCode, service) {
  if (!DEMO_MODE || !state.active) return null
  if (!state.liveDataOn) {
    return Promise.reject(new Error('Simulated live data failure (demo tool)'))
  }
  if (!state.scriptedBuses) return null
  const stop = stopFor(timeline, busStopCode, service)
  if (!stop) return null
  // Fixed once per stop, so the arrival time counts down instead of being pushed back on every
  // refresh, exactly as a real estimate does.
  if (!schedules.has(stop.legIndex)) {
    schedules.set(stop.legIndex, scriptedSchedule({
      now: Date.now(),
      planSecondsToStop: stop.reachedAt - state.progressSeconds,
      speed: state.speed,
    }))
  }
  return Promise.resolve(scriptedEvidence({
    busStopCode, service, arrivals: schedules.get(stop.legIndex), retrievedAt: Date.now(),
  }))
}
