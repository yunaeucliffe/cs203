const JOURNEY_GRACE_PERIOD_MS = 2 * 60 * 60 * 1000
const FALLBACK_DURATION_MINUTES = 60

export function loadActiveJourney() {
  try {
    const journey = JSON.parse(localStorage.getItem('activeJourney'))

    if (!journey) return null

    const startedAt = Number(journey.startedAt)
    const duration = journey.route?.durationMinutes

    if (!Number.isFinite(startedAt) || startedAt <= 0) {
      localStorage.removeItem('activeJourney')
      return null
    }

    const durationMinutes =
      Number.isFinite(duration) && duration > 0
        ? duration
        : FALLBACK_DURATION_MINUTES

    const expiresAt =
      startedAt +
      durationMinutes * 60 * 1000 +
      JOURNEY_GRACE_PERIOD_MS

    if (Date.now() >= expiresAt) {
      localStorage.removeItem('activeJourney')
      return null
    }

    return journey
  } catch {
    localStorage.removeItem('activeJourney')
    return null
  }
}