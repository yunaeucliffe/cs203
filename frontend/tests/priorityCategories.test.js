import { test } from 'node:test'
import assert from 'node:assert/strict'
import { priorityCategory, selectPriorityCategory } from '../src/utils/priorityCategories.js'

test('maps all category boundaries and defaults', () => {
  for (const [score, category] of [[0, 'Low'], [20, 'Low'], [33, 'Low'], [34, 'Medium'], [50, 'Medium'], [66, 'Medium'], [67, 'High'], [100, 'High']]) {
    assert.equal(priorityCategory(score), category)
  }
  for (const score of [null, undefined, NaN, -1, 101]) assert.equal(priorityCategory(score), 'Unavailable')
})

test('changes categories using numerical representatives and preserves exact learned scores', () => {
  assert.equal(selectPriorityCategory(72, 'High'), 72)
  assert.equal(selectPriorityCategory(33, 'Low'), 33)
  assert.equal(selectPriorityCategory(61, 'Medium'), 61)
  assert.equal(selectPriorityCategory(72, 'Low'), 20)
  assert.equal(selectPriorityCategory(72, 'Medium'), 50)
  assert.equal(selectPriorityCategory(20, 'High'), 80)
  assert.equal(selectPriorityCategory(72, 'Unknown'), 72)
})
