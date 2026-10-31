import { TripSharingButton } from './TripSharing'
import { useEffect } from 'react'
import useBusArrivals from '../hooks/useBusArrivals'
import RouteModeChain from './transit/RouteModeChain'
import JourneyTimeline from './transit/JourneyTimeline'
import { formatDistance } from '../utils/transit'
import { hasCoordinates } from '../utils/geo'
import { createDestinationIcon } from '../utils/mapIcons'

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
    Accessibility,
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
    canShare = false,
}) {
    const paths = route.routePaths || []

    const start = route.legs?.[0]?.from || origin
    const end = route.legs?.at(-1)?.to || destination

    const isDemo = engine?.startsWith('mock')

    const { buses: liveBuses } = useBusArrivals(route, !isDemo)

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


                    <div className="flex flex-wrap items-center gap-3">
                        <div ref={choiceButtonRef} />
                        <TripSharingButton key={route.id} canShare={canShare} route={route} origin={origin} destination={destination} />
                    </div>

                </div>


                {/* ORIGIN AND DESTINATION */}
                <p className="mt-2 text-[#7A7F7A]">
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

                    {/* JOURNEY STEPS */}
                    <div className="mt-8 border-t border-[#7A7F7A]/20 pt-6">

                        <h3 className="text-xl font-semibold">
                            Journey steps
                        </h3>

                        <JourneyTimeline
                            legs={route.legs}
                            liveBuses={liveBuses}
                            live={!isDemo}
                        />

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
