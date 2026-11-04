import { test } from 'node:test'
import assert from 'node:assert/strict'
import { estimateArrival, formatRouteSummary, updatedAgo, matchesJourney,
  freshJourneyLocation, isSharingJourney } from '../src/utils/tripSharing.js'

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

const journey = { id: 'journey-1', origin: ' Home ', destination: ' Clinic ', summary: ' Bus 10 ' }
const share = { id: 'share-1', origin: 'Home', destination: 'Clinic', routeSummary: 'Bus 10', liveLocation: true }

test('sharing uses the current journey and explicit consent for that journey', () => {
  const consent = { [share.id]: journey.id }
  assert.equal(matchesJourney(share, journey), true)
  assert.equal(isSharingJourney(share, journey, consent), true)
  assert.equal(isSharingJourney(share, journey, {}), false)
  assert.equal(isSharingJourney({ ...share, liveLocation: false }, journey, consent), false)
})

test('leaving navigation or starting another journey pauses existing location shares', () => {
  const consent = { [share.id]: journey.id }
  assert.equal(isSharingJourney(share, null, consent), false)
  assert.equal(isSharingJourney(share, { ...journey, id: 'journey-2' }, consent), false)
  assert.equal(isSharingJourney(share, { ...journey, destination: 'School' }, consent), false)
  assert.equal(isSharingJourney(share, { ...journey, summary: 'Bus 20' }, consent), false)
})

test('only a fresh navigation position can be uploaded', () => {
  const now = Date.parse('2026-11-03T09:00:00+08:00')
  const location = { latitude: 1.3, longitude: 103.8, timestamp: now - 15000 }
  assert.equal(freshJourneyLocation(location, now), true)
  for (const invalid of [null, { ...location, timestamp: now - 31000 },
    { ...location, timestamp: now + 1000 }, { ...location, timestamp: undefined },
    { ...location, latitude: NaN }, { ...location, longitude: null }]) {
    assert.equal(freshJourneyLocation(invalid, now), false)
  }
})
