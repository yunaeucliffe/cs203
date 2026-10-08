import { test } from 'node:test'
import assert from 'node:assert/strict'
import { busArrivalDetails } from '../src/utils/busArrivals.js'

const now = Date.parse('2026-09-28T00:00:00Z')
const route = () => ({ legs: [{ mode: 'BUS', service: '97', from: { id: '1:01234' } }],
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
