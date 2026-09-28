import { afterEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { searchRoutes, searchLocation } from '../src/api/routes.js'

const originalFetch = globalThis.fetch
afterEach(() => { globalThis.fetch = originalFetch })
const origin = { name: 'Current location', latitude: 1.3, longitude: 103.8 }
const destination = { name: 'Hospital', latitude: 1.31, longitude: 103.81 }
const ok = body => ({ ok: true, status: 200, json: async () => body })

test('posts authenticated coordinates and CSRF; preserves ranking, reasons and warnings', async () => {
  const calls = []
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options })
    if (url.endsWith('/csrf')) return ok({ token: 'session-token' })
    return ok({ recommendedRoute: { id: 'best', reasons: ['Less walking'] },
      alternatives: [{ id: 'next' }], warnings: ['Rain unavailable'], engine: 'openai:test' })
  }
  const signal = new AbortController().signal
  const result = await searchRoutes(origin, destination, signal)
  assert.deepEqual(result.routes.map(route => route.id), ['best', 'next'])
  assert.deepEqual(result.routes[0].reasons, ['Less walking'])
  assert.deepEqual(result.warnings, ['Rain unavailable'])
  assert.equal(calls[1].url, 'http://localhost:8081/api/route-recommendations')
  assert.equal(calls[1].options.credentials, 'include')
  assert.equal(calls[1].options.headers['X-XSRF-TOKEN'], 'session-token')
  assert.equal(calls[0].options.signal, signal)
  assert.equal(calls[1].options.signal, signal)
  const payload = JSON.parse(calls[1].options.body)
  assert.deepEqual(payload.originCoordinates, { latitude: 1.3, longitude: 103.8 })
  assert.equal(payload.preferences, undefined)
  assert.ok(Number.isFinite(Date.parse(payload.departureTime)))
})

test('supports one candidate and rejects duplicate or absent recommendations', async () => {
  for (const result of [
    { recommendedRoute: { id: 'only' }, alternatives: [] },
    { recommendedRoute: { id: 'same' }, alternatives: [{ id: 'same' }] },
    { alternatives: [] },
  ]) {
    globalThis.fetch = async url => ok(url.endsWith('/csrf') ? { token: 'token' } : result)
    if (result.recommendedRoute?.id === 'only') assert.equal((await searchRoutes(origin, destination)).routes.length, 1)
    else await assert.rejects(searchRoutes(origin, destination), /invalid/)
  }
})

test('shows expired session and provider errors without substituting raw routes', async () => {
  for (const [status, message, expected] of [[401, null, /Sign in again/], [403, null, /Refresh the page/], [502, 'OpenAI is unavailable', /OpenAI is unavailable/]]) {
    globalThis.fetch = async url => url.endsWith('/csrf') ? ok({ token: 'token' }) :
      { ok: false, status, json: async () => ({ message }) }
    await assert.rejects(searchRoutes(origin, destination), expected)
  }
})

test('cancelling the CSRF request prevents the ranking request', async () => {
  let requests = 0
  globalThis.fetch = async () => { requests++; throw new DOMException('Aborted', 'AbortError') }
  await assert.rejects(searchRoutes(origin, destination), { name: 'AbortError' })
  assert.equal(requests, 1)
})

test('location lookup uses the backend origin', async () => {
  globalThis.fetch = async url => {
    assert.equal(url, 'http://localhost:8081/api/location/parsed?query=Jurong+East')
    return ok(origin)
  }
  assert.deepEqual(await searchLocation('Jurong East'), origin)
})

test('place names go directly to recommendations without separate geocoding', async () => {
  const calls = []
  globalThis.fetch = async (url, options) => {
    calls.push(url)
    if (url.endsWith('/csrf')) return ok({ token: 'token' })
    const payload = JSON.parse(options.body)
    assert.equal(payload.origin, 'Jurong East MRT')
    assert.equal(payload.originCoordinates, undefined)
    assert.equal(payload.destinationCoordinates, undefined)
    return ok({ recommendedRoute: { id: 'mock-route', legs: [] }, alternatives: [] })
  }
  const result = await searchRoutes({ name: 'Jurong East MRT' }, { name: 'Hospital' })
  assert.equal(result.routes.length, 1)
  assert.equal(calls.length, 2)
})
