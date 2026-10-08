import { afterEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { searchSuggestions, lookupPostalCode } from '../src/api/locations.js'

const originalFetch = globalThis.fetch
afterEach(() => { globalThis.fetch = originalFetch })

test('suggestions encode trimmed queries and preserve selected coordinates', async () => {
  const places = [{ name: 'Hospital', address: '1 Road', latitude: 1.3, longitude: 103.8 }]
  const signal = new AbortController().signal
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'http://localhost:8081/api/location/suggestions?query=A%26B+Road')
    assert.equal(options.signal, signal)
    assert.equal(options.credentials, 'include')
    return { ok: true, json: async () => places }
  }
  assert.deepEqual(await searchSuggestions(' A&B Road ', signal), places)
})

test('empty suggestions are successful, provider failures and malformed results are errors', async () => {
  for (const [ok, body] of [[true, []], [false, { message: 'secret diagnostics' }], [true, {}],
    [true, [{ name: 'Hospital', address: 'Road', latitude: '1.3', longitude: 103.8 }]]]) {
    globalThis.fetch = async () => ({ ok, json: async () => body })
    if (ok && Array.isArray(body) && !body.length) assert.deepEqual(await searchSuggestions('Hospital'), [])
    else await assert.rejects(searchSuggestions('Hospital'), /suggestions are unavailable/)
  }
})

test('cancellation remains an AbortError so obsolete requests can be ignored', async () => {
  globalThis.fetch = async () => { throw new DOMException('Aborted', 'AbortError') }
  await assert.rejects(searchSuggestions('Hospital'), { name: 'AbortError' })
})

test('postal lookup preserves leading zeros and sends the cancellation signal', async () => {
  const place = { name: 'Building', address: '1 Road Singapore 012345', postalCode: '012345', latitude: 1.3, longitude: 103.8 }
  const signal = new AbortController().signal
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'http://localhost:8081/api/location/postal-code?code=012345')
    assert.equal(options.signal, signal)
    assert.equal(options.credentials, 'include')
    return { ok: true, json: async () => [place] }
  }
  assert.deepEqual(await lookupPostalCode(' 012345 ', signal), [place])
})

test('invalid postal codes never call the backend', async () => {
  globalThis.fetch = async () => assert.fail('Unexpected lookup')
  for (const code of ['', '12345', '1234567', '12a456']) {
    await assert.rejects(lookupPostalCode(code), /6-digit postal code/)
  }
})

test('postal lookup distinguishes no match, wrong postal code and malformed provider data', async () => {
  globalThis.fetch = async () => ({ ok: true, json: async () => [] })
  assert.deepEqual(await lookupPostalCode('012345'), [])
  for (const places of [[null], [{ name: 'Building', address: 'Road', postalCode: '999999', latitude: 1.3, longitude: 103.8 }]]) {
    globalThis.fetch = async () => ({ ok: true, json: async () => places })
    await assert.rejects(lookupPostalCode('012345'), /unavailable|does not match/)
  }
})

test('postal lookup reports network failure and preserves cancellation', async () => {
  globalThis.fetch = async () => { throw new TypeError('Failed to fetch') }
  await assert.rejects(lookupPostalCode('012345'), /enter the address yourself/)
  globalThis.fetch = async () => { throw new DOMException('Aborted', 'AbortError') }
  await assert.rejects(lookupPostalCode('012345'), { name: 'AbortError' })
})
