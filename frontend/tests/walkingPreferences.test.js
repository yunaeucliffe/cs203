import { test } from 'node:test'
import assert from 'node:assert/strict'
import { walkingPreferenceError, editWalkingPreferences } from '../src/utils/walkingPreferences.js'

test('walking limit accepts whole metres at the boundaries and rejects blank or fractional values', () => {
  for (const value of [100, 500, 5000]) assert.equal(walkingPreferenceError({ walkingOnlyMaxDistanceMeters: value }), '')
  for (const value of ['', null, 99, 5001, 100.5, NaN]) assert.notEqual(walkingPreferenceError({ walkingOnlyMaxDistanceMeters: value }), '')
})

for (const [screen, initialDistance] of [['profile', 1200], ['onboarding', 500]]) {
  test(`${screen}: disabling after invalid input restores the last valid distance for saving`, () => {
    for (const invalid of ['', 99, 5001, 100.5]) {
      const initial = { walkingOnlyEnabled: true, walkingOnlyMaxDistanceMeters: initialDistance,
        minimizeWalkingPriority: 72, shelterPriority: 20, automaticLearning: true }
      let state = editWalkingPreferences(initial, { walkingOnlyMaxDistanceMeters: invalid })
      assert.notEqual(walkingPreferenceError(state.values), '')
      state = editWalkingPreferences(state.values, { walkingOnlyEnabled: false }, state.lastValidDistance)
      assert.equal(walkingPreferenceError(state.values), '')
      assert.equal(state.values.walkingOnlyMaxDistanceMeters, initialDistance)
      assert.equal(state.values.minimizeWalkingPriority, 72)
      const saved = JSON.parse(JSON.stringify(state.values))
      assert.equal(saved.walkingOnlyEnabled, false)
      assert.equal(saved.walkingOnlyMaxDistanceMeters, initialDistance)
      state = editWalkingPreferences(state.values, { walkingOnlyEnabled: true }, state.lastValidDistance)
      assert.equal(state.values.walkingOnlyMaxDistanceMeters, initialDistance)
    }
  })
}

test('valid edits become the fallback and remain unchanged when toggling', () => {
  let state = { values: { walkingOnlyEnabled: true, walkingOnlyMaxDistanceMeters: 500 }, lastValidDistance: 500 }
  for (const distance of [100, 1500, 5000]) {
    state = editWalkingPreferences(state.values, { walkingOnlyMaxDistanceMeters: distance }, state.lastValidDistance)
    state = editWalkingPreferences(state.values, { walkingOnlyEnabled: false }, state.lastValidDistance)
    assert.equal(state.values.walkingOnlyMaxDistanceMeters, distance)
    state = editWalkingPreferences(state.values, { walkingOnlyEnabled: true }, state.lastValidDistance)
    state = editWalkingPreferences(state.values, { walkingOnlyMaxDistanceMeters: '' }, state.lastValidDistance)
    state = editWalkingPreferences(state.values, { walkingOnlyEnabled: false }, state.lastValidDistance)
    assert.equal(state.values.walkingOnlyMaxDistanceMeters, distance)
    state = editWalkingPreferences(state.values, { walkingOnlyEnabled: true }, state.lastValidDistance)
  }
})

test('missing or invalid initial distances fall back to 500 metres', () => {
  for (const distance of [undefined, null, '', 99]) {
    const state = editWalkingPreferences({ walkingOnlyEnabled: true, walkingOnlyMaxDistanceMeters: distance },
      { walkingOnlyEnabled: false }, distance)
    assert.equal(state.values.walkingOnlyMaxDistanceMeters, 500)
    assert.equal(walkingPreferenceError(state.values), '')
  }
})
