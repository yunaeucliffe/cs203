import RouteChoice from '../components/RouteChoice'
import { useCallback, useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import { searchRoutes } from '../api/routes'
import RouteCard from '../components/RouteCard'
import RouteDetails from '../components/RouteDetails'
import TravelTimeDisclaimer from '../components/TravelTimeDisclaimer'

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

function LocationDot({ position }) {
  const icon = L.divIcon({
    className: '',
    html: `
      <div style="
        width: 22px;
        height: 22px;
        box-sizing: border-box;
        background: #2F6FED;
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 1px 5px rgba(0, 0, 0, 0.4);
      "></div>
    `,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  })

  return (
    <Marker
      position={position}
      icon={icon}
      zIndexOffset={1000}
    />
  )
}

function DirectionMarker({ position, heading }) {
  const rotation = heading ?? 0

  const icon = L.divIcon({
    className: 'direction-marker-icon',
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
  const [addressSuggestion, setAddressSuggestion] = useState(null)
  const pending = useRef(null)
  const locationRequest = useRef(0)
  const locationWatch = useRef(null)
  const [isMobileDevice, setIsMobileDevice] = useState(false)
  const [deviceHeading, setDeviceHeading] = useState(null)
  const compassListeners = useRef(null)

  const stopCompassTracking = useCallback(() => {
    const listeners = compassListeners.current
    if (!listeners) return

    window.removeEventListener(
      'deviceorientation',
      listeners.ios
    )
    window.removeEventListener(
      'deviceorientationabsolute',
      listeners.absolute
    )

    compassListeners.current = null
  }, [])

  const startCompassTracking = async () => {
    stopCompassTracking()
    setDeviceHeading(null)

    const OrientationEvent = window.DeviceOrientationEvent

    // Some browsers, including iOS Safari, require permission.
    if (typeof OrientationEvent?.requestPermission === 'function') {
      try {
        const permission = await OrientationEvent.requestPermission(true)
        if (permission !== 'granted') return
      } catch {
        return
      }
    }

    // iOS: use the actual compass heading.
    const handleIOSCompass = (event) => {
      const heading = event.webkitCompassHeading

      if (Number.isFinite(heading) && heading >= 0) {
        setDeviceHeading(heading)
      }
    }

    // Android/Chrome: use absolute orientation, not GPS movement.
    const handleAbsoluteCompass = (event) => {
      if (Number.isFinite(event.alpha)) {
        setDeviceHeading((360 - event.alpha) % 360)
      }
    }

  window.addEventListener('deviceorientation', handleIOSCompass)
  window.addEventListener(
    'deviceorientationabsolute',
    handleAbsoluteCompass
  )

  compassListeners.current = {
    ios: handleIOSCompass,
    absolute: handleAbsoluteCompass,
  }
}


useEffect(() => {
  const mediaQuery = window.matchMedia(
    '(max-width: 768px) and (pointer: coarse)'
  )

  const updateDeviceType = () => {
    setIsMobileDevice(mediaQuery.matches)
  }

  updateDeviceType()

  mediaQuery.addEventListener('change', updateDeviceType)

  return () => {
    mediaQuery.removeEventListener('change', updateDeviceType)
  }
}, [])

  const [viewingDetails, setViewingDetails] = useState(false)


  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: 'instant',
    })
  }, [viewingDetails])

  useEffect(() => {
  return () => {
    pending.current?.abort()

    if (locationWatch.current !== null) {
      navigator.geolocation.clearWatch(locationWatch.current)
    }

    stopCompassTracking()
    locationRequest.current += 1
  }
}, [stopCompassTracking])

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
    setViewingDetails(false)
    setError('')
    setAddressSuggestion(null)

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

    if (isMobileDevice) {
      void startCompassTracking()
    } else {
      stopCompassTracking()
      setDeviceHeading(null)
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

        setDeviceLocation(newLocation)

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
    const origin = deviceLocation || originPlace
    const target = destinationPlace
    try {
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
      if (!controller.signal.aborted) {
        setError(failure.message)
        if (failure.suggestions?.length) {
          setAddressSuggestion({
            field: !hasCoordinates(origin) && failure.query === originText.trim() ? 'origin' : 'destination',
            locations: failure.suggestions,
          })
        }
      }
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
        onRoutes={() => { }}
        onSavedPlaces={onSavedPlaces}
        onSignIn={onSignIn}
        onProfile={onProfile}
        isAuthenticated={isAuthenticated}
      />

      {/* MAIN PAGE */}
      <main className="mx-auto max-w-7xl px-8 pb-10 pt-10">

        {viewingDetails && selectedRoute ? (
          <RouteDetails
            route={selectedRoute}
            index={selectedIndex}
            origin={result.origin}
            destination={result.destination}
            engine={result.engine}
            warnings={result.warnings}
            sources={result.sources}
            onBack={() => setViewingDetails(false)}
          />
        ) : (
          <>

            {/* SEARCH LAYOUT */}
            <div
              className={
                result
                  ? 'grid gap-6'
                  : 'grid gap-6 lg:grid-cols-[0.8fr_1.2fr]'
              }
            >
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

                    {loading ? (
                      <span
                        className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"
                        aria-hidden="true"
                      />
                    ) : (
                      <Navigation size={20} />
                    )}

                  </button>

                </div>

                {!isAuthenticated && (
                  <p className="mt-4 rounded-xl bg-amber-50 p-4 text-amber-900">
                    Sign in to get personalized recommendations.{' '}
                    <button type="button" onClick={onSignIn} className="font-semibold underline">Sign in</button>
                  </p>
                )}
               {error && (
                <div
                  role="alert"
                  className="fixed right-4 top-4 z-[2000] flex max-w-sm items-start gap-3 rounded-xl border border-red-200 bg-white p-4 text-red-800 shadow-lg"
                >
                  <p className="flex-1">{error}</p>

                  <button
                    type="button"
                    onClick={() => setError('')}
                    aria-label="Dismiss error"
                    className="font-bold text-red-800 hover:text-red-950"
                  >
                    ×
                  </button>
                </div>
              )}
                {addressSuggestion && (
                  <div className="mt-4 rounded-xl bg-amber-50 p-4" aria-label="Suggested addresses">
                    <p className="mb-3 font-semibold">Confirm your {addressSuggestion.field === 'origin' ? 'starting point' : 'destination'}</p>
                    {addressSuggestion.locations.map((location) => (
                      <button key={`${location.name}-${location.latitude}-${location.longitude}`} type="button"
                        className="mb-2 block w-full rounded-xl border border-amber-300 bg-white p-3 text-left"
                        onClick={() => {
                          clearResult()
                          if (addressSuggestion.field === 'origin') {
                            setOriginText(location.name)
                            setOriginPlace(location)
                          } else {
                            setDestination(location.name)
                            setDestinationPlace(location)
                          }
                        }}>
                        {location.name}
                      </button>
                    ))}
                  </div>
                )}
                {loading && <p role="status" className="mt-4">Comparing routes with your saved preferences and available travel conditions…</p>}

              </section>

              {/* ====================================== */}
              {/* RIGHT SIDE - MAP */}
              {/* ====================================== */}

              {!result && (

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
                   {/* Blue dot on desktop and mobile */}
                    {hasCoordinates(currentLocation) && (
                      <LocationDot
                        position={[
                          currentLocation.latitude,
                          currentLocation.longitude,
                        ]}
                      />
                    )}

                    {/* Compass direction cone on mobile only */}
                    {isMobileDevice &&
                      hasCoordinates(currentLocation) &&
                      deviceHeading !== null && (
                        <DirectionMarker
                          position={[
                            currentLocation.latitude,
                            currentLocation.longitude,
                          ]}
                          heading={deviceHeading}
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

              )}

            </div>
            {/* ROUTE COMPARISON CARDS */}

            {
              result && (

                <section className="mt-8">

                  <h2

                    className="text-3xl text-[#2A3439]"

                    style={{ fontFamily: '"DM Serif Display", serif' }}

                  >

                    Your recommended routes

                  </h2>

                  {/* <p className="mt-2 text-[#7A7F7A]">

                {result.origin.name} → {result.destination.name}

              </p>

              <p className="mt-2 text-sm text-[#555C60]">

                {result.engine?.startsWith('mock')

                  ? 'Demo recommendations using sample data. Not for navigation.'

                  : 'Ranked for your saved walking and shelter preferences.'}

              </p> */}

                  <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-3">

                    {result.routes.map((route, index) => (

                      <RouteCard
                        key={route.id}
                        route={route}
                        index={index}
                        onClick={() => {
                          setSelectedIndex(index)
                          setViewingDetails(true)
                        }}
                      />

                    ))}

                  </div>

                  {/* TRAVEL WARNINGS */}

                  {result.warnings?.length > 0 && (

                    <details className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-950">

                      <summary className="cursor-pointer font-semibold">

                        Travel data notices ({result.warnings.length})

                      </summary>

                      <ul className="mt-2 list-disc space-y-1 pl-5">

                        {result.warnings.map((warning, index) => (

                          <li key={index}>{warning}</li>

                        ))}

                      </ul>

                    </details>

                  )}
                  <TravelTimeDisclaimer />

                </section>

              )
            }
          </>
        )}
        {result?.recommendationId && selectedRoute && (
          <div hidden={!viewingDetails}>
            <RouteChoice key={result.recommendationId}
              recommendationId={result.recommendationId} routeId={selectedRoute.id} />
          </div>
        )}
      </main >

    </div >
  )
}

export default Routes
