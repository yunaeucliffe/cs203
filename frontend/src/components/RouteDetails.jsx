import TripSharing from './TripSharing'
import { useEffect } from 'react'
import L from 'leaflet'
import BusArrivals from './BusArrivals'

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
    Train,
    Umbrella,
    Navigation,
    Accessibility,
} from 'lucide-react'

import 'leaflet/dist/leaflet.css'


// HELPERS

function hasCoordinates(location) {
    return Number.isFinite(location?.latitude) &&
        Number.isFinite(location?.longitude)
}

function formatDuration(seconds) {
    if (seconds == null || !Number.isFinite(Number(seconds))) {
        return 'Unavailable'
    }

    return `${Math.ceil(Number(seconds) / 60)} min`
}

function formatDistance(meters) {
    if (meters == null || !Number.isFinite(Number(meters))) {
        return 'Unavailable'
    }

    const distance = Number(meters)

    if (distance >= 1000) {
        return `${(distance / 1000).toFixed(1)} km`
    }

    return `${Math.round(distance)} m`
}

function formatTime(time) {
    if (!time) return null

    const date = new Date(time)

    if (Number.isNaN(date.getTime())) {
        return null
    }

    return new Intl.DateTimeFormat('en-SG', {
        timeZone: 'Asia/Singapore',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    }).format(date)
}

function getMode(leg) {
    const mode = String(leg.mode || '').toUpperCase()

    if (mode.includes('WALK')) return 'WALK'
    if (mode.includes('BUS')) return 'BUS'

    if (
        mode.includes('TRAIN') ||
        mode.includes('MRT') ||
        mode.includes('LRT') ||
        mode.includes('RAIL') ||
        mode.includes('SUBWAY')
    ) {
        return 'TRAIN'
    }

    return mode || 'OTHER'
}

function getInstruction(leg) {
    const mode = getMode(leg)

    const from = leg.from?.name
    const to = leg.to?.name
    const service = leg.service

    if (mode === 'WALK') {
        return to ? `Walk to ${to}` : 'Walk to the next stop'
    }

    if (mode === 'BUS') {
        return service
            ? `Take Bus ${service}${to ? ` to ${to}` : ''}`
            : `Take the bus${to ? ` to ${to}` : ''}`
    }

    if (mode === 'TRAIN') {
        return service
            ? `Take ${service}${to ? ` to ${to}` : ''}`
            : `Take the train${to ? ` to ${to}` : ''}`
    }

    return from && to
        ? `Travel from ${from} to ${to}`
        : 'Continue your journey'
}

function getModeLabel(leg) {
    const mode = getMode(leg)

    if (mode === 'WALK') return 'Walking'
    if (mode === 'BUS') return 'Bus'
    if (mode === 'TRAIN') return 'Train'

    return 'Transport'
}

function ModeIcon({ mode }) {
    if (mode === 'WALK') return <Footprints size={19} />
    if (mode === 'BUS') return <Bus size={19} />
    if (mode === 'TRAIN') return <Train size={19} />

    return <Navigation size={19} />
}


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

const destinationIcon = L.divIcon({
    className: '',
    html: `
        <div style="
            width: 28px;
            height: 28px;
            background: #e53935;
            border: 3px solid white;
            border-radius: 50%;
        "></div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
})


// COMPONENT

function RouteDetails({
    route,
    index,
    origin,
    destination,
    engine,
    onBack,
    choiceButtonRef,
}) {
    const paths = route.routePaths || []

    const start = route.legs?.[0]?.from || origin
    const end = route.legs?.at(-1)?.to || destination

    const isDemo = engine?.startsWith('mock')

    const accessibility = route.accessibility

    const accessibilityText =
        accessibility == null
            ? 'Unverified'
            : typeof accessibility === 'string'
                ? accessibility
                : typeof accessibility === 'boolean'
                    ? (accessibility ? 'Accessible' : 'Not accessible')
                    : accessibility.verified === true
                        ? (accessibility.summary || accessibility.status || 'Verified')
                        : 'Unverified'

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


                    <div ref={choiceButtonRef} />

                </div>


                {/* ORIGIN AND DESTINATION */}
                <p className="mt-2 text-[#7A7F7A]">
                    {origin?.name} → {destination?.name}
                </p>


                {/* ROUTE SUMMARY */}
                <p className="mt-2 text-[#555C60]">
                    {route.summary}
                </p>
                <TripSharing key={route.id} route={route} origin={origin} destination={destination} />
                <BusArrivals key={route.id} route={route} live={!isDemo} />


                {/* DEMO NOTICE */}
                {isDemo && (
                    <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                        This route uses sample data and should not be used for navigation.
                    </p>
                )}

            </div>


            {/* MAIN CONTENT */}
            <div className="grid items-start gap-6 lg:grid-cols-[0.85fr_1.15fr]">

                {/* LEFT: JOURNEY INFORMATION */}
                <section className="rounded-[24px] bg-white p-6">

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
                            <p className="mt-2 text-sm text-[#7A7F7A]">
                                Duration
                            </p>
                            <p className="font-semibold">
                                {route.durationMinutes == null
                                    ? 'Unavailable'
                                    : `${route.durationMinutes} min`}
                            </p>
                        </div>

                        {/* TOTAL DISTANCE */}
                        <div>
                            <Navigation size={20} />
                            <p className="mt-2 text-sm text-[#7A7F7A]">
                                Total distance
                            </p>
                            <p className="font-semibold">
                                {formatDistance(route.distanceMeters)}
                            </p>
                        </div>

                        {/* WALKING DURATION */}
                        <div>
                            <Footprints size={20} />
                            <p className="mt-2 text-sm text-[#7A7F7A]">
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
                            <p className="mt-2 text-sm text-[#7A7F7A]">
                                Walking distance
                            </p>
                            <p className="font-semibold">
                                {formatDistance(route.walkingDistanceMeters)}
                            </p>
                        </div>

                        {/* TRANSFERS */}
                        <div>
                            <Bus size={20} />
                            <p className="mt-2 text-sm text-[#7A7F7A]">
                                Transfers
                            </p>
                            <p className="font-semibold">
                                {route.transfers ?? 'Unavailable'}
                            </p>
                        </div>

                        {/* SHELTERED WALKING */}
                        <div>
                            <Umbrella size={20} />
                            <p className="mt-2 text-sm text-[#7A7F7A]">
                                Sheltered walking
                            </p>
                            <p className="font-semibold">
                                {formatDistance(route.estimatedShelteredWalkingMeters)}
                            </p>
                        </div>

                    </div>


                    {/* ACCESSIBILITY */}
                    <div className="mt-6 border-t border-[#7A7F7A]/20 pt-5">

                        <div className="flex items-center gap-3">
                            <Accessibility size={21} />

                            <div>
                                <p className="font-semibold">
                                    Accessibility
                                </p>

                                <p className="text-sm text-[#7A7F7A]">
                                    {accessibilityText}
                                </p>
                            </div>
                        </div>

                    </div>

                    {/* RECOMMENDATION REASONS */}
                    {route.reasons?.length > 0 && (
                        <div className="mt-6 rounded-xl bg-[#DCE7D2]/50 p-4">

                            <h3 className="font-semibold">
                                Why this route?
                            </h3>
                            <p className="mt-2 text-sm">
                                These comparisons describe the route’s trade-offs. Route order is selected by AI.
                            </p>

                            <ul className="mt-2 list-disc space-y-2 pl-5 text-sm">
                                {route.reasons.map((reason, i) => (
                                    <li key={i}>{reason}</li>
                                ))}
                            </ul>

                        </div>
                    )}

                    {/* JOURNEY STEPS */}
                    <div className="mt-8 border-t border-[#7A7F7A]/20 pt-6">

                        <h3 className="text-xl font-semibold">
                            Journey steps
                        </h3>

                        {route.legs?.length > 0 ? (

                            <div className="mt-5 space-y-6">

                                {route.legs.map((leg, legIndex) => {

                                    const mode = getMode(leg)
                                    const startTime = formatTime(leg.startTime)
                                    const endTime = formatTime(leg.endTime)

                                    return (
                                        <div
                                            key={legIndex}
                                            className="flex gap-4"
                                        >

                                            {/* STEP NUMBER */}
                                            <div className="flex flex-col items-center">

                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#DCE7D2] font-semibold">
                                                    {legIndex + 1}
                                                </div>

                                                {legIndex < route.legs.length - 1 && (
                                                    <div className="mt-2 min-h-6 w-px flex-1 bg-[#7A7F7A]/30" />
                                                )}

                                            </div>


                                            {/* STEP CONTENT */}
                                            <div className="min-w-0 flex-1 pb-3">

                                                {/* TRANSPORT MODE */}
                                                <div className="flex items-center gap-2 text-sm font-semibold text-[#7A7F7A]">
                                                    <ModeIcon mode={mode} />
                                                    {getModeLabel(leg)}

                                                    {leg.service && (
                                                        <span>· {leg.service}</span>
                                                    )}
                                                </div>


                                                {/* INSTRUCTION */}
                                                <p className="mt-2 font-semibold">
                                                    {getInstruction(leg)}
                                                </p>


                                                {/* FROM */}
                                                {leg.from?.name && (
                                                    <p className="mt-1 text-sm text-[#7A7F7A]">
                                                        FROM: {leg.from.name}
                                                    </p>
                                                )}


                                                {/* INTERMEDIATE STOPS */}
                                                {mode !== 'WALK' &&
                                                    Array.isArray(leg.intermediateStops) &&
                                                    leg.intermediateStops.length > 0 && (

                                                        <details className="mt-3 rounded-xl bg-[#FAF7F0] p-3">

                                                            <summary className="cursor-pointer text-sm font-semibold">
                                                                View {leg.intermediateStops.length} intermediate stops
                                                            </summary>

                                                            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-[#555C60]">
                                                                {leg.intermediateStops.map((stop, stopIndex) => (
                                                                    <li key={stopIndex}>
                                                                        {typeof stop === 'string'
                                                                            ? stop
                                                                            : stop.name || `Stop ${stopIndex + 1}`}
                                                                    </li>
                                                                ))}
                                                            </ol>

                                                        </details>

                                                    )}


                                                {/* TO */}
                                                {leg.to?.name && (
                                                    <p className="mt-2 text-sm text-[#7A7F7A]">
                                                        TO: {leg.to.name}
                                                    </p>
                                                )}


                                                {/* DURATION + DISTANCE */}
                                                <p className="mt-2 text-sm text-[#555C60]">
                                                    {formatDuration(leg.durationSeconds)}
                                                    {' · '}
                                                    {formatDistance(leg.distanceMeters)}
                                                </p>


                                                {/* DEPARTURE / ARRIVAL */}
                                                {(startTime || endTime) && (
                                                    <p className="mt-2 text-sm text-[#555C60]">
                                                        {startTime && `Depart ${startTime}`}
                                                        {startTime && endTime && ' · '}
                                                        {endTime && `Arrive ${endTime}`}
                                                    </p>
                                                )}

                                            </div>

                                        </div>
                                    )
                                })}

                            </div>

                        ) : (

                            <p className="mt-4 text-sm text-[#7A7F7A]">
                                Detailed journey instructions are not available.
                            </p>

                        )}

                    </div>

                </section>


                {/* RIGHT: INTERACTIVE MAP */}
                <section className="h-[500px] overflow-hidden rounded-[24px] border border-[#7A7F7A]/20 bg-white lg:sticky lg:top-6 lg:h-[calc(100vh-80px)]">

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

        </div>
    )
}

export default RouteDetails
