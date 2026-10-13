import { test } from 'node:test'
import assert from 'node:assert/strict'
import { busArrivalDetails } from '../src/utils/busArrivals.js'

const now = Date.parse('2026-09-28T00:00:00Z')
const route = () => ({ legs: [{ mode: 'BUS', service: '97', startTime: new Date(now).toISOString(), from: { id: '1:01234' } }],
  evidence: [{ source: 'LTA BusArrival', availability: 'available', retrievedAt: new Date(now).toISOString(),
    details: { legIndex: 0, service: '97', busStopCode: '01234', arrivals: [
      { EstimatedArrival: '2026-09-28T08:05:00+08:00' },
      { EstimatedArrival: 'invalid' }, { EstimatedArrival: '2026-09-27T08:05:00+08:00' },
    ] } }] })

test('shows upcoming arrivals matched to the boarding stop, service and leg', () => {
  assert.deepEqual(busArrivalDetails(route(), 0, now).arrivals, ['2026-09-28T08:05:00+08:00'])
  for (const [key, value] of [['busStopCode', '54321'], ['service', '99'], ['legIndex', 1]]) {
    const data = route()
    data.evidence[0].details[key] = value
    assert.deepEqual(busArrivalDetails(data, 0, now).arrivals, [])
  }
})

test('later transfer excludes buses before the traveller reaches the stop', () => {
  const data = route()
  data.legs.unshift({ mode: 'RAIL', endTime: new Date(now + 20 * 60000).toISOString() })
  data.legs[1].startTime = new Date(now + 25 * 60000).toISOString()
  data.evidence[0].details.legIndex = 1
  data.evidence[0].details.arrivals = [3, 20, 24].map(minutes => ({
    EstimatedArrival: new Date(now + minutes * 60000).toISOString(),
  }))
  const details = busArrivalDetails(data, 1, now)
  assert.equal(details.expectedAtStop, now + 20 * 60000)
  assert.deepEqual(details.arrivals, [20, 24].map(minutes => new Date(now + minutes * 60000).toISOString()))
  assert.equal((Date.parse(details.arrivals[1]) - details.readyAt) / 60000, 4)
})

test('walking to a stop and unavailable later buses are accounted for', () => {
  const data = route()
  data.legs.unshift({ mode: 'WALK', startTime: new Date(now).toISOString(), durationSeconds: 600 })
  data.evidence[0].details.legIndex = 1
  const details = busArrivalDetails(data, 1, now)
  assert.equal(details.expectedAtStop, now + 10 * 60000)
  assert.deepEqual(details.arrivals, [])
  assert.equal(details.noCatchableArrivals, true)
})

test('missing timing hides arrivals, with planned boarding as a conservative fallback', () => {
  const data = route()
  delete data.legs[0].startTime
  assert.equal(busArrivalDetails(data, 0, now).expectedAtStop, null)
  assert.deepEqual(busArrivalDetails(data, 0, now).arrivals, [])
  data.legs[0].startTime = new Date(now + 6 * 60000).toISOString()
  assert.deepEqual(busArrivalDetails(data, 0, now).arrivals, [])
})

test('past stop timing does not expose past buses or negative waits', () => {
  const data = route()
  data.legs[0].startTime = new Date(now - 10 * 60000).toISOString()
  const details = busArrivalDetails(data, 0, now)
  assert.equal(details.readyAt, now)
  assert.equal(details.arrivals.length, 1)
  assert.ok(Date.parse(details.arrivals[0]) >= details.readyAt)
})

test('missing, unavailable and expired estimates leave the route usable', () => {
  assert.deepEqual(busArrivalDetails({ legs: route().legs }, 0, now).arrivals, [])
  const data = route()
  data.evidence[0].availability = 'unavailable'
  assert.deepEqual(busArrivalDetails(data, 0, now).arrivals, [])
  const expired = busArrivalDetails(route(), 0, now + 60000)
  assert.equal(expired.stale, true)
  assert.deepEqual(expired.arrivals, [])
  assert.ok(expired.evidence.retrievedAt)
})
