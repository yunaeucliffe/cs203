export const PRIORITY_CATEGORIES = ['Low', 'Medium', 'High']
const CATEGORY_VALUES = { Low: 20, Medium: 50, High: 80 }

export function priorityCategory(score) {
  if (!Number.isFinite(score) || score < 0 || score > 100) return 'Unavailable'
  return score <= 33 ? 'Low' : score <= 66 ? 'Medium' : 'High'
}

export function selectPriorityCategory(currentScore, category) {
  if (!Object.hasOwn(CATEGORY_VALUES, category)) return currentScore
  return priorityCategory(currentScore) === category ? currentScore : CATEGORY_VALUES[category]
}
