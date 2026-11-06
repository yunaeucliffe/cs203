export function walkingPreferenceError(values) {
  const limit = values.walkingOnlyMaxDistanceMeters
  return !Number.isInteger(limit) || limit < 100 || limit > 5000
    ? 'Enter a whole-number walking limit between 100 and 5,000 metres.' : ''
}
