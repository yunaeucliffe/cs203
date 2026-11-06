import { test } from 'node:test'
import assert from 'node:assert/strict'
import { walkingPreferenceError } from '../src/utils/walkingPreferences.js'

test('walking limit accepts whole metres at the boundaries and rejects blank or fractional values', () => {
  for (const value of [100, 500, 5000]) assert.equal(walkingPreferenceError({ walkingOnlyMaxDistanceMeters: value }), '')
  for (const value of ['', null, 99, 5001, 100.5, NaN]) assert.notEqual(walkingPreferenceError({ walkingOnlyMaxDistanceMeters: value }), '')
})
