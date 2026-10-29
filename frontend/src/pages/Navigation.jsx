import { useEffect, useState } from 'react'
import L from 'leaflet'
import { TripSharingButton } from '../components/TripSharing'

import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  Circle,
  CircleMarker,
  Popup,
  useMap,
} from 'react-leaflet'

import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Plus,
  Minus,
  Footprints,
  Bus,
  Train,
  MapPin,
  X,
} from 'lucide-react'

import 'leaflet/dist/leaflet.css'

function hasCoordinates(location) {
  return (
    Number.isFinite(location?.latitude) &&
    Number.isFinite(location?.longitude)
  )
}

function formatDistance(meters) {
  if (meters == null || !Number.isFinite(Number(meters))) {
    return '—'
  }

  const distance = Number(meters)

  return distance >= 1000
    ? `${(distance / 1000).toFixed(1)} km`
    : `${Math.round(distance)} m`
}

function getMode(leg) {
  const mode = String(leg?.mode || '').toUpperCase()

  if (mode.includes('WALK')) return 'WALK'
  if (mode.includes('BUS')) return 'BUS'

  if (
    ['TRAIN', 'MRT', 'LRT', 'RAIL', 'SUBWAY'].some(
      type => mode.includes(type)
    )
  ) {
    return 'TRAIN'
  }

  return 'OTHER'
}

function getInstruction(leg) {
  const mode = getMode(leg)
  const destination = leg.to?.name

  if (mode === 'WALK') {
    return destination
      ? `Walk to ${destination}`
      : 'Walk to the next stop'
  }

  if (mode === 'BUS') {
    return leg.service
      ? `Take Bus ${leg.service}${destination ? ` to ${destination}` : ''}`
      : `Take the bus${destination ? ` to ${destination}` : ''}`
  }

  if (mode === 'TRAIN') {
    return leg.service
      ? `Take ${leg.service}${destination ? ` to ${destination}` : ''}`
      : `Take the train${destination ? ` to ${destination}` : ''}`
  }

  return destination
    ? `Continue to ${destination}`
    : 'Continue your journey'
}

function ModeIcon({ mode, size = 22 }) {
  if (mode === 'WALK') return <Footprints size={size} />
  if (mode === 'BUS') return <Bus size={size} />
  if (mode === 'TRAIN') return <Train size={size} />

  return <MapPin size={size} />
}

function FitNavigationRoute({ paths, start, end }) {
  const map = useMap()

  useEffect(() => {
    const points = paths.flat()

    if (hasCoordinates(start)) {
      points.push([start.latitude, start.longitude])
    }

    if (hasCoordinates(end)) {
      points.push([end.latitude, end.longitude])
    }

    if (points.length > 0) {
      map.fitBounds(points, {
        paddingTopLeft: [40, 90],
        paddingBottomRight: [40, 320],
        maxZoom: 16,
      })
    }
  }, [map, paths, start, end])

  return null
}

function ResizeNavigationMap() {
  const map = useMap()
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize({ pan: false }))
    observer.observe(map.getContainer())
    return () => observer.disconnect()
  }, [map])
  return null
}

function LiveLocation({ location, following, onFollowingChange }) {
  const map = useMap()

  useEffect(() => {
    const stopFollowing = () => onFollowingChange(false)
    map.on('dragstart', stopFollowing)
    return () => map.off('dragstart', stopFollowing)
  }, [map, onFollowingChange])

  useEffect(() => {
    if (following && location) {
      map.setView([location.latitude, location.longitude], Math.max(map.getZoom(), 16))
    }
  }, [map, location, following])

  if (!location) return null

  return <>
    <Circle center={[location.latitude, location.longitude]} radius={location.accuracy}
      pathOptions={{ color: '#2F6FED', weight: 1, fillOpacity: 0.1 }} />
    <CircleMarker center={[location.latitude, location.longitude]} radius={9}
      pathOptions={{ color: 'white', weight: 3, fillColor: '#2F6FED', fillOpacity: 1 }}>
      <Popup>Your location · accuracy ±{Math.round(location.accuracy)} m</Popup>
    </CircleMarker>
  </>
}

function MapControls({ start, end, paths, location, following, onFollowingChange }) {
  const map = useMap()

  const showEntireRoute = () => {
    onFollowingChange(false)
    const points = paths.flat()
    if (hasCoordinates(start)) points.push([start.latitude, start.longitude])
    if (hasCoordinates(end)) points.push([end.latitude, end.longitude])
    if (points.length > 0) map.fitBounds(points, { padding: [60, 60], maxZoom: 16 })
  }

  return <div className="absolute right-5 top-5 z-[1000] flex flex-col gap-3">
    <button type="button" onClick={() => onFollowingChange(true)} disabled={!location}
      aria-label="Follow my location" aria-pressed={following}
      className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-md disabled:opacity-50">
      <span aria-hidden="true" className="h-5 w-5 rounded-full border-2 border-white bg-[#2F6FED] ring-1 ring-[#2F6FED]" />
    </button>
    <button type="button" onClick={showEntireRoute} aria-label="Show entire route"
      className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-md">
      <span aria-hidden="true" className="h-5 w-5 rounded-full border-2 border-white bg-[#C83232] ring-1 ring-[#C83232]" />
    </button>
    <button type="button" aria-label="Zoom in" onClick={() => { onFollowingChange(false); map.zoomIn() }}
      className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-md hover:bg-[#FAF7F0]">
      <Plus size={24} aria-hidden="true" />
    </button>
    <button type="button" aria-label="Zoom out" onClick={() => { onFollowingChange(false); map.zoomOut() }}
      className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-md hover:bg-[#FAF7F0]">
      <Minus size={24} aria-hidden="true" />
    </button>
  </div>
}

const destinationIcon = L.divIcon({
  className: '',
  html: `
    <div style="
      width: 30px;
      height: 30px;
      background: #e53935;
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    "></div>
  `,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
})

function Navigation({
  route,
  origin,
  destination,
  onBack,
  onEnd,
}) {
  const [sidebarHidden, setSidebarHidden] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [location, setLocation] = useState(null)
  const [locationError, setLocationError] = useState('')
  const [following, setFollowing] = useState(true)

  useEffect(() => {
    if (!navigator.geolocation) return
    let active = true
    const watch = navigator.geolocation.watchPosition(({ coords, timestamp }) => {
      if (!active) return
      setLocation({ latitude: coords.latitude, longitude: coords.longitude,
        accuracy: coords.accuracy, timestamp })
      setLocationError('')
    }, error => {
      if (!active) return
      setLocationError(error.code === 1
        ? 'Location permission is blocked. Allow location access in your browser to follow your journey.'
        : error.code === 3
          ? 'Location update timed out. Waiting for a new GPS fix…'
          : 'Your location is unavailable. Waiting for a GPS signal…')
    }, { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 })
    const timer = window.setInterval(() => {
      setLocation(current => current && Date.now() - current.timestamp > 30000 ? null : current)
    }, 5000)
    return () => {
      active = false
      navigator.geolocation.clearWatch(watch)
      window.clearInterval(timer)
    }
  }, [])

  const paths = route?.routePaths || []
  const legs = route?.legs || []

  const start = legs[0]?.from || origin
  const end = legs.at(-1)?.to || destination

  return (
    <div className={`relative h-dvh w-full overflow-hidden bg-[#FAF7F0] text-[#2A3439] ${sidebarHidden ? '' : 'lg:grid lg:grid-cols-[400px_minmax(0,1fr)] xl:grid-cols-[440px_minmax(0,1fr)]'}`}>

      <div className="relative h-full min-w-0 lg:col-start-2 lg:row-start-1">
      {/* NAVIGATION MAP */}
      <MapContainer
        center={[1.3521, 103.8198]}
        zoom={13}
        scrollWheelZoom
        zoomControl={false}
        className="h-full w-full"
      >
        <ResizeNavigationMap />
        <TileLayer
          url="https://www.onemap.gov.sg/maps/tiles/Default/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.onemap.gov.sg/">OneMap</a> contributors'
        />

        <FitNavigationRoute
          paths={paths}
          start={start}
          end={end}
        />

        <MapControls
          paths={paths}
          start={start}
          end={end}
          location={location}
          following={following}
          onFollowingChange={setFollowing}
        />
        <LiveLocation location={location} following={following} onFollowingChange={setFollowing} />

        {/* DESTINATION MARKER */}
        {hasCoordinates(end) && (
          <Marker
            position={[end.latitude, end.longitude]}
            icon={destinationIcon}
          >
            <Popup>{destination?.name || 'Destination'}</Popup>
          </Marker>
        )}

        {/* HIGHLIGHTED ROUTE */}
        {paths.length > 0 && (
          <>
            <Polyline
              positions={paths}
              pathOptions={{
                color: 'white',
                weight: 10,
                opacity: 0.95,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />

            <Polyline
              positions={paths}
              pathOptions={{
                color: '#2F6FED',
                weight: 6,
                opacity: 0.95,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          </>
        )}
      </MapContainer>

      {sidebarHidden && (
        <button type="button" onClick={onBack}
          className="absolute left-5 top-5 z-[1000] flex min-h-12 items-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold shadow-md hover:bg-[#FAF7F0]">
          <ArrowLeft size={20} aria-hidden="true" /> Back
        </button>
      )}

      </div>

      <button type="button" onClick={() => setSidebarHidden(hidden => !hidden)}
        aria-label={sidebarHidden ? 'Show directions' : 'Hide directions'}
        title={sidebarHidden ? 'Show directions' : 'Hide directions'}
        aria-expanded={!sidebarHidden} aria-controls="journey-sidebar"
        className={`absolute left-0 top-1/2 z-[1100] flex h-16 w-12 -translate-y-1/2 items-center justify-center rounded-r-xl border border-l-0 border-[#7A7F7A]/20 bg-white text-[#3E424B] shadow-md hover:bg-[#FAF7F0] focus-visible:outline-2 focus-visible:outline-offset-2 ${sidebarHidden ? '' : 'lg:left-[400px] xl:left-[440px]'}`}>
        {sidebarHidden ? <ChevronRight size={28} aria-hidden="true" /> : <ChevronLeft size={28} aria-hidden="true" />}
      </button>

      {/* JOURNEY SIDEBAR; COLLAPSIBLE PANEL ON MOBILE */}
      {!sidebarHidden && <section id="journey-sidebar" aria-label="Journey directions" className="absolute bottom-4 left-1/2 z-[1000] max-h-[85dvh] w-[calc(100%-32px)] max-w-2xl -translate-x-1/2 overflow-y-auto rounded-[28px] border border-white/70 bg-[#FAF7F0]/95 shadow-2xl backdrop-blur-md lg:static lg:col-start-1 lg:row-start-1 lg:flex lg:max-h-none lg:w-full lg:max-w-none lg:translate-x-0 lg:flex-col lg:rounded-none lg:border-0 lg:border-r lg:border-[#7A7F7A]/20 lg:bg-[#FAF7F0] lg:pt-6 lg:shadow-none lg:backdrop-blur-none">

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 px-6 py-3 lg:pb-5 lg:pt-0">
          <button type="button" onClick={onBack} className="flex min-h-12 items-center gap-2 rounded-xl px-3 font-semibold hover:bg-white">
            <ArrowLeft size={20} aria-hidden="true" /> Back
          </button>

        </div>

        {/* COLLAPSE HANDLE */}
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          aria-label={expanded ? 'Collapse journey details' : 'Expand journey details'}
          className="flex w-full items-center justify-center py-3 lg:hidden"
        >
          <div className="h-1.5 w-12 rounded-full bg-[#7A7F7A]/40" />
        </button>

        {/* DESTINATION HEADER */}
        <div className="flex items-start justify-between gap-4 px-6 pb-4">

          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#7A7F7A]">
              Navigating to
            </p>

            <h1
              className="mt-1 break-words text-2xl"
              style={{ fontFamily: '"DM Serif Display", serif' }}
            >
              {destination?.name || end?.name || 'Your destination'}
            </h1>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <TripSharingButton route={route} origin={origin} destination={destination} canShare />
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            aria-label={expanded ? 'Collapse panel' : 'Expand panel'}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white lg:hidden"
          >
            {expanded ? <ChevronDown size={21} /> : <ChevronUp size={21} />}
          </button>
          </div>

        </div>

        {/* JOURNEY SUMMARY */}
        <div className="grid grid-cols-2 gap-4 border-t border-[#7A7F7A]/15 px-6 py-4">

          <div>
            <p className="text-sm text-[#7A7F7A]">
              Estimated duration
            </p>
            <p className="mt-1 text-xl font-bold">
              {route?.durationMinutes != null
                ? `${route.durationMinutes} min`
                : '—'}
            </p>
          </div>

          <div>
            <p className="text-sm text-[#7A7F7A]">
              Total distance
            </p>
            <p className="mt-1 text-xl font-bold">
              {formatDistance(route?.distanceMeters)}
            </p>
          </div>

        </div>

        {locationError && <p role="status" className="px-6 pb-4 text-sm text-amber-900">{locationError}</p>}

        {/* EXPANDED CONTENT */}
          <div className={`${expanded ? 'block' : 'hidden'} max-h-[38dvh] overflow-y-auto border-t border-[#7A7F7A]/15 px-6 py-5 lg:block lg:max-h-none lg:min-h-0 lg:flex-1`}>

            <h2 className="mb-4 text-lg font-semibold">
              Your journey
            </h2>

            {legs.length > 0 ? (
              <div className="space-y-5">

                {legs.map((leg, index) => {
                  const mode = getMode(leg)

                  return (
                    <div
                      key={index}
                      className="flex items-start gap-4"
                    >
                      {/* STEP ICON */}
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#DCE7D2]">
                        <ModeIcon mode={mode} />
                      </div>

                      {/* STEP DETAILS */}
                      <div className="min-w-0 flex-1">

                        <p className="text-sm font-semibold text-[#7A7F7A]">
                          Step {index + 1}
                        </p>

                        <p className="mt-1 text-base font-semibold">
                          {getInstruction(leg)}
                        </p>

                        <p className="mt-1 text-sm text-[#7A7F7A]">
                          {leg.durationSeconds != null
                            ? `${Math.ceil(leg.durationSeconds / 60)} min`
                            : 'Duration unavailable'}

                          {' · '}

                          {formatDistance(leg.distanceMeters)}
                        </p>

                      </div>

                    </div>
                  )
                })}

              </div>
            ) : (
              <p className="text-sm text-[#7A7F7A]">
                Detailed journey steps are unavailable.
              </p>
            )}

          </div>

        {/* END NAVIGATION */}
        <div className="shrink-0 border-t border-[#7A7F7A]/15 p-4">

          <button
            type="button"
            onClick={onEnd}
            className="flex w-full items-center justify-center gap-3 rounded-2xl bg-[#3E424B] px-6 py-4 text-base font-semibold text-white transition hover:bg-[#2A3439]"
          >
            <X size={20} />
            End navigation
          </button>

        </div>

      </section>}

    </div>
  )
}

export default Navigation
