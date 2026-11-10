import { test } from 'node:test'
import assert from 'node:assert/strict'

// No ?demo flag and nothing remembered: an ordinary session, which is every user's session.
globalThis.window = {
  location: { search: '?origin=home', hash: '#share/abc' },
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
}

const { buildTimeline } = await import('../src/dev/simulatedJourney.js')
const store = await import('../src/dev/simulationStore.js')

const route = { legs: [{ mode: 'WALK', durationSeconds: 600, path: [[1.3, 103.8], [1.3, 103.81]] }] }

test('the simulation stays switched off without demo mode', () => {
  assert.equal(store.simulationAvailable(), false)
  store.startSimulation(buildTimeline(route))
  assert.equal(store.getSimulation().active, false)
  assert.equal(store.simulatedLocation(), null)
  // Live bus requests go to the real provider.
  assert.equal(store.simulatedBusArrival('09037', '36'), null)
})
