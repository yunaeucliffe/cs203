import { useCallback, useEffect, useRef, useState } from 'react'

// Phones only: desktops have no compass, and a mouse pointer means a desktop.
const PHONE = '(max-width: 768px) and (pointer: coarse)'

// Ignore sub-degree jitter; the cone only needs to be roughly right, and every
// update rebuilds the Leaflet marker.
const MIN_TURN_DEGREES = 2

function shortestTurn(from, to) {
  return Math.abs(((to - from + 540) % 360) - 180)
}

// Tracks which way the phone is facing (0 = north). iOS Safari and recent Chrome only
// allow compass access when asked during a tap, so call start() from a click handler.
export function useCompassHeading() {
  const [heading, setHeading] = useState(null)
  const listeners = useRef(null)

  const stop = useCallback(() => {
    if (!listeners.current) return
    window.removeEventListener('deviceorientation', listeners.current.ios)
    window.removeEventListener('deviceorientationabsolute', listeners.current.absolute)
    listeners.current = null
    setHeading(null)
  }, [])

  const start = useCallback(async () => {
    if (!window.matchMedia(PHONE).matches) return
    stop()

    const OrientationEvent = window.DeviceOrientationEvent

    // Some browsers, including iOS Safari, require permission.
    if (typeof OrientationEvent?.requestPermission === 'function') {
      try {
        const permission = await OrientationEvent.requestPermission()
        if (permission !== 'granted') return
      } catch {
        return
      }
    }

    const update = (degrees) => {
      const next = Math.round(degrees) % 360
      setHeading(current =>
        current === null || shortestTurn(current, next) >= MIN_TURN_DEGREES ? next : current
      )
    }

    let hasAbsoluteEvent = false

    const ios = (event) => {
      // iOS: use the actual compass heading.
      if (Number.isFinite(event.webkitCompassHeading) && event.webkitCompassHeading >= 0) {
        update(event.webkitCompassHeading)
        return
      }
      // Android browsers without deviceorientationabsolute still report north-relative
      // angles here when the reading is absolute.
      if (!hasAbsoluteEvent && event.absolute && Number.isFinite(event.alpha)) {
        update((360 - event.alpha) % 360)
      }
    }

    // Android/Chrome: use absolute orientation, not GPS movement.
    const absolute = (event) => {
      if (!Number.isFinite(event.alpha)) return
      hasAbsoluteEvent = true
      update((360 - event.alpha) % 360)
    }

    window.addEventListener('deviceorientation', ios)
    window.addEventListener('deviceorientationabsolute', absolute)
    listeners.current = { ios, absolute }
  }, [stop])

  useEffect(() => stop, [stop])

  return { heading, start, stop }
}
