import { test } from 'node:test'
import assert from 'node:assert/strict'
import { estimateArrival, formatRouteSummary, updatedAgo } from '../src/utils/tripSharing.js'

test('a 37-minute trip shared at 3:51 pm arrives at 4:28 pm even if the itinerary ends near now', () => {
  const startedAt = Date.parse('2026-10-23T15:51:00+08:00')
  const route = { durationMinutes: 37, legs: [{ endTime: '2026-10-23T15:51:30+08:00' }] }
  assert.equal(estimateArrival(route, startedAt), '2026-10-23T08:28:00.000Z')
})

test('arrival calculation handles a trip crossing midnight', () => {
  const startedAt = Date.parse('2026-10-23T23:51:00+08:00')
  assert.equal(estimateArrival({ durationMinutes: 37 }, startedAt), '2026-10-23T16:28:00.000Z')
})

test('an unavailable duration is rejected instead of showing the current time', () => {
  for (const durationMinutes of [undefined, null, 0, -1, NaN, Infinity]) {
    assert.throws(() => estimateArrival({ durationMinutes }), /duration is unavailable/)
  }
})

test('route summary codes are shown as plain words', () => {
  assert.equal(formatRouteSummary('WALK → BUS 10 → SUBWAY EW → WALK'), 'Walk → Bus 10 → Train EW → Walk')
  assert.equal(formatRouteSummary('Bus 10'), 'Bus 10')
})

test('last update is shown as time ago', () => {
  const now = Date.parse('2026-10-23T15:51:00+08:00')
  assert.equal(updatedAgo(now - 15000, now), 'less than a minute ago')
  assert.equal(updatedAgo(now - 65000, now), '1 minute ago')
  assert.equal(updatedAgo(now - 125000, now), '2 minutes ago')
})
