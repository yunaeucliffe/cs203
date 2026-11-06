export function isValidWalkingDistance(value) {
  return Number.isInteger(value) && value >= 100 && value <= 5000
}

export function walkingPreferenceError(values) {
  return isValidWalkingDistance(values.walkingOnlyMaxDistanceMeters)
    ? '' : 'Enter a whole-number walking limit between 100 and 5,000 metres.'
}

export function editWalkingPreferences(values, change, lastValidDistance = 500) {
  const currentDistance = values.walkingOnlyMaxDistanceMeters
  const fallback = isValidWalkingDistance(currentDistance) ? currentDistance
    : isValidWalkingDistance(lastValidDistance) ? lastValidDistance : 500
  const next = { ...values, ...change }
  if (!next.walkingOnlyEnabled && !isValidWalkingDistance(next.walkingOnlyMaxDistanceMeters)) {
    next.walkingOnlyMaxDistanceMeters = fallback
  }
  return {
    values: next,
    lastValidDistance: isValidWalkingDistance(next.walkingOnlyMaxDistanceMeters)
      ? next.walkingOnlyMaxDistanceMeters : fallback,
  }
}
