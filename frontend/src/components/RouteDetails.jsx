import { useEffect } from 'react'
import { useBusArrivals } from './useBusArrivals'
import { navigationTiming } from '../utils/navigationTiming'
import RouteModeChain from './transit/RouteModeChain'
import JourneyTimeline from './transit/JourneyTimeline'
import { formatDistance, getLegMode } from '../utils/transit'
import { hasCoordinates } from '../utils/geo'
import { createDestinationIcon } from '../utils/mapIcons'
import RouteConditions from './RouteConditions'

import {
    MapContainer,
    TileLayer,
    Polyline,
    Marker,
    Popup,
    useMap,
} from 'react-leaflet'

import {
    ArrowLeft,
    Clock,
    Footprints,
    Bus,
    Umbrella,
    Navigation,
} from 'lucide-react'

import 'leaflet/dist/leaflet.css'


// MAP

function FitRoute({ paths, origin, destination }) {
    const map = useMap()

    useEffect(() => {
        const points = paths.flat()

        if (hasCoordinates(origin)) {
            points.push([origin.latitude, origin.longitude])
        }

        if (hasCoordinates(destination)) {
            points.push([destination.latitude, destination.longitude])
        }

        if (points.length > 0) {
            map.fitBounds(points, {
                padding: [35, 35],
                maxZoom: 16,
            })
        }
    }, [map, paths, origin, destination])

    return null
}

const destinationIcon = createDestinationIcon({ size: 28 })


// COMPONENT

function RouteDetails({
    route,
    index,
    origin,
    destination,
    engine,
    onBack,
    choiceButtonRef,
    live = true,
}) {
    const paths = route.routePaths || []

    const start = route.legs?.[0]?.from || origin
    const end = route.legs?.at(-1)?.to || destination

    const isDemo = engine?.startsWith('mock')
    const showLiveTimes = live && !isDemo
    const { route: currentRoute, now, failed } = useBusArrivals(route, showLiveTimes)
    // Live preview assumes the journey starts now; otherwise show the planned times.
    const timing = showLiveTimes
        ? navigationTiming(currentRoute, { index: 0, fraction: 0 }, now, now)
        : { minutes: route.durationMinutes, buses: {}, stepTimes: {} }


    const isWalkingOnly = Array.isArray(route.legs) && route.legs.length > 0 && route.legs.every((leg) => getLegMode(leg) === 'WALK')
    return (
        <div>

            {/* BACK BUTTON */}
            <button
                type="button"
                onClick={onBack}
                className="mb-6 flex items-center gap-2 font-semibold text-[#3E424B] hover:underline"
            >
                <ArrowLeft size={20} />
                Back to recommended routes
            </button>


            {/* HEADER */}
            <div className="mb-6">

                {/* TITLE ROW */}
                <div className="flex flex-wrap items-center justify-between gap-4">

                    {/* ROUTE TITLE + BADGES */}
                    <div className="flex flex-wrap items-center gap-3">

                        <h1
                            className="text-4xl text-[#2A3439]"
                            style={{ fontFamily: '"DM Serif Display", serif' }}
                        >
                            Route {index + 1}
                        </h1>

                        {index === 0 && (
                            <span className="rounded-full bg-[#DCE7D2] px-3 py-1 text-sm font-semibold">
                                Recommended for you
                            </span>
                        )}

                        {isDemo && (
                            <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-900">
                                Demo route
                            </span>
                        )}

                    </div>


                    <div className="flex flex-wrap items-center gap-3">
                        <div ref={choiceButtonRef} />
                    </div>

                </div>


                {/* ORIGIN AND DESTINATION */}
                <p className="mt-2 text-[#555C60]">
                    {origin?.name} → {destination?.name}
                </p>


                {/* ROUTE SUMMARY */}
                <div className="mt-3">
                    <RouteModeChain legs={route.legs} size="md" />
                </div>


                {/* DEMO NOTICE */}
                {isDemo && (
                    <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                        This route uses sample data and should not be used for navigation.
                    </p>
                )}

            </div>


            {/* MAIN CONTENT */}
            <div className="grid items-start gap-6 lg:grid-cols-[1fr_1fr]">

                {/* LEFT: JOURNEY INFORMATION */}
                <section className="rounded-[24px] bg-white p-5 sm:p-6">

                    <h2
                        className="text-2xl"
                        style={{ fontFamily: '"DM Serif Display", serif' }}
                    >
                        Journey overview
                    </h2>


                    {/* SUMMARY */}
                    <div className="mt-6 grid grid-cols-2 gap-5">

                        {/* DURATION */}
                        <div>
                            <Clock size={20} />
                            <p className="mt-2 text-sm text-[#555C60]">
                                Duration
                            </p>
                            <p className="font-semibold">
                                {timing.minutes == null
                                    ? 'Unavailable'
                                    : `${timing.minutes} min`}
                            </p>
                        </div>

                        {/* TOTAL DISTANCE */}
                        <div>
                            <Navigation size={20} />
                            <p className="mt-2 text-sm text-[#555C60]">
                                Total distance
                            </p>
                            <p className="font-semibold">
                                {formatDistance(route.distanceMeters)}
                            </p>
                        </div>

                        {/* WALKING DURATION */}
                        <div>
                            <Footprints size={20} />
                            <p className="mt-2 text-sm text-[#555C60]">
                                Walking
                            </p>
                            <p className="font-semibold">
                                {route.walkingMinutes == null
                                    ? 'Unavailable'
                                    : `${route.walkingMinutes} min`}
                            </p>
                        </div>

                        {/* WALKING DISTANCE */}
                        <div>
                            <Footprints size={20} />
                            <p className="mt-2 text-sm text-[#555C60]">
                                Walking distance
                            </p>
                            <p className="font-semibold">
                                {formatDistance(route.walkingDistanceMeters)}
                            </p>
                        </div>

                        {/* TRANSFERS */}
                        <div>
                            <Bus size={20} />
                            <p className="mt-2 text-sm text-[#555C60]">
                                Transfers
                            </p>
                            <p className="font-semibold">
                                {route.transfers ?? 'Unavailable'}
                            </p>
                        </div>

                        {/* SHELTERED WALKING */}
                        <div>
                            <Umbrella size={20} />
                            <p className="mt-2 text-sm text-[#555C60]">
                                Sheltered walking
                            </p>
                            <p className="font-semibold">
                                {formatDistance(route.estimatedShelteredWalkingMeters)}
                            </p>
                        </div>

                    </div>

                    {/* JOURNEY STEPS */}
                    <div className="mt-8 border-t border-[#7A7F7A]/20 pt-6">

                        <h3 className="text-xl font-semibold">
                            Journey steps
                        </h3>
                        {isWalkingOnly && (
                            <div
                                role="status"
                                className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
                            >
                                <p className="font-semibold">
                                    No public transport legs found
                                </p>

                                <p className="mt-1">
                                    This itinerary contains walking only. Public transport
                                    availability may be limited at your selected departure time.
                                </p>
                            </div>
                        )}

                        <JourneyTimeline
                            legs={route.legs}
                            timing={timing}
                            now={now}
                            failed={failed}
                            live={showLiveTimes}
                        />

                    </div>

                </section>


                {/* RIGHT: INTERACTIVE MAP */}
                <section className="order-first h-[320px] overflow-hidden rounded-[24px] border border-[#7A7F7A]/20 bg-white sm:h-[500px] lg:order-none lg:sticky lg:top-6 lg:h-[calc(100vh-80px)]">

                    <MapContainer
                        center={[1.3521, 103.8198]}
                        zoom={12}
                        scrollWheelZoom={true}
                        className="h-full w-full"
                    >

                        <TileLayer
                            url="https://www.onemap.gov.sg/maps/tiles/Default/{z}/{x}/{y}.png"
                            attribution="&copy; OneMap contributors"
                        />

                        <FitRoute
                            paths={paths}
                            origin={start}
                            destination={end}
                        />


                        {/* START MARKER */}
                        {hasCoordinates(start) && (
                            <Marker
                                position={[start.latitude, start.longitude]}
                            >
                                <Popup>Starting point</Popup>
                            </Marker>
                        )}


                        {/* DESTINATION MARKER */}
                        {hasCoordinates(end) && (
                            <Marker
                                position={[end.latitude, end.longitude]}
                                icon={destinationIcon}
                            >
                                <Popup>Destination</Popup>
                            </Marker>
                        )}


                        {/* ROUTE PATH */}
                        {paths.length > 0 && (
                            <>
                                <Polyline
                                    positions={paths}
                                    pathOptions={{
                                        color: 'white',
                                        weight: 10,
                                    }}
                                />

                                <Polyline
                                    positions={paths}
                                    pathOptions={{
                                        color: '#2F6FED',
                                        weight: 6,
                                    }}
                                />
                            </>
                        )}

                    </MapContainer>

                </section>

            </div>

            {/* ROUTE CONDITIONS */}
            <RouteConditions
                sources={route.evidence ?? []}
            />

        </div>
    )
}

export default RouteDetails
