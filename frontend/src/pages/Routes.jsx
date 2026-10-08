import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import { searchRoutes } from '../api/routes'

import {
  MapContainer,
  useMap,
  TileLayer,
  Polyline,
  Popup,
  Marker,
} from 'react-leaflet'

import 'leaflet/dist/leaflet.css'

import {
  MapPin,
  Navigation,
  LocateFixed,
  Footprints,
  Bus,
  Umbrella,
  Accessibility,
} from 'lucide-react'

import Navbar from '../components/Navbar'
import LocationAutocomplete from '../components/LocationAutocomplete'

function hasCoordinates(location) {
  return Number.isFinite(location?.latitude) && Number.isFinite(location?.longitude)
}

function FitRoute({ origin, destination, paths }) {
  const map = useMap()
  useEffect(() => {
    const points = paths.flat()
    if (hasCoordinates(origin)) points.push([origin.latitude, origin.longitude])
    if (hasCoordinates(destination)) points.push([destination.latitude, destination.longitude])
    if (points.length > 0) map.fitBounds(points, { padding: [35, 35], maxZoom: 16 })
  }, [map, origin, destination, paths])
  return null
}

function calculateHeading(previous, current) {
  const lat1 = (previous.latitude * Math.PI) / 180
  const lat2 = (current.latitude * Math.PI) / 180
  const dLon = ((current.longitude - previous.longitude) * Math.PI) / 180

  const y = Math.sin(dLon) * Math.cos(lat2)
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon)

  const angle = (Math.atan2(y, x) * 180) / Math.PI

  return (angle + 360) % 360
}

function DirectionMarker({ position, heading }) {
  const rotation = heading ?? 0

  const icon = L.divIcon({
    className: '',
    html: `
      <svg
        width="80"
        height="80"
        viewBox="0 0 80 80"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M40 4
            C53 14, 61 27, 66 44
            C57 40, 49 38, 40 38
            C31 38, 23 40, 14 44
            C19 27, 27 14, 40 4 Z"
          fill="rgba(47, 111, 237, 0.25)"
          transform="rotate(${rotation} 40 40)"
        />

        <circle
          cx="40"
          cy="40"
          r="9"
          fill="#2F6FED"
          stroke="white"
          strokeWidth="3"
        />
      </svg>
    `,
    iconSize: [80, 80],
    iconAnchor: [40, 40],
  })

  return <Marker position={position} icon={icon} />
}


const EMPTY_PATHS = []

function Routes({ onBack, onSignIn, onProfile, onSavedPlaces, isAuthenticated, initialDestination = '', initialDestinationPlace = null }) {
  const [destination, setDestination] = useState(initialDestination)
  const [originText, setOriginText] = useState('')
  const [originPlace, setOriginPlace] = useState(null)
  const [destinationPlace, setDestinationPlace] = useState(initialDestinationPlace)
  const [deviceLocation, setDeviceLocation] = useState(null)
  const [result, setResult] = useState(null)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState('')
  const pending = useRef(null)
  const locationRequest = useRef(0)
  const previousLocation = useRef(null)
  const locationWatch = useRef(null)

  useEffect(() => {
  return () => {
    pending.current?.abort()

    if (locationWatch.current !== null) {
      navigator.geolocation.clearWatch(locationWatch.current)
    }

    locationRequest.current += 1
  }
}, [])

  const selectedRoute = result?.routes[selectedIndex]
  const showRoute = Boolean(selectedRoute)
  const currentLocation = deviceLocation || selectedRoute?.legs?.[0]?.from
  const destinationLocation = selectedRoute?.legs?.at(-1)?.to
  const routeCoordinates = selectedRoute?.routePaths || EMPTY_PATHS

  const destinationIcon = L.divIcon({
    className: '',
    html: `
      <div style="
        width: 32px;
        height: 32px;
        background: #e53935;
        border: 3px solid white;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      ">
        <div style="
          width: 10px;
          height: 10px;
          background: white;
          border-radius: 50%;
          position: absolute;
          top: 8px;
          left: 8px;
        "></div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  })

  const clearResult = () => {
    pending.current?.abort()
    pending.current = null
    setLoading(false)
    setResult(null)
    setError('')
  }

  const useMyLocation = () => {
    clearResult()
    if (locationWatch.current !== null) {
      navigator.geolocation.clearWatch(locationWatch.current)
      locationWatch.current = null
    }

    if (!navigator.geolocation) {
      setError('Location is unavailable in this browser. Enter a starting point instead.')
      return
    }

    const request = ++locationRequest.current
    setLocating(true)

    locationWatch.current = navigator.geolocation.watchPosition(
      ({ coords }) => {
        if (request !== locationRequest.current) return

        const newLocation = {
          latitude: coords.latitude,
          longitude: coords.longitude,
          name: 'Current location',
        }

        let heading = coords.heading

        if (
          heading == null &&
          previousLocation.current
        ) {
          heading = calculateHeading(
            previousLocation.current,
            newLocation
          )
        }

        setDeviceLocation({
          ...newLocation,
          heading,
        })

        previousLocation.current = newLocation

        setOriginText('Current location')
        setOriginPlace(null)
        setLocating(false)
      },
    )
  }

  const handleFindRoute = async () => {
    if (loading || locating) return
    clearResult()
    if (!isAuthenticated) {
      setError('Sign in to get routes tailored to your saved preferences.')
      return
    }
    if (!destinationPlace || (!deviceLocation && !originPlace)) {
      setError('Choose your starting point and destination from the suggestions, or use your current location for the starting point.')
      return
    }
    const controller = new AbortController()
    pending.current = controller
    setLoading(true)
    try {
      const origin = deviceLocation || originPlace
      const target = destinationPlace
      const recommendations = await searchRoutes(origin, target, controller.signal)
      const routes = recommendations.routes
      if (controller.signal.aborted) return
      if (!Array.isArray(routes) || routes.length === 0) {
        setError('No public transport routes were found. Try another starting point or destination.')
        return
      }
      setSelectedIndex(0)
      setResult({ ...recommendations, origin, destination: target, routes })
    } catch (failure) {
      if (!controller.signal.aborted) setError(failure.message)
    } finally {
      if (pending.current === controller) {
        pending.current = null
        setLoading(false)
      }
    }
  }

  return (
    <div className="min-h-screen bg-[#FAF7F0] text-[#2A3439]">

      {/* NAVBAR */}
      <Navbar
        activePage="routes"
        onHome={onBack}
        onRoutes={() => {}}
        onSavedPlaces={onSavedPlaces}
        onSignIn={onSignIn}
        onProfile={onProfile}
        isAuthenticated={isAuthenticated}
      />

      {/* MAIN PAGE */}
      <main className="mx-auto max-w-7xl px-8 pb-10 pt-10">

        {/* TWO-COLUMN LAYOUT */}
        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">

          {/* ====================================== */}
          {/* LEFT SIDE */}
          {/* ====================================== */}

          <section>

            {/* SEARCH AREA */}
            <div className="rounded-[24px] border border-[#7A7F7A]/20 bg-white p-6">

              {/* CURRENT LOCATION */}
              <div className="mb-5">

                <label className="mb-2 block text-sm font-bold text-[#2A3439]">
                  From
                </label>

                <div className="flex h-[62px] items-center gap-3 rounded-2xl bg-[#FAF7F0] px-4">

                  <LocateFixed
                    size={21}
                    className="shrink-0 text-[#7A7F7A]"
                  />

                  <LocationAutocomplete
                    label="Starting point"
                    value={originText}
                    placeholder="Enter starting point"
                    selectedPlace={deviceLocation || originPlace}
                    onChange={(text) => {
                      clearResult()
                      locationRequest.current += 1
                      setLocating(false)
                      setDeviceLocation(null)
                      setOriginPlace(null)
                      setOriginText(text)
                      if (locationWatch.current !== null) {
                        navigator.geolocation.clearWatch(locationWatch.current)
                        locationWatch.current = null
                      }
                    }}
                    onSelect={(place) => {
                      clearResult()
                      locationRequest.current += 1
                      if (locationWatch.current !== null) {
                        navigator.geolocation.clearWatch(locationWatch.current)
                        locationWatch.current = null
                      }
                      setLocating(false)
                      setDeviceLocation(null)
                      setOriginText(place.name)
                      setOriginPlace(place)
                    }}
                    onSubmit={handleFindRoute}
                    className="w-full bg-transparent text-base outline-none"
                  />

                  <button
                    type="button"
                    onClick={useMyLocation}
                    disabled={locating || loading}
                    className="shrink-0 text-sm font-semibold text-[#7A7F7A] transition hover:text-[#2A3439]"
                  >
                    {locating ? 'Locating…' : 'Use my location'}
                  </button>

                </div>

              </div>

              {/* DESTINATION */}
              <div>

                <label className="mb-2 block text-sm font-bold text-[#2A3439]">
                  To
                </label>

                <div className="flex h-[62px] items-center gap-3 rounded-2xl bg-[#FAF7F0] px-4">

                  <MapPin
                    size={21}
                    className="shrink-0 text-[#7A7F7A]"
                  />

                  <LocationAutocomplete
                    label="Destination"
                    value={destination}
                    selectedPlace={destinationPlace}
                    onChange={(text) => {
                      clearResult()
                      setDestination(text)
                      setDestinationPlace(null)
                    }}
                    onSelect={(place) => {
                      clearResult()
                      setDestination(place.name)
                      setDestinationPlace(place)
                    }}
                    onSubmit={handleFindRoute}
                    placeholder="Enter destination, landmark or address"
                    className="w-full bg-transparent text-base outline-none placeholder:text-[#7A7F7A]"
                  />

                </div>

              </div>

              {/* FIND ROUTE */}
              <button
                type="button"
                onClick={handleFindRoute}
                disabled={loading || locating}
                aria-busy={loading}
                className="mt-5 flex h-[62px] w-full items-center justify-center gap-3 rounded-2xl bg-[#3E424B] text-lg font-semibold text-white transition hover:scale-[1.01]"
              >
                {loading ? 'Comparing routes…' : 'Find recommended routes'}

                <Navigation size={20} />

              </button>

            </div>

            {!isAuthenticated && (
              <p className="mt-4 rounded-xl bg-amber-50 p-4 text-amber-900">
                Sign in to get personalized recommendations.{' '}
                <button type="button" onClick={onSignIn} className="font-semibold underline">Sign in</button>
              </p>
            )}
            {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-red-800">{error}</p>}
            {loading && <p role="status" className="mt-4">Comparing routes with your saved preferences and available travel conditions…</p>}
            {result && (
              <div className="mt-4">
                <p className="mb-3 text-sm">{result.origin.name} → {result.destination.name}</p>
                <h2 className="font-semibold">{result.routes.length === 1 ? 'Your recommended route' : `Your top ${result.routes.length} routes`}</h2>
                <p className="mt-1 text-sm text-[#555C60]">
                  {result.engine?.startsWith('mock')
                    ? 'Demo recommendations using sample data. Not for navigation.'
                    : 'Ranked for your saved walking and shelter preferences.'}
                </p>
                <div className="mt-3 grid gap-3" aria-label="Ranked route choices">
                  {result.routes.map((route, index) => (
                    <button key={route.id} type="button" aria-pressed={selectedIndex === index}
                      onClick={() => setSelectedIndex(index)}
                      className={`rounded-2xl border-2 p-4 text-left transition ${selectedIndex === index
                        ? 'border-[#3E424B] bg-[#DCE7D2]' : 'border-[#7A7F7A]/30 bg-white hover:border-[#3E424B]'}`}>
                      <span className="block font-bold">{index === 0 ? '1 · Recommended for you' : `${index + 1} · Alternative route`}</span>
                      <span className="mt-1 block text-sm">
                        {route.durationMinutes == null ? 'Time unavailable' : `${route.durationMinutes} min`}
                        {' · '}{route.transfers == null ? 'Transfers unavailable' : `${route.transfers} transfer${route.transfers === 1 ? '' : 's'}`}
                      </span>
                      <span className="mt-1 block text-sm">{route.reasons?.[0] || route.summary}</span>
                    </button>
                  ))}
                </div>
                {result.warnings?.length > 0 && (
                  <details className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-950">
                    <summary className="cursor-pointer font-semibold">Travel data notices ({result.warnings.length})</summary>
                    <ul className="mt-2 list-disc space-y-1 pl-5">
                      {result.warnings.map((warning, index) => <li key={index}>{warning}</li>)}
                    </ul>
                  </details>
                )}

              </div>
            )}

            {/* ====================================== */}
            {/* ROUTE RESULT */}
            {/* Only appears after Find route is clicked */}
            {/* ====================================== */}

            {showRoute && (

              <div className="mt-6 rounded-[24px] border-2 border-[#3E424B]/80 bg-[#DCE7D2] p-6">

                {/* ROUTE HEADER */}
                <div>

                  <p className="text-xs font-extrabold tracking-[0.14em] text-[#7A7F7A]">
                    {selectedIndex === 0 ? 'RECOMMENDED ROUTE' : `ALTERNATIVE ROUTE ${selectedIndex + 1}`}
                  </p>

                  <h2
                    className="mt-2 text-4xl text-[#2A3439]"
                    style={{ fontFamily: '"DM Serif Display", serif' }}
                  >
                    {selectedRoute.durationMinutes == null ? 'Time unavailable' : `${selectedRoute.durationMinutes} min`}
                  </h2>

                  <p className="mt-1 text-[#7A7F7A]">
                    {selectedRoute.distanceMeters == null ? 'Distance unavailable' : `${(selectedRoute.distanceMeters / 1000).toFixed(1)} km total journey`}
                  </p>

                </div>

                <p className="mt-6 font-semibold">{selectedRoute.summary}</p>

                {selectedRoute.reasons?.length > 0 && (
                  <div className="mt-4">
                    <h3 className="font-semibold">Why this route suits you</h3>
                    <ul className="mt-2 list-disc space-y-1 pl-5">
                      {selectedRoute.reasons.map((reason, index) => <li key={index}>{reason}</li>)}
                    </ul>
                  </div>
                )}
                {selectedRoute.warnings?.length > 0 && (
                  <div className="mt-4 rounded-xl bg-white/60 p-4 text-sm">
                    <h3 className="font-semibold">Before you travel</h3>
                    <ul className="mt-2 list-disc space-y-1 pl-5">
                      {selectedRoute.warnings.map((warning, index) => <li key={index}>{warning}</li>)}
                    </ul>
                  </div>
                )}

                {/* ROUTE INFORMATION */}
                <div className="mt-6 divide-y divide-[#7A7F7A]/20 border-y border-[#7A7F7A]/20">

                  {/* SHELTERED */}
                  <div className="flex items-center justify-between py-4">

                    <div className="flex items-center gap-3">
                      <Umbrella size={20} />

                      <span className="font-medium">
                        Estimated sheltered walking
                      </span>
                    </div>

                    <span className="font-semibold">
                      {selectedRoute.estimatedShelteredWalkingMeters == null
                        ? 'Unavailable' : `${Math.round(selectedRoute.estimatedShelteredWalkingMeters)} m`}
                    </span>

                  </div>

                  {/* WALKING */}
                  <div className="flex items-center justify-between py-4">

                    <div className="flex items-center gap-3">
                      <Footprints size={20} />

                      <span className="font-medium">
                        Walking
                      </span>
                    </div>

                    <span className="font-semibold">
                      {selectedRoute.walkingMinutes == null ? 'Time unavailable' : `${selectedRoute.walkingMinutes} min`}
                      {selectedRoute.walkingDistanceMeters != null && ` · ${Math.round(selectedRoute.walkingDistanceMeters)} m`}
                    </span>

                  </div>

                  {/* TRANSFERS */}
                  <div className="flex items-center justify-between py-4">

                    <div className="flex items-center gap-3">
                      <Bus size={20} />

                      <span className="font-medium">
                        Transfers
                      </span>
                    </div>

                    <span className="font-semibold">
                      {selectedRoute.transfers ?? 'Unavailable'}
                    </span>

                  </div>

                  {/* ACCESSIBILITY */}
                  <div className="flex items-center justify-between py-4">

                    <div className="flex items-center gap-3">
                      <Accessibility size={20} />

                      <span className="font-medium">
                        Accessibility
                      </span>
                    </div>

                    <span className="text-right font-semibold">
                      Not verified
                    </span>

                  </div>

                </div>

                {routeCoordinates.length === 0 && (
                  <p className="mt-4 text-sm">Map geometry is unavailable for this route.</p>
                )}

              </div>

            )}

          </section>

          {/* ====================================== */}
          {/* RIGHT SIDE - MAP */}
          {/* ====================================== */}

          <section className="overflow-hidden rounded-[28px] border border-[#7A7F7A]/20">

            <MapContainer
              center={[1.3521, 103.8198]}
              zoom={15}
              scrollWheelZoom={true}
              className="h-[650px] w-full"
            >

              {/* OneMap Singapore map */}
              <TileLayer
                url="https://www.onemap.gov.sg/maps/tiles/Default/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.onemap.gov.sg/">OneMap</a> contributors | Singapore Land Authority'
              />

              <FitRoute origin={currentLocation} destination={destinationLocation} paths={routeCoordinates} />
              {hasCoordinates(currentLocation) && (
                <DirectionMarker
                  position={[
                    currentLocation.latitude,
                    currentLocation.longitude,
                  ]}
                  heading={currentLocation.heading}
                />
              )}

              {showRoute && (
                <>
                  {/* DESTINATION */}
                  {hasCoordinates(destinationLocation) && (
                    <Marker
                      position={[destinationLocation.latitude, destinationLocation.longitude]}
                      icon={destinationIcon}
                    >
                      <Popup>Destination</Popup>
                    </Marker>
                  )}

                  {/* BLUE ROUTE */}
                    {routeCoordinates.length > 0 && (
                      <>
                        {/* White outline */}
                        <Polyline
                          positions={routeCoordinates}
                          pathOptions={{
                            color: 'white',
                            weight: 10,
                            opacity: 0.9,
                            lineCap: 'round',
                            lineJoin: 'round',
                          }}
                        />

                        {/* Main route */}
                        <Polyline
                          positions={routeCoordinates}
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
                </>
              )}

            </MapContainer>

          </section>

        </div>

      </main>

    </div>
  )
}

export default Routes
