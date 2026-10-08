import { afterEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { searchSuggestions, lookupPostalCode } from '../src/api/locations.js'

const originalFetch = globalThis.fetch
afterEach(() => { globalThis.fetch = originalFetch })
const row = { BUILDING: 'Hospital', ADDRESS: '1 Road', POSTAL: '012345', LATITUDE: '1.3', LONGITUDE: '103.8' }

test('suggestions encode trimmed queries and preserve selected coordinates', async () => {
  const places = [{ name: 'Hospital', address: '1 Road', postalCode: '012345', latitude: 1.3, longitude: 103.8 }]
  const signal = new AbortController().signal
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'http://localhost:8081/api/location/search?query=A%26B+Road')
    assert.equal(options.signal, signal)
    assert.equal(options.credentials, 'include')
    return { ok: true, json: async () => ({ results: [row] }) }
  }
  assert.deepEqual(await searchSuggestions(' A&B Road ', signal), places)
})

test('empty suggestions are successful, provider failures and malformed results are errors', async () => {
  for (const [ok, body] of [[true, { results: [] }], [false, { message: 'secret diagnostics' }], [true, {}],
    [true, { results: [{ ...row, LATITUDE: 'invalid' }] }], [true, { error: 'Invalid token', results: [] }]]) {
    globalThis.fetch = async () => ({ ok, json: async () => body })
    if (ok && Array.isArray(body.results) && !body.results.length && !body.error) assert.deepEqual(await searchSuggestions('Hospital'), [])
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
    assert.equal(url, 'http://localhost:8081/api/location/search?query=012345')
    assert.equal(options.signal, signal)
    assert.equal(options.credentials, 'include')
    return { ok: true, json: async () => ({ results: [{ ...row, BUILDING: place.name, ADDRESS: place.address }] }) }
  }
  assert.deepEqual(await lookupPostalCode(' 012345 ', signal), [place])
})

test('invalid postal codes never call the backend', async () => {
  globalThis.fetch = async () => assert.fail('Unexpected lookup')
  for (const code of ['', '12345', '1234567', '12a456']) {
    await assert.rejects(lookupPostalCode(code), /6-digit postal code/)
  }
})

test('postal lookup returns only exact matches and rejects malformed provider data', async () => {
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ results: [] }) })
  assert.deepEqual(await lookupPostalCode('012345'), [])
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ results: [{ ...row, POSTAL: '999999' }] }) })
  assert.deepEqual(await lookupPostalCode('012345'), [])
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ results: [null] }) })
  await assert.rejects(lookupPostalCode('012345'), /unavailable/)
})

test('postal matching happens before limiting suggestions and duplicate addresses are removed', async () => {
  const rows = Array.from({ length: 6 }, (_, i) => ({ ...row, ADDRESS: `Road ${i}`, POSTAL: '999999' }))
  rows.push(row, row, { ...row, ADDRESS: '2 Road', LATITUDE: '1.4' })
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ results: rows }) })
  assert.equal((await searchSuggestions('Road')).length, 5)
  assert.deepEqual((await lookupPostalCode('012345')).map(place => place.address), ['1 Road', '2 Road'])
})

test('postal lookup reports network failure and preserves cancellation', async () => {
  globalThis.fetch = async () => { throw new TypeError('Failed to fetch') }
  await assert.rejects(lookupPostalCode('012345'), /enter the address yourself/)
  globalThis.fetch = async () => { throw new DOMException('Aborted', 'AbortError') }
  await assert.rejects(lookupPostalCode('012345'), { name: 'AbortError' })
})
