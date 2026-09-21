import { useEffect, useRef, useState } from 'react'
import { searchLocation, searchRoutes } from '../api/routes'

import {
  MapContainer,
  useMap,
  TileLayer,
  CircleMarker,
  Polyline,
  Popup,
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

function FitRoute({ origin, destination, paths }) {
  const map = useMap()
  useEffect(() => {
    const points = paths.flat()
    if (origin) points.push([origin.latitude, origin.longitude])
    if (destination) points.push([destination.latitude, destination.longitude])
    if (points.length > 0) map.fitBounds(points, { padding: [35, 35], maxZoom: 16 })
  }, [map, origin, destination, paths])
  return null
}

const EMPTY_PATHS = []

function Route({ onBack, onSignIn, destination: initialDestination = '' }) {
  const [destination, setDestination] = useState(initialDestination)
  const [originText, setOriginText] = useState('')
  const [deviceLocation, setDeviceLocation] = useState(null)
  const [result, setResult] = useState(null)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState('')
  const pending = useRef(null)
  const locationRequest = useRef(0)

  useEffect(() => () => {
    pending.current?.abort()
    locationRequest.current += 1
  }, [])

  const selectedRoute = result?.routes[selectedIndex]
  const showRoute = Boolean(selectedRoute)
  const currentLocation = result?.origin || deviceLocation
  const destinationLocation = result?.destination
  const routeCoordinates = selectedRoute?.routePaths || EMPTY_PATHS

  const clearResult = () => {
    pending.current?.abort()
    pending.current = null
    setLoading(false)
    setResult(null)
    setError('')
  }

  const useMyLocation = () => {
    clearResult()
    if (!navigator.geolocation) {
      setError('Location is unavailable in this browser. Enter a starting point instead.')
      return
    }
    const request = ++locationRequest.current
    setLocating(true)
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      if (request !== locationRequest.current) return
      setDeviceLocation({ latitude: coords.latitude, longitude: coords.longitude, name: 'Current location' })
      setOriginText('Current location')
      setLocating(false)
    }, () => {
      if (request !== locationRequest.current) return
      setLocating(false)
      setError('Could not get your location. Allow location access or enter a starting point.')
    }, { timeout: 10000, maximumAge: 60000 })
  }

  const handleFindRoute = async () => {
    if (loading || locating) return
    clearResult()
    if (!destination.trim() || (!deviceLocation && !originText.trim())) {
      setError('Enter a starting point and destination, or use your current location.')
      return
    }
    const controller = new AbortController()
    pending.current = controller
    setLoading(true)
    try {
      const [origin, target] = await Promise.all([
        deviceLocation || searchLocation(originText.trim(), controller.signal),
        searchLocation(destination.trim(), controller.signal),
      ])
      const routes = await searchRoutes(origin, target, controller.signal)
      if (controller.signal.aborted) return
      if (!Array.isArray(routes) || routes.length === 0) {
        setError('No public transport routes were found. Try another starting point or destination.')
        return
      }
      setSelectedIndex(0)
      setResult({ origin, destination: target, routes })
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
        onSignIn={onSignIn}
        onRoutes={() => {}}
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

                  <input
                    type="text"
                    aria-label="Starting point"
                    value={originText}
                    placeholder="Enter starting point"
                    onChange={(event) => {
                      clearResult()
                      locationRequest.current += 1
                      setLocating(false)
                      setDeviceLocation(null)
                      setOriginText(event.target.value)
                    }}
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

                  <input
                    type="text"
                    aria-label="Destination"
                    value={destination}
                    onChange={(event) => {
                      clearResult()
                      setDestination(event.target.value)
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        handleFindRoute()
                      }
                    }}
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
                {loading ? 'Finding routes…' : 'Find route'}

                <Navigation size={20} />

              </button>

            </div>

            {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-red-800">{error}</p>}
            {loading && <p role="status" className="mt-4">Finding public transport routes…</p>}
            {result && (
              <div className="mt-4">
                <p className="mb-3 text-sm">{result.origin.name} → {result.destination.name}</p>
                <label className="font-semibold" htmlFor="route-choice">Choose a route</label>
                <select id="route-choice" className="mt-2 w-full rounded-xl border bg-white p-3"
                  value={selectedIndex} onChange={(event) => setSelectedIndex(Number(event.target.value))}>
                  {result.routes.map((route, index) => (
                    <option key={route.id} value={index}>
                      Route {index + 1}: {route.durationMinutes} min · {route.transfers} transfers
                    </option>
                  ))}
                </select>
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
                    PUBLIC TRANSPORT ROUTE
                  </p>

                  <h2
                    className="mt-2 text-4xl text-[#2A3439]"
                    style={{ fontFamily: '"DM Serif Display", serif' }}
                  >
                    {selectedRoute.durationMinutes} min
                  </h2>

                  <p className="mt-1 text-[#7A7F7A]">
                    {selectedRoute.distanceMeters == null ? 'Distance unavailable' : `${(selectedRoute.distanceMeters / 1000).toFixed(1)} km total journey`}
                  </p>

                </div>

                <p className="mt-6 font-semibold">{selectedRoute.summary}</p>

                {/* ROUTE INFORMATION */}
                <div className="mt-6 divide-y divide-[#7A7F7A]/20 border-y border-[#7A7F7A]/20">

                  {/* SHELTERED */}
                  <div className="flex items-center justify-between py-4">

                    <div className="flex items-center gap-3">
                      <Umbrella size={20} />

                      <span className="font-medium">
                        Sheltered route
                      </span>
                    </div>

                    <span className="font-semibold">
                      Unavailable
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
                      {selectedRoute.walkingMinutes} min
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
                      {selectedRoute.transfers}
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
              {/* CURRENT LOCATION */}
              {currentLocation && <CircleMarker
                center={[currentLocation.latitude, currentLocation.longitude]}
                radius={9}
                pathOptions={{
                  color: '#ffffff',
                  weight: 4,
                  fillColor: '#4285F4',
                  fillOpacity: 1,
                }}
              >
                <Popup>
                  {currentLocation.name}
                </Popup>
              </CircleMarker>}

              {showRoute && (
                <>
                  {/* DESTINATION */}
                  <CircleMarker
                    center={[destinationLocation.latitude, destinationLocation.longitude]}
                    radius={9}
                    pathOptions={{
                      color: '#ffffff',
                      weight: 4,
                      fillColor: '#E45757',
                      fillOpacity: 1,
                    }}
                  >
                    <Popup>
                      Destination
                    </Popup>
                  </CircleMarker>

                  {/* BLUE ROUTE */}
                  {routeCoordinates.length > 0 && <Polyline
                    positions={routeCoordinates}
                    pathOptions={{
                      color: '#2F6FED',
                      weight: 7,
                      opacity: 0.95,
                    }}
                  />}
                </>
              )}

            </MapContainer>

          </section>

        </div>

      </main>

    </div>
  )
}

export default Route
