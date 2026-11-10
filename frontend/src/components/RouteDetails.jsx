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
    warnings = [],
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
            {/* On mobile, "Choose this route" sits between the mode chain and route notices;
                on sm+ it sits beside the title, same as before. A CSS grid with named areas
                lets the one button slot (and its portal ref) move between the two spots. */}
            <div
                className="mb-6 grid gap-y-3 [grid-template-areas:'title'_'origin'_'summary'_'button'_'notices'_'demo'] sm:grid-cols-[1fr_auto] sm:items-center sm:gap-x-4 sm:[grid-template-areas:'title_button'_'origin_origin'_'summary_summary'_'notices_notices'_'demo_demo']"
            >

                {/* ROUTE TITLE + BADGES */}
                <div className="flex flex-wrap items-center gap-3 [grid-area:title]">

                    <h1
                        className="text-4xl text-[#2A3439]"
                        style={{ fontFamily: '"DM Serif Display", serif' }}
                    >
                        Route {index + 1}
                    </h1>

                    {index === 0 && (
                        <span className="rounded-full bg-[#DCE7D2] px-3 py-1 text-sm font-semibold">
                            {isWalkingOnly ? 'Walking option' : 'Recommended for you'}
                        </span>
                    )}

                    {isDemo && (
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-900">
                            Demo route
                        </span>
                    )}

                </div>


                {/* CHOOSE THIS ROUTE */}
                <div className="flex flex-wrap items-center gap-3 [grid-area:button] sm:justify-self-end">
                    <div ref={choiceButtonRef} />
                </div>


                {/* ORIGIN AND DESTINATION */}
                <p className="text-[#555C60] [grid-area:origin]">
                    {origin?.name} → {destination?.name}
                </p>


                {/* ROUTE SUMMARY */}
                <div className="[grid-area:summary]">
                    {isWalkingOnly && <p className="mb-2 text-lg font-semibold">Walk all the way</p>}
                    <RouteModeChain legs={route.legs} size="md" />
                    {isWalkingOnly && route.reasons?.length > 0 && (
                        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[#555C60]">
                            {route.reasons.map((reason, i) => <li key={i}>{reason}</li>)}
                        </ul>
                    )}
                </div>


                {(warnings.length > 0 || route.warnings?.length > 0) && (
                    <details className="rounded-xl border border-amber-200 bg-amber-50 p-4 [grid-area:notices]">
                        <summary className="cursor-pointer font-semibold">Route notices</summary>
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                            {[...new Set([...warnings, ...(route.warnings || [])])].map((warning, i) => <li key={i}>{warning}</li>)}
                        </ul>
                    </details>
                )}

                {/* DEMO NOTICE */}
                {isDemo && (
                    <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900 [grid-area:demo]">
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

                    {route.weatherNote && (
                        <p className="mt-5 rounded-xl bg-[#F0F4EC] p-3 text-sm leading-relaxed text-[#3E424B]">
                            {route.weatherNote}
                        </p>
                    )}

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
                                    Walking-only journey
                                </p>

                                <p className="mt-1">
                                    This route takes you all the way on foot. No bus or train
                                    transfers are needed.
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
