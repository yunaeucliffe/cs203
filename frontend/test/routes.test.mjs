import { test, afterEach, mock } from 'node:test'
import assert from 'node:assert/strict'
import { searchLocation, searchRoutes } from '../src/api/routes.js'

afterEach(() => mock.restoreAll())

test('location names are encoded and abort signals reach fetch', async () => {
  const signal = new AbortController().signal
  mock.method(globalThis, 'fetch', async (path, options) => {
    const url = new URL(path, 'http://localhost')
    assert.equal(url.pathname, '/api/location/parsed')
    assert.equal(url.searchParams.get('query'), 'A & B #1')
    assert.equal(options.signal, signal)
    return Response.json({ name: 'A & B #1', latitude: 1.3, longitude: 103.8 })
  })
  assert.equal((await searchLocation('A & B #1', signal)).latitude, 1.3)
})

test('routes send coordinates and an offset-aware departure time', async () => {
  mock.method(globalThis, 'fetch', async (path) => {
    const url = new URL(path, 'http://localhost')
    assert.equal(url.pathname, '/api/route/parsed')
    assert.equal(url.searchParams.get('originLat'), '1.3')
    assert.equal(url.searchParams.get('originLon'), '103.8')
    assert.equal(url.searchParams.get('destinationLat'), '1.4')
    assert.equal(url.searchParams.get('destinationLon'), '103.9')
    assert.match(url.searchParams.get('departureTime'), /Z$/)
    return Response.json([])
  })
  assert.deepEqual(await searchRoutes(
    { latitude: 1.3, longitude: 103.8 }, { latitude: 1.4, longitude: 103.9 },
  ), [])
})

test('backend errors are shown to the caller', async () => {
  mock.method(globalThis, 'fetch', async () => Response.json({ message: 'Location not found' }, { status: 400 }))
  await assert.rejects(searchLocation('unknown'), /Location not found/)
})

test('unavailable proxy and network errors have useful messages', async () => {
  const fetch = mock.method(globalThis, 'fetch', async () => new Response('', { status: 502 }))
  await assert.rejects(searchLocation('test'), /Check the backend/)
  fetch.mock.mockImplementation(async () => { throw new TypeError('Failed to fetch') })
  await assert.rejects(searchLocation('test'), /Cannot reach the backend/)
})

test('aborted searches stay aborted', async () => {
  mock.method(globalThis, 'fetch', async () => { throw new DOMException('Aborted', 'AbortError') })
  await assert.rejects(searchLocation('test'), { name: 'AbortError' })
})
