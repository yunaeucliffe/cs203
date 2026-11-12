import { test } from 'node:test'
import assert from 'node:assert/strict'

// Minimal browser stand-ins: this runs under plain Node.
const stored = new Map()
globalThis.localStorage = {
  getItem: key => stored.get(key) ?? null,
  setItem: (key, value) => stored.set(key, String(value)),
  removeItem: key => stored.delete(key),
}
globalThis.window = new EventTarget()

const { clearSavedJourney, loadActiveJourney } = await import('../src/utils/activeJourney.js')
const { loadRouteSearchDraft } = await import('../src/utils/routeSearchDraft.js')

test("signing out forgets the previous user's journey and route searches", () => {
  localStorage.setItem('activeJourney', JSON.stringify({ startedAt: Date.now(), route: { durationMinutes: 30 } }))
  localStorage.setItem('routeSearchState', JSON.stringify({ destination: 'Clinic' }))
  localStorage.setItem('routeSearchDraft', JSON.stringify({ destination: 'Clinic' }))
  localStorage.setItem('unrelated', 'kept')
  assert.ok(loadActiveJourney())
  let updated = false
  window.addEventListener('activeJourneyUpdated', () => { updated = true })

  clearSavedJourney()

  assert.equal(loadActiveJourney(), null)
  assert.equal(localStorage.getItem('routeSearchState'), null)
  assert.equal(loadRouteSearchDraft(), null)
  assert.equal(localStorage.getItem('unrelated'), 'kept')
  assert.ok(updated, 'the home page is told to hide the journey card')
})
