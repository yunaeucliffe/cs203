import { afterEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { deleteAccount } from '../src/api/account.js'

const originalFetch = globalThis.fetch
afterEach(() => { globalThis.fetch = originalFetch })
const csrf = { ok: true, status: 200, json: async () => ({ token: 'token' }) }

test('account deletion sends an authenticated DELETE with the CSRF token', async () => {
  let request
  globalThis.fetch = async (url, options) => {
    if (url.endsWith('/csrf')) return csrf
    request = { url, ...options }
    return { ok: true, status: 204 }
  }
  await deleteAccount()
  assert.equal(request.url, 'http://localhost:8081/api/users/me')
  assert.equal(request.method, 'DELETE')
  assert.equal(request.credentials, 'include')
  assert.equal(request.headers['X-XSRF-TOKEN'], 'token')
})

test('account deletion failures reject with a message the user can act on', async () => {
  const respond = status => async url => url.endsWith('/csrf') ? csrf : { ok: false, status }
  globalThis.fetch = respond(500)
  await assert.rejects(deleteAccount(), { message: 'Unable to delete your account. Please try again.' })
  globalThis.fetch = respond(401)
  await assert.rejects(deleteAccount(), { message: 'Your session has expired. Please sign in again.' })
  globalThis.fetch = async () => { throw new TypeError('Failed to fetch') }
  await assert.rejects(deleteAccount(), { message: 'Unable to delete your account. Please try again.' })
})
