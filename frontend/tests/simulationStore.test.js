import { test, mock } from 'node:test'
import assert from 'node:assert/strict'

// Demo mode is read once when the module loads, so the switch is set before importing it.
globalThis.window = {
  location: { search: '?demo=1', hash: '' },
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
}

const { buildTimeline } = await import('../src/dev/simulatedJourney.js')
const store = await import('../src/dev/simulationStore.js')
const { HEADWAY_SECONDS } = await import('../src/dev/scriptedBuses.js')

const start = Date.parse('2026-11-09T09:00:00+08:00')
const at = minutes => new Date(start + minutes * 60000).toISOString()
const route = {
  legs: [
    { mode: 'WALK', durationSeconds: 600, startTime: at(0), endTime: at(10),
      path: [[1.3, 103.8], [1.3, 103.81]] },
    { mode: 'BUS', service: '36', durationSeconds: 600, startTime: at(15), endTime: at(25),
      from: { code: '09037', name: 'Opp Blk 123' }, path: [[1.3, 103.81], [1.31, 103.81]] },
  ],
}

const timeline = () => buildTimeline(route)

// Each test drives the shared store, so it starts from a known state and is left stopped.
function simulate(body) {
  mock.timers.enable({ apis: ['setInterval', 'Date'], now: start })
  try {
    store.startSimulation(timeline())
    body()
  } finally {
    store.stopSimulation()
    mock.timers.reset()
  }
}

test('demo mode is required before anything simulates', () => {
  assert.equal(store.simulationAvailable(), true)
  assert.equal(store.getSimulation().active, false)
})

test('playback moves the traveller in real time and can be paused and resumed', () => {
  simulate(() => {
    assert.equal(store.getSimulation().playing, true)
    assert.equal(store.getSimulation().progressSeconds, 0)
    mock.timers.tick(60000)
    assert.equal(store.getSimulation().progressSeconds, 60)
    store.setPlaying(false)
    mock.timers.tick(60000)
    assert.equal(store.getSimulation().progressSeconds, 60)
    store.setPlaying(true)
    mock.timers.tick(30000)
    assert.equal(store.getSimulation().progressSeconds, 90)
  })
})

test('playback speed changes how fast the journey runs, not the clock', () => {
  simulate(() => {
    store.setSpeed(4)
    mock.timers.tick(60000)
    assert.equal(store.getSimulation().progressSeconds, 240)
    // The fix is stamped with the real time, which playback never alters.
    assert.equal(store.simulatedLocation().timestamp, Date.now())
    assert.equal(Date.now(), start + 60000)
  })
})

test('playback stops at the end of the journey', () => {
  simulate(() => {
    store.setSpeed(8)
    mock.timers.tick(600000)
    const state = store.getSimulation()
    assert.equal(state.progressSeconds, timeline().totalSeconds)
    assert.equal(state.playing, false)
  })
})

test('jumping to the bus stop puts the traveller at the stop', () => {
  simulate(() => {
    store.jumpToBusStop()
    const location = store.simulatedLocation()
    assert.deepEqual([location.latitude, location.longitude], [1.3, 103.81])
    assert.equal(location.waiting, true)
    // Nothing left to jump to once the bus has been boarded.
    store.seekTo(1000)
    assert.equal(store.nextBusStop(), null)
  })
})

test('turning location off withholds the position without stopping the journey', () => {
  simulate(() => {
    store.setLocationOn(false)
    assert.equal(store.simulatedLocation(), null)
    mock.timers.tick(60000)
    assert.equal(store.getSimulation().progressSeconds, 60)
    store.setLocationOn(true)
    assert.ok(store.simulatedLocation())
  })
})

test('a running simulation answers for the live bus provider', async () => {
  let answer
  simulate(() => {
    answer = store.simulatedBusArrival('09037', '36')
    assert.ok(answer, 'expected the simulation to answer')
  })
  // Nothing is answered for once the simulation has stopped: real live data resumes.
  assert.equal(store.simulatedBusArrival('09037', '36'), null)
  const evidence = await answer
  assert.equal(evidence.source, 'LTA BusArrival')
  assert.equal(evidence.availability, 'available')
  assert.equal(evidence.details.busStopCode, '09037')
  assert.equal(evidence.details.service, '36')
  // Real wall-clock times throughout, so staleness and countdowns behave as in production.
  assert.equal(Date.parse(evidence.retrievedAt), start)
  const arrivals = evidence.details.arrivals.map(bus => Date.parse(bus.EstimatedArrival))
  // A bus a minute after the traveller reaches the stop, then one every four minutes.
  assert.equal(arrivals[0], start + 660000)
  assert.equal(arrivals[1] - arrivals[0], HEADWAY_SECONDS * 1000)
})

test('an unknown stop is left to the real provider', () => {
  simulate(() => {
    assert.equal(store.simulatedBusArrival('11111', '36'), null)
    store.setScriptedBuses(false)
    assert.equal(store.simulatedBusArrival('09037', '36'), null)
  })
})

test('making live data fail rejects every bus request and asks for a refresh', async () => {
  let rejection
  simulate(() => {
    const before = store.getSimulation().busRefreshKey
    store.setLiveDataOn(false)
    assert.ok(store.getSimulation().busRefreshKey > before)
    rejection = store.simulatedBusArrival('09037', '36')
  })
  await assert.rejects(rejection, /Simulated live data failure/)
})

test('missing the next bus re-times it out of reach', async () => {
  let schedule
  simulate(() => {
    store.missNextBus()
    schedule = store.simulatedBusArrival('09037', '36')
      .then(evidence => evidence.details.arrivals.map(bus => Date.parse(bus.EstimatedArrival)))
  })
  const arrivals = await schedule
  // The first bus is now earlier than the traveller could reach the stop, so the app skips it.
  assert.ok(arrivals[0] < start + 600000, `${arrivals[0] - start}`)
  assert.ok(arrivals[1] > start + 600000)
})

test('a jump sends a second fix, so the new step is confirmed even while paused', () => {
  mock.timers.enable({ apis: ['setInterval', 'setTimeout', 'Date'], now: start })
  try {
    store.startSimulation(timeline())
    store.setPlaying(false)
    store.jumpToBusStop()
    const before = store.getSimulation().fixNonce
    mock.timers.tick(200)
    assert.ok(store.getSimulation().fixNonce > before, 'expected a second fix after the jump')
  } finally {
    store.stopSimulation()
    mock.timers.reset()
  }
})

test('stopping clears the simulation and hands back to the device', () => {
  simulate(() => {
    assert.ok(store.simulatedLocation())
  })
  const state = store.getSimulation()
  assert.equal(state.active, false)
  assert.equal(state.locationOn, true)
  assert.equal(store.simulatedLocation(), null)
})
