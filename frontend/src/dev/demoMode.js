// Journey simulation is a presenter's tool, not a feature, so it stays off unless it is
// switched on for the session. Production builds (including Vercel) must be able to turn it
// on without a rebuild, so the switch is a URL flag that is remembered in this browser:
//
//   https://silverroute.example/?demo=1   switch on (remembered on this device)
//   https://silverroute.example/?demo=0   switch off and forget
//
// A deployment that exists only to demo can set VITE_DEMO_MODE=true instead.
const STORAGE_KEY = 'silverroute.demoMode'

const OFF = new Set(['0', 'false', 'off', 'no'])

function urlFlag() {
  if (typeof window === 'undefined') return null
  // Routes live in the hash (see App.jsx), so accept the flag from either place.
  const hash = window.location.hash
  const query = hash.includes('?') ? hash.slice(hash.indexOf('?')) : ''
  const value = new URLSearchParams(window.location.search).get('demo')
    ?? new URLSearchParams(query).get('demo')
  return value === null ? null : !OFF.has(value.toLowerCase())
}

function remembered() {
  try {
    return window.localStorage?.getItem(STORAGE_KEY) === 'on'
  } catch {
    // Private browsing can refuse storage; the URL flag still works for this page load.
    return false
  }
}

function remember(on) {
  try {
    if (on) window.localStorage?.setItem(STORAGE_KEY, 'on')
    else window.localStorage?.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

const flag = urlFlag()
if (flag !== null) remember(flag)

const configured = String(import.meta.env?.VITE_DEMO_MODE ?? '').toLowerCase() === 'true'

export const DEMO_MODE = flag ?? (configured || remembered())
