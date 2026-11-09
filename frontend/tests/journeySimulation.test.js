import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildTimeline,
  canSimulate,
  legWaitSeconds,
  MIN_BUS_WAIT_SECONDS,
  nextStop,
  positionAt,
} from '../src/dev/simulatedJourney.js'
import {
  HEADWAY_SECONDS,
  scriptedEvidence,
  scriptedSchedule,
} from '../src/dev/scriptedBuses.js'
import { locateOnRoute, navigationTiming } from '../src/utils/navigationTiming.js'

const now = Date.parse('2026-11-09T09:00:00+08:00')
const at = minutes => new Date(now + minutes * 60000).toISOString()

// Shaped like a route from the normal route engine: walk to a stop, then a bus.
const route = () => ({
  durationMinutes: 25,
  legs: [
    { mode: 'WALK', durationSeconds: 600, startTime: at(0), endTime: at(10),
      path: [[1.3, 103.8], [1.3, 103.81]] },
    { mode: 'BUS', service: '36', durationSeconds: 600, startTime: at(15), endTime: at(25),
      from: { code: '09037', name: 'Opp Blk 123' }, path: [[1.3, 103.81], [1.31, 103.81]] },
  ],
})

test('the timeline walks each leg and waits at the bus stop', () => {
  const timeline = buildTimeline(route())
  assert.ok(canSimulate(timeline))
  // 10 min walk, 5 min planned wait, 10 min ride.
  assert.equal(timeline.totalSeconds, 1500)
  assert.deepEqual(timeline.segments.map(segment => [segment.kind, segment.from, segment.to]), [
    ['travel', 0, 600],
    ['wait', 600, 900],
    ['travel', 900, 1500],
  ])
  assert.deepEqual(timeline.stops, [{ legIndex: 1, reachedAt: 600, departsAt: 900,
    service: '36', code: '09037', name: 'Opp Blk 123' }])
})

test('a bus leg always waits long enough at the stop to have a bus to miss', () => {
  const legs = route().legs
  // Back-to-back planned times leave no wait of their own.
  legs[1].startTime = legs[0].endTime
  assert.equal(legWaitSeconds(legs, 1), MIN_BUS_WAIT_SECONDS)
  assert.equal(legWaitSeconds(legs, 0), 0)
})

test('a route with no geometry at all cannot be simulated', () => {
  assert.equal(canSimulate(buildTimeline({ legs: [{ mode: 'WALK', durationSeconds: 60 }] })), false)
  assert.equal(canSimulate(buildTimeline(undefined)), false)
})

test('the position moves along the leg, holds at the stop and stops at the end', () => {
  const timeline = buildTimeline(route())
  assert.deepEqual(positionAt(timeline, 0).latitude, 1.3)
  const halfway = positionAt(timeline, 300)
  assert.ok(Math.abs(halfway.longitude - 103.805) < 0.0001, `${halfway.longitude}`)
  assert.equal(halfway.waiting, false)
  assert.equal(halfway.legIndex, 0)
  const waiting = positionAt(timeline, 700)
  assert.deepEqual([waiting.latitude, waiting.longitude, waiting.waiting, waiting.legIndex],
    [1.3, 103.81, true, 1])
  const riding = positionAt(timeline, 1200)
  assert.ok(Math.abs(riding.latitude - 1.305) < 0.0001, `${riding.latitude}`)
  const arrived = positionAt(timeline, 9999)
  assert.deepEqual([arrived.latitude, arrived.longitude], [1.31, 103.81])
})

test('"jump to the bus stop" aims at the next stop the traveller has not left', () => {
  const timeline = buildTimeline(route())
  assert.equal(nextStop(timeline, 0).reachedAt, 600)
  assert.equal(nextStop(timeline, 700).reachedAt, 600)
  assert.equal(nextStop(timeline, 1000), null)
})

// The planned-times fallback appears when the fix cannot be matched to the route, so every
// simulated position has to be accepted as being on it.
test('simulated positions count as being on the route', () => {
  const data = route()
  const timeline = buildTimeline(data)
  for (const seconds of [0, 1, 300, 600, 700, 900, 1200, 1500]) {
    const found = locateOnRoute(data, positionAt(timeline, seconds))
    assert.ok(found, `no match at ${seconds}s`)
  }
  assert.equal(locateOnRoute(data, positionAt(timeline, 300)).index, 0)
  assert.equal(locateOnRoute(data, positionAt(timeline, 1200)).index, 1)
})

const timingFor = (arrivals, elapsedSeconds) => {
  const data = route()
  const timeline = buildTimeline(data)
  const evidence = {
    ...scriptedEvidence({ busStopCode: '09037', service: '36', arrivals, retrievedAt: now }),
  }
  evidence.details = { ...evidence.details, legIndex: 1 }
  const progress = locateOnRoute(data, positionAt(timeline, elapsedSeconds))
  return navigationTiming({ ...data, evidence: [evidence] }, progress, now, now)
}

test('a scripted bus pulls in shortly after the traveller reaches the stop', () => {
  const arrivals = scriptedSchedule({ now, planSecondsToStop: 600, speed: 1 })
  assert.equal(arrivals[0], now + 660000)
  assert.equal(arrivals[1], arrivals[0] + HEADWAY_SECONDS * 1000)
  // Already at the stop: the next bus is a minute away whatever the playback speed.
  assert.equal(scriptedSchedule({ now, planSecondsToStop: 0, speed: 8 })[0], now + 60000)
})

// The app decides which buses are catchable from the planned journey in real seconds, so a
// schedule compressed to match fast playback would have every bus rejected as unreachable.
test('a scripted bus is catchable at every playback speed', () => {
  for (const speed of [0.5, 1, 2, 4, 8]) {
    const arrivals = scriptedSchedule({ now, planSecondsToStop: 600, speed })
    const timing = timingFor(arrivals, 0)
    assert.equal(timing.buses[1].at, arrivals[0], `first bus rejected at ${speed}x`)
    assert.ok(timing.minutes > 0)
  }
})

test('a bus can still be missed on cue at every playback speed', () => {
  for (const speed of [0.5, 1, 2, 4, 8]) {
    const missed = scriptedSchedule({ now, planSecondsToStop: 600, speed, missFirst: true })
    const timing = timingFor(missed, 0)
    assert.equal(timing.buses[1].at, missed[1], `wrong bus chosen at ${speed}x`)
  }
})

test('the journey counts down to the scripted bus', () => {
  const arrivals = scriptedSchedule({ now, planSecondsToStop: 600, speed: 1 })
  const timing = timingFor(arrivals, 0)
  assert.equal(timing.buses[1].at, arrivals[0])
  assert.equal(timing.buses[1].stale, false)
  // Ten minutes of walking, then the bus at 11 minutes, then ten minutes of riding.
  assert.equal(timing.minutes, 21)
})

test('a bus the traveller cannot reach is skipped in favour of the next one', () => {
  const missed = scriptedSchedule({ now, planSecondsToStop: 600, speed: 1, missFirst: true })
  // The revised estimate is before the earliest the traveller could be at the stop.
  assert.ok(missed[0] < now + 600000)
  const timing = timingFor(missed, 0)
  assert.equal(timing.buses[1].at, missed[1])
  assert.ok(timing.buses[1].at > now + 600000)
  assert.equal(timing.buses[1].arrivals.includes(missed[0]), false)
})

test('a bus is still skipped when it is re-timed while waiting at the stop', () => {
  const missed = scriptedSchedule({ now, planSecondsToStop: 0, speed: 1, missFirst: true })
  const timing = timingFor(missed, 700)
  assert.equal(timing.buses[1].at, missed[1])
})
