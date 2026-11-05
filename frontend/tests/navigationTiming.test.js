import { test } from 'node:test'
import assert from 'node:assert/strict'
import { confirmProgress, locateOnRoute, navigationTiming } from '../src/utils/navigationTiming.js'

const now = Date.parse('2026-11-01T00:00:00+08:00')
const at = minutes => new Date(now + minutes * 60000).toISOString()
const route = () => ({ durationMinutes: 25, legs: [
  { mode: 'WALK', durationSeconds: 600, startTime: at(0), endTime: at(10),
    path: [[1.3, 103.8], [1.3, 103.81]] },
  { mode: 'BUS', service: '36', durationSeconds: 600, startTime: at(15), endTime: at(25),
    from: { code: '09037' }, path: [[1.3, 103.81], [1.31, 103.81]] },
], evidence: [{ source: 'LTA BusArrival', availability: 'available', retrievedAt: at(0),
  details: { legIndex: 1, service: '36', busStopCode: '09037',
    arrivals: [3, 8, 18].map(minutes => ({ EstimatedArrival: at(minutes) })) } }] })

test('GPS progress uses distance along the path, including later legs', () => {
  const data = route()
  const walk = locateOnRoute(data, { latitude: 1.3, longitude: 103.805, accuracy: 10 })
  assert.equal(walk.index, 0)
  assert.ok(Math.abs(walk.fraction - 0.5) < 0.001)
  const bus = locateOnRoute(data, { latitude: 1.305, longitude: 103.81, accuracy: 10 })
  assert.equal(bus.index, 1)
  assert.ok(Math.abs(bus.fraction - 0.5) < 0.001)
})

test('ignores inaccurate fixes and positions away from the route', () => {
  assert.equal(locateOnRoute(route(), { latitude: 1.3, longitude: 103.8, accuracy: 500 }), null)
  assert.equal(locateOnRoute(route(), { latitude: 1.4, longitude: 103.9, accuracy: 10 }), null)
  assert.equal(locateOnRoute(route(), null), null)
})

test('one inaccurate fix on a nearby later leg does not permanently skip steps', () => {
  // Walk east, then the bus returns west along a road about 45 m north.
  const loop = { legs: [
    { mode: 'WALK', path: [[1.3, 103.8], [1.3, 103.81]] },
    { mode: 'BUS', path: [[1.3, 103.81], [1.3004, 103.81], [1.3004, 103.8]] },
  ] }
  let tracking = { progress: null, pendingLeg: null }
  // Same steps as useNavigationTiming; timestamp identifies the GPS fix.
  const fix = (latitude, longitude, accuracy, timestamp) => {
    const found = locateOnRoute(loop, { latitude, longitude, accuracy }, tracking.progress?.index || 0)
    tracking = confirmProgress(tracking, found, timestamp)
    return found && tracking.progress
  }
  assert.equal(fix(1.3, 103.802, 10, 1).index, 0)
  assert.equal(fix(1.3004, 103.803, 50, 2).index, 0, 'a single drifted fix is not trusted')
  assert.equal(fix(1.3004, 103.803, 50, 2).index, 0, 'recalculating with the same fix does not confirm it')
  assert.equal(fix(1.3, 103.803, 5, 3).index, 0, 'accurate fixes on the walk still match it')
  // Two new fixes in a row on the bus leg confirm the move.
  fix(1.3004, 103.805, 10, 4)
  assert.equal(fix(1.3004, 103.804, 10, 5).index, 1)
})

test('skips an unreachable bus and recalculates arrival from actual walking progress', () => {
  const result = navigationTiming(route(), { index: 0, fraction: 0.5 }, now, now)
  assert.equal(result.buses[1].at, now + 8 * 60000)
  assert.deepEqual(result.buses[1].arrivals, [8, 18].map(minutes => now + minutes * 60000))
  assert.equal(result.minutes, 18)
  assert.equal(result.stepMinutes[0], 5)
  const slower = navigationTiming(route(), { index: 0, fraction: 0 }, now, now)
  assert.equal(slower.buses[1].at, now + 18 * 60000)
  assert.equal(slower.minutes, 28)
})

test('on-board travellers use the remaining ride without waiting for another bus', () => {
  const data = route()
  const halfway = locateOnRoute(data, { latitude: 1.305, longitude: 103.81, accuracy: 10 })
  const result = navigationTiming(data, halfway, now, now)
  assert.equal(result.minutes, 5)
  assert.deepEqual(result.buses, {})
})

test('GPS drift at the bus stop does not count as boarding', () => {
  // Bus leg first, so nothing earlier absorbs the drift. 1 m north is about 0.000009 degrees.
  const data = route()
  data.legs.shift()
  data.evidence[0].details.legIndex = 0
  for (const metres of [2.2, 20, 90]) {
    const drifted = locateOnRoute(data, { latitude: 1.3 + metres * 0.000009, longitude: 103.81, accuracy: 90 })
    const result = navigationTiming(data, drifted, now, now)
    assert.equal(result.buses[0].at, now + 3 * 60000, `${metres} m: still waiting for the bus`)
    assert.equal(result.minutes, 13)
  }
})

test('expired evidence remains usable as a last known estimate and is marked outdated', () => {
  const data = route()
  data.evidence[0].retrievedAt = at(-2)
  const result = navigationTiming(data, { index: 0, fraction: 0.5 }, now, now)
  assert.equal(result.buses[1].at, now + 8 * 60000)
  assert.equal(result.outdated, true)
})

test('no location and no live data keeps the planned arrival time', () => {
  const data = route()
  data.evidence = []
  const result = navigationTiming(data, null, now + 2 * 60000, now)
  assert.equal(result.arrival, now + 25 * 60000)
  assert.equal(result.minutes, 23)
})

test('fresh data with no catchable bus listed is not outdated and uses the planned wait', () => {
  const data = route()
  data.evidence[0].details.arrivals = [3, 8].map(minutes => ({ EstimatedArrival: at(minutes) }))
  const result = navigationTiming(data, { index: 0, fraction: 0 }, now, now)
  assert.equal(result.outdated, false)
  assert.equal(result.buses[1].at, undefined)
  // 10 min walk + 5 min planned wait + 10 min ride
  assert.equal(result.minutes, 25)
})

test('outdated data is still recalculated from the current position', () => {
  const data = route()
  data.evidence[0].retrievedAt = at(-2)
  const start = navigationTiming(data, { index: 0, fraction: 0.1 }, now, now)
  const later = navigationTiming(data, { index: 0, fraction: 0.9 }, now, now)
  assert.equal(start.outdated && later.outdated, true)
  assert.equal(start.buses[1].at, now + 18 * 60000)
  assert.equal(later.buses[1].at, now + 3 * 60000)
})

test('arrival advances to a later bus when a transfer cannot be reached', () => {
  const data = route()
  data.legs.push({ ...data.legs[1], service: '7', startTime: at(27), endTime: at(37) })
  data.evidence.push({ ...data.evidence[0], details: { ...data.evidence[0].details,
    legIndex: 2, service: '7', arrivals: [15, 22].map(minutes => ({ EstimatedArrival: at(minutes) })) } })
  const result = navigationTiming(data, { index: 0, fraction: 0.5 }, now, now)
  assert.equal(result.buses[2].at, now + 22 * 60000)
  assert.equal(result.minutes, 32)
})

test('a bus delay shifts the train, walk, later bus and total journey time together', () => {
  const data = route()
  data.legs.push(
    { mode: 'RAIL', durationSeconds: 300, startTime: at(27), endTime: at(32) },
    { mode: 'WALK', durationSeconds: 120, startTime: at(32), endTime: at(34) },
    { mode: 'BUS', service: '7', from: { code: '09037' }, durationSeconds: 600,
      startTime: at(35), endTime: at(45) },
  )
  data.evidence.push({ ...data.evidence[0], details: { ...data.evidence[0].details,
    legIndex: 4, service: '7', arrivals: [40, 50].map(minutes => ({ EstimatedArrival: at(minutes) })) } })
  const preview = () => navigationTiming(data, { index: 0, fraction: 0 }, now, now)
  const before = preview()
  assert.deepEqual(before.stepTimes[0], { departure: now, arrival: now + 10 * 60000 })
  assert.deepEqual(before.stepTimes[2], { departure: now + 30 * 60000, arrival: now + 35 * 60000 })
  assert.equal(before.stepTimes[3].arrival, now + 37 * 60000)
  assert.equal(before.stepTimes[4].departure, now + 40 * 60000)
  assert.equal(before.minutes, 50)
  data.evidence[0].details.arrivals = [{ EstimatedArrival: at(23) }]
  const after = preview()
  assert.equal(after.stepTimes[1].arrival, now + 33 * 60000)
  assert.equal(after.stepTimes[2].departure, now + 35 * 60000)
  assert.equal(after.stepTimes[3].arrival, now + 42 * 60000)
  assert.equal(after.stepTimes[4].departure, now + 50 * 60000)
  assert.equal(after.minutes, 60)
  assert.equal(after.arrival, after.stepTimes[4].arrival)
  for (let index = 1; index < data.legs.length; index++) {
    assert.ok(after.stepTimes[index].departure >= after.stepTimes[index - 1].arrival)
  }
})

test('without GPS the planned journey is shown consistently, with live buses for information', () => {
  // Walk 0-10 min, bus planned 15-25 min, live data says it comes at 18 min.
  const data = route()
  const withLiveBus = (minutes, busAt) => {
    data.evidence[0].retrievedAt = at(minutes)
    data.evidence[0].details.arrivals = [{ EstimatedArrival: at(busAt) }]
    return navigationTiming(data, null, now + minutes * 60000, now)
  }
  for (const minutes of [2, 14, 16, 20]) {
    const result = withLiveBus(minutes, 18)
    assert.equal(result.arrival, now + 25 * 60000, 'arrival stays planned')
    assert.equal(result.minutes, 25 - minutes, 'remaining time counts down')
    assert.deepEqual(result.stepTimes[1], { departure: now + 15 * 60000, arrival: now + 25 * 60000 })
    assert.equal(result.stepMinutes[0], 10)
  }
  assert.equal(withLiveBus(14, 18).buses[1].at, now + 18 * 60000, 'live bus still listed')
})
