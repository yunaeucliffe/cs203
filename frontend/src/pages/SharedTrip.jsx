import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Marker, Polyline, Popup, useMap } from 'react-leaflet'
import { API_URL } from '../api'
import { formatRouteSummary, updatedAgo, routeLines } from '../utils/tripSharing'
import { createDestinationIcon } from '../utils/mapIcons'
import 'leaflet/dist/leaflet.css'

const destinationIcon = createDestinationIcon({ size: 24, shadow: true })

function formatDateTime(value) {
  return new Date(value).toLocaleString('en-SG', {
    timeZone: 'Asia/Singapore',
    day: 'numeric', month: 'short', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  })
}

function FollowLocation({ latitude, longitude, following, onFollowingChange }) {
  const map = useMap()
  // Dragging the map means the viewer is looking elsewhere, so stop pulling the view back.
  useEffect(() => {
    const stopFollowing = () => onFollowingChange(false)
    map.on('dragstart', stopFollowing)
    return () => map.off('dragstart', stopFollowing)
  }, [map, onFollowingChange])
  useEffect(() => { if (following) map.panTo([latitude, longitude]) }, [map, following, latitude, longitude])
  return null
}

// Keeps the whole journey in view. `points` only changes when the route or the view mode does,
// so a five-second poll can't keep snapping the map back while it is being read.
function FitRoute({ points }) {
  const map = useMap()
  useEffect(() => {
    if (points.length > 0) map.fitBounds(points, { padding: [30, 30], maxZoom: 16 })
  }, [map, points])
  return null
}

export default function SharedTrip({ token }) {
  const [trip, setTrip] = useState(null)
  const [message, setMessage] = useState('Loading shared trip...')
  const [now, setNow] = useState(() => Date.now())
  const [openedAt] = useState(() => Date.now())
  // Kept out of `trip` so its array identity survives polling; the route of a share never changes.
  const [route, setRoute] = useState([])
  const [following, setFollowing] = useState(false)
  useEffect(() => {
    let cancelled = false
    let busy = false
    async function refresh() {
      if (busy) return
      busy = true
      try {
        // Time out so a stalled request can't keep blocking new polls.
        const response = await fetch(`${API_URL}/api/shared-trips/${encodeURIComponent(token)}`, {
          cache: 'no-store', signal: AbortSignal.timeout(10000),
        })
        if (!response.ok) {
          const error = new Error(response.status === 410 ? 'They have arrived. Trip sharing has ended.'
            : response.status === 404 ? 'This sharing link is invalid, expired, or has been stopped.'
              : 'Unable to check sharing. Please try again.')
          error.status = response.status
          throw error
        }
        const data = await response.json()
        if (!cancelled) {
          setTrip(data)
          setMessage('')
          // Keeping the same array when there is nothing new to draw stops the map refitting on a poll.
          setRoute(current => {
            if (current.length > 0) return current
            const lines = routeLines(data.routePath)
            return lines.length > 0 ? lines : current
          })
        }
      } catch (error) {
        const offline = error.name === 'TypeError' || error.name === 'TimeoutError'
        if (!cancelled) {
          if (error.status === 404 || error.status === 410) setTrip(null)
          setMessage(offline ? 'Unable to check sharing. Check your connection.' : error.message)
        }
      } finally { busy = false }
    }
    refresh()
    // Every 5 seconds: move the clock (expiry, "outdated", "last updated") even if a request
    // is still pending, then poll unless the previous request hasn't finished.
    const poll = setInterval(() => { setNow(Date.now()); refresh() }, 5000)
    return () => { cancelled = true; clearInterval(poll) }
  }, [token])
  const active = trip && new Date(trip.expiresAt).getTime() > now
  const hasLocation = active && Number.isFinite(trip.latitude) && Number.isFinite(trip.longitude)
  const outdated = hasLocation && (Boolean(message) || now - new Date(trip.locationUpdatedAt).getTime() > 60000)
  // No first location within 60 seconds of opening (e.g. no GPS signal indoors).
  const noLocationYet = active && trip.liveLocation && !hasLocation && now - openedAt > 60000
  const arrivalPassed = active && new Date(trip.estimatedArrival).getTime() <= now
  const hasRoute = Boolean(active && route.length > 0)
  const start = hasRoute ? route[0][0] : null
  const end = hasRoute ? route.at(-1).at(-1) : null
  // Without a route there is nothing else to look at, so an older share keeps following the dot.
  const followingLocation = Boolean(hasLocation && (following || !hasRoute))
  // Empty while following, so the map pans with the traveller instead of refitting the route.
  const fitPoints = useMemo(() => followingLocation ? [] : route.flat(), [followingLocation, route])
  const card = 'rounded-[24px] border border-[#7A7F7A]/20 bg-white p-5 sm:p-6'
  return <main className="min-h-screen bg-[#FAF7F0] px-4 py-8 text-[#2A3439] sm:px-6">
    <div className="mx-auto max-w-3xl space-y-5">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-[#555C60]">SilverRoute</p>
        <h1 className="text-2xl font-semibold sm:text-3xl">Shared trip</h1>
      </header>
      {!active ? <section className={`${card} text-lg`} role="status">{message || 'This sharing link has expired.'}</section> : <>
        <section className={card}>
          <h2 className="text-xl font-semibold">{trip.origin} → {trip.destination}</h2>
          <p className="mt-1 text-[#555C60]">{formatRouteSummary(trip.routeSummary)}</p>
          <div className="mt-4 rounded-xl bg-[#FAF7F0] p-4">
            <p className="text-sm text-[#555C60]">{arrivalPassed ? 'Expected to arrive by' : 'Estimated arrival'}</p>
            <p className="text-lg font-semibold">{formatDateTime(trip.estimatedArrival)} <span className="text-sm font-normal text-[#555C60]">Singapore time</span></p>
            {arrivalPassed && <p className="mt-1 text-sm">They have not confirmed arrival yet.</p>}
          </div>
        </section>
        <section className={card}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">{trip.liveLocation ? 'Route and live location' : 'Route'}</h2>
            {(hasLocation || noLocationYet) && <span className={`rounded-full px-3 py-1 text-sm font-semibold ${outdated || noLocationYet ? 'bg-amber-100 text-amber-900' : 'bg-[#DCE7D2]'}`}>
              {noLocationYet ? 'No location yet' : outdated ? 'Outdated' : 'Live'}
            </span>}
          </div>
          {!trip.liveLocation ? <p className="mt-2 text-[#555C60]">
            Live location is not shared for this trip.{hasRoute ? ' Their planned route is shown below.' : ''}
          </p> : <>
            {message && <p role="status" className="mt-2 text-amber-900">Updates unavailable. Showing the last known location.</p>}
            <p role="status" className="mt-2 text-[#555C60]">{hasLocation
              ? `${outdated && !message ? 'Updates have stopped. ' : ''}Last updated ${updatedAgo(trip.locationUpdatedAt, now)}.`
              : noLocationYet
                ? 'No location has been received yet. Their phone may have no GPS signal (for example indoors) or location may be turned off.'
                : 'Waiting for the first location update.'}</p>
          </>}
          {(hasRoute || hasLocation) && <>
            <MapContainer center={hasLocation ? [trip.latitude, trip.longitude] : start} zoom={16} className="mt-4 h-80 w-full rounded-xl sm:h-96">
              <TileLayer url="https://www.onemap.gov.sg/maps/tiles/Default/{z}/{x}/{y}.png" attribution="&copy; OneMap contributors" />
              <FitRoute points={fitPoints} />
              {hasLocation && <FollowLocation latitude={trip.latitude} longitude={trip.longitude}
                following={followingLocation} onFollowingChange={setFollowing} />}
              {/* The planned route: a white casing under a blue line, as in Navigation. */}
              {hasRoute && <>
                <Polyline positions={route} pathOptions={{ color: 'white', weight: 10, lineCap: 'round', lineJoin: 'round' }} />
                <Polyline positions={route} pathOptions={{ color: '#2F6FED', weight: 6, lineCap: 'round', lineJoin: 'round' }} />
                <CircleMarker center={start} radius={7} pathOptions={{ color: 'white', weight: 3, fillColor: '#3E424B', fillOpacity: 1 }}>
                  <Popup>Starting point: {trip.origin}</Popup>
                </CircleMarker>
                <Marker position={end} icon={destinationIcon}><Popup>Destination: {trip.destination}</Popup></Marker>
              </>}
              {hasLocation && <CircleMarker center={[trip.latitude, trip.longitude]} radius={10}
                pathOptions={{ color: 'white', weight: 3, fillColor: outdated ? '#777' : '#2F6FED', fillOpacity: 1 }}>
                <Popup>Latest shared location</Popup>
              </CircleMarker>}
            </MapContainer>
            {hasRoute && <p className="mt-3 text-sm text-[#555C60]">
              The blue line is their planned route, ending at the red dot.{hasLocation ? ' The blue dot is where they are now.' : ''}
            </p>}
            {hasRoute && hasLocation && <button type="button" onClick={() => setFollowing(!followingLocation)}
              className="mt-3 min-h-12 w-full rounded-xl border border-[#7A7F7A]/40 bg-white px-5 font-semibold hover:bg-[#FAF7F0] focus-visible:outline-2 focus-visible:outline-offset-2 sm:w-auto">
              {followingLocation ? 'Show whole route' : 'Follow their location'}
            </button>}
          </>}
        </section>
      </>}
    </div>
  </main>
}
