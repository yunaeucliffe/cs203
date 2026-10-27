import { createPortal } from 'react-dom'
import RouteChoice from '../components/RouteChoice'
import { useCallback, useEffect, useRef, useState } from 'react'
import { searchRoutes } from '../api/routes'
import RouteCard from '../components/RouteCard'
import RouteDetails from '../components/RouteDetails'
import RouteSearchMap from '../components/RouteSearchMap'
import NavigationPage from './Navigation'

import {
  Navigation,
} from 'lucide-react'

import Navbar from '../components/Navbar'
import LocationAutocomplete from '../components/LocationAutocomplete'

function hasCoordinates(location) {
  return Number.isFinite(location?.latitude) && Number.isFinite(location?.longitude)
}

function Routes({ onBack, onSignIn, onProfile, onSavedPlaces, isAuthenticated, initialDestination = '', initialDestinationPlace = null }) {
  const [destination, setDestination] = useState(initialDestination)
  const [originText, setOriginText] = useState('')
  const [originPlace, setOriginPlace] = useState(null)
  const [destinationPlace, setDestinationPlace] = useState(initialDestinationPlace)
  const [deviceLocation, setDeviceLocation] = useState(null)
  const [result, setResult] = useState(null)
  const [hasSearched, setHasSearched] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState('')
  const [addressSuggestion, setAddressSuggestion] = useState(null)
  const resultsSection = useRef(null)
  const pending = useRef(null)
  const locationRequest = useRef(0)
  const locationWatch = useRef(null)
  const [viewingDetails, setViewingDetails] = useState(false)
  const [navigating, setNavigating] = useState(false)
  const [activeNavigation, setActiveNavigation] = useState(null)
  const [choice, setChoice] = useState(null)
  const [choiceButtonContainer, setChoiceButtonContainer] = useState(null)


  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: 'instant',
    })
  }, [viewingDetails, navigating])

  useEffect(() => {
  return () => {
    pending.current?.abort()

    if (locationWatch.current !== null) {
      navigator.geolocation.clearWatch(locationWatch.current)
    }

    locationRequest.current += 1
  }
}, [])

  useEffect(() => {
    if (result) {
      resultsSection.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [result])

  const selectedRoute = result?.routes[selectedIndex]
  const canStartNavigation = Boolean(
    selectedRoute && result?.recommendationId &&
    choice?.recommendationId === result.recommendationId &&
    choice?.routeId === selectedRoute.id && !choice.saving &&
    !result.engine?.startsWith('mock')
  )
  const clearResult = useCallback(() => {
    pending.current?.abort()
    pending.current = null
    setLoading(false)
    setResult(null)
    setViewingDetails(false)
    setNavigating(false)
    setError('')
    setAddressSuggestion(null)
  }, [])

  const useMyLocation = useCallback(() => {
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

        if (locationWatch.current !== null) {
          navigator.geolocation.clearWatch(locationWatch.current)
          locationWatch.current = null
        }

        const newLocation = {
          latitude: coords.latitude,
          longitude: coords.longitude,
          name: 'Current location',
          accuracy: coords.accuracy,
        }

        setDeviceLocation(newLocation)
        setOriginText('Current location')
        setOriginPlace(null)
        setLocating(false)
        setError('')
      },
      (geoError) => {
        if (request !== locationRequest.current) return

        if (locationWatch.current !== null) {
          navigator.geolocation.clearWatch(locationWatch.current)
          locationWatch.current = null
        }

        setLocating(false)

        if (geoError.code === 1) {
          setError(
            'Location permission was denied. Allow location access in your browser settings, or enter a starting point instead.'
          )
        } else if (geoError.code === 2) {
          setError(
            'Your location is unavailable. Check that location services are enabled, try again, or enter a starting point instead.'
          )
        } else if (geoError.code === 3) {
          setError(
            'Finding your location timed out. Please try again or enter a starting point instead.'
          )
        } else {
          setError(
            'We could not get your location. Please try again or enter a starting point instead.'
          )
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 0,
      }
    )
  }, [clearResult])

  useEffect(() => {
    // Defer until mount completes; cancelling also avoids duplicate requests in Strict Mode.
    const timer = window.setTimeout(useMyLocation, 0)
    return () => window.clearTimeout(timer)
  }, [useMyLocation])

  const handleFindRoute = async () => {
    if (loading || locating) return
    clearResult()
    setAddressSuggestion(null)
    if (!isAuthenticated) {
      setError('Sign in to get routes tailored to your saved preferences.')
      return
    }
    if (!originText.trim() || !destination.trim()) {
      setError('Enter both a starting point and a destination.')
      return
    }
    const controller = new AbortController()
    pending.current = controller
    setLoading(true)
    const origin = deviceLocation || originPlace || { name: originText.trim() }
    const target = destinationPlace || { name: destination.trim() }
    try {
      const recommendations = await searchRoutes(origin, target, controller.signal)
      const routes = recommendations.routes
      if (controller.signal.aborted) return
      if (!Array.isArray(routes) || routes.length === 0) {
        setError('No public transport routes were found. Try another starting point or destination.')
        return
      }
      setHasSearched(true)
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
    <>
      {navigating && selectedRoute && (
        <NavigationPage
          route={selectedRoute}
          origin={result.origin}
          destination={result.destination}
          onBack={() => setNavigating(false)}
          onEnd={() => {
            setActiveNavigation(null)
            setNavigating(false)
            setViewingDetails(false)
          }}
        />
      )}

      <div
        hidden={navigating}
        className="min-h-screen bg-[#FAF7F0] text-[#2A3439]"
      >
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
        <main className="mx-auto max-w-7xl px-4 pb-10 pt-4 sm:px-6 lg:px-8 lg:pt-6">
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
              choiceButtonRef={setChoiceButtonContainer}
              canShare={Boolean(
                choice?.recommendationId === result.recommendationId &&
                choice?.routeId === selectedRoute.id && !choice.saving
              )}
            />
          ) : (
            <>


            {/* SEARCH LAYOUT */}
            <div className={`grid grid-cols-1 items-start gap-6 ${hasSearched ? '' : 'lg:grid-cols-2'}`}>
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

                    <div className="flex min-h-[62px] flex-wrap items-center gap-3 py-3 rounded-2xl bg-[#FAF7F0] px-4">


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

                    <div className="flex min-h-[62px] flex-wrap items-center gap-3 py-3 rounded-2xl bg-[#FAF7F0] px-4">


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
                    className="mt-5 flex min-h-[62px] w-full px-4 py-3 items-center justify-center gap-3 rounded-2xl bg-[#3E424B] text-lg font-semibold text-white transition hover:scale-[1.01]"
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

                  {!hasSearched && <div aria-label="Map legend" className="mt-5 flex flex-wrap gap-x-6 gap-y-3 border-t border-[#7A7F7A]/20 pt-5 text-base font-semibold text-[#2A3439]">
                    <p className="flex items-center gap-3">
                      <span aria-hidden="true" className="h-5 w-5 shrink-0 rounded-full border-2 border-white bg-[#2F6FED] ring-1 ring-[#2F6FED]" />
                      Starting point
                    </p>
                    <p className="flex items-center gap-3">
                      <span aria-hidden="true" className="h-5 w-5 shrink-0 rounded-full border-2 border-white bg-[#C83232] ring-1 ring-[#C83232]" />
                      Destination
                    </p>
                  </div>}

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
                
              </section>

              {!hasSearched && <RouteSearchMap
                deviceLocation={deviceLocation}
                origin={originPlace}
                destination={destinationPlace}
              />}
            </div>

            {result && (
              <section ref={resultsSection} aria-label="Recommended routes" className="mt-8 scroll-mt-6">
                    <h2
                      className="mb-5 text-3xl text-[#2A3439]"
                      style={{ fontFamily: '"DM Serif Display", serif' }}
                    >
                      Your recommended routes
                    </h2>

                <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
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
              </section>
            )}


          </>
        )}
            {result?.recommendationId && selectedRoute && (
              <div hidden={!viewingDetails}>
                <RouteChoice
                  key={result.recommendationId}
                  recommendationId={result.recommendationId}
                  routeId={selectedRoute.id}
                  onChoiceChange={setChoice}
                  visible={viewingDetails && !navigating}
                  canStartNavigation={canStartNavigation}
                  canContinueNavigation={
                    activeNavigation?.recommendationId === result.recommendationId &&
                    activeNavigation?.routeId === selectedRoute.id
                  }
                  onStartNavigation={() => {
                    if (canStartNavigation) {
                      setActiveNavigation({
                        recommendationId: result.recommendationId,
                        routeId: selectedRoute.id,
                      })
                      setNavigating(true)
                    }
                  }}
                  renderButton={(button) =>
                    choiceButtonContainer
                      ? createPortal(button, choiceButtonContainer)
                      : null
                  }
                />
              </div>
            )}
      </main>
    </div>
    </>
  )
}

export default Routes
