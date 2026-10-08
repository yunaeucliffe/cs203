import { afterEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { searchSuggestions } from '../src/api/locations.js'

const originalFetch = globalThis.fetch
afterEach(() => { globalThis.fetch = originalFetch })
const place = { name: 'Hospital', address: '1 Road', latitude: 1.3, longitude: 103.8 }

test('suggestions encode queries, preserve coordinates and use cancellation', async () => {
  const signal = new AbortController().signal
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'http://localhost:8081/api/location/suggestions?query=A%26B+Road')
    assert.equal(options.signal, signal)
    assert.equal(options.credentials, 'include')
    return { ok: true, json: async () => [place] }
  }
  assert.deepEqual(await searchSuggestions(' A&B Road ', signal), [place])
})

test('no matches are successful but failed and malformed responses are errors', async () => {
  globalThis.fetch = async () => ({ ok: true, json: async () => [] })
  assert.deepEqual(await searchSuggestions('Unknown'), [])
  for (const [ok, body] of [[false, { message: 'provider diagnostics' }], [true, null],
    [true, [null]], [true, [{ ...place, latitude: '1.3' }]], [true, [{ ...place, longitude: 181 }]]]) {
    globalThis.fetch = async () => ({ ok, json: async () => body })
    await assert.rejects(searchSuggestions('Hospital'), /suggestions are unavailable/)
  }
})

test('network failures allow retry and aborted requests remain cancellation errors', async () => {
  globalThis.fetch = async () => { throw new TypeError('Failed to fetch') }
  await assert.rejects(searchSuggestions('Hospital'), /Try again/)
  globalThis.fetch = async () => { throw new DOMException('Aborted', 'AbortError') }
  await assert.rejects(searchSuggestions('Hospital'), { name: 'AbortError' })
})
