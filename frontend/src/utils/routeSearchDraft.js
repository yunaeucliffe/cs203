const DRAFT_KEY = 'routeSearchDraft'

export function loadRouteSearchDraft() {
  try {
    return JSON.parse(localStorage.getItem(DRAFT_KEY)) || null
  } catch {
    return null
  }
}

export function saveRouteSearchDraft(draft) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
  } catch (error) {
    console.error('Unable to save route search draft:', error)
  }
}

export function clearRouteSearchDraft() {
  localStorage.removeItem(DRAFT_KEY)
}