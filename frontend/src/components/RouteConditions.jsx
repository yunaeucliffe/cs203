import { createElement, useState } from 'react'
import {
    CheckCircle2,
    ChevronDown,
    Clock,
    CloudRain,
    Thermometer,
    Train,
    Users,
    Accessibility,
    Database,
} from 'lucide-react'

function formatTimestamp(value) {
    if (!value) return 'Time unavailable'

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
        return String(value)
    }

    return new Intl.DateTimeFormat('en-SG', {
        timeZone: 'Asia/Singapore',
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(date)
}

function getSourceLabel(source) {
    const labels = {
        'LTA BusArrival': 'Bus arrivals',
        'LTA FacilitiesMaintenance': 'Facility maintenance',
        'LTA TrainServiceAlerts': 'Train service alerts',
        'LTA PCDRealTime': 'Station crowding',
        'NEA Rainfall': 'Rainfall observations',
        'NEA Air Temperature': 'Temperature observations',
        'LTA CoveredLinkWay': 'Covered walkway estimate',
    }

    if (labels[source]) return labels[source]

    if (!source) return 'Other condition information'

    return String(source)
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/[_-]+/g, ' ')
}

function getConditionIcon(source) {
    if (source === 'NEA Air Temperature') return Thermometer
    if (source?.includes('Rainfall')) return CloudRain
    if (source?.includes('TrainServiceAlerts')) return Train
    if (source?.includes('PCDRealTime')) return Users
    if (source?.includes('FacilitiesMaintenance')) return Accessibility

    return Database
}

function getEvidenceStatus(evidence) {
    if (evidence?.availability === 'available') {
        return {
            label: 'Available',
            className: 'bg-emerald-100 text-emerald-900',
        }
    }

    const reason = String(
        evidence?.details?.reason || ''
    ).toLowerCase()

    if (
        reason.includes('no matching') ||
        reason.includes('no recent') ||
        reason.includes('not found')
    ) {
        return {
            label: 'Not confirmed',
            className: 'bg-amber-100 text-amber-900',
        }
    }

    return {
        label: 'Unavailable',
        className: 'bg-amber-100 text-amber-900',
    }
}

function makeReasonUserFriendly(reason, source) {
    const text = String(reason).trim()
    const normalized = text.toLowerCase()

    if (
        normalized.includes('no recent crowd') ||
        normalized.includes('crowd observations')
    ) {
        return (
            'Recent crowd information could not be obtained for ' +
            'the relevant stations. Actual crowd levels may differ.'
        )
    }

    if (
        normalized.includes('maintenance') &&
        (
            normalized.includes('unavailable') ||
            normalized.includes('no matching')
        )
    ) {
        return (
            'No matching maintenance information was found. ' +
            'This does not confirm that all facilities are working.'
        )
    }

    if (
        normalized.includes('rainfall') ||
        source === 'NEA Rainfall'
    ) {
        return 'Recent rainfall information is unavailable for this route.'
    }

    if (source === 'NEA Air Temperature') {
        return 'Recent temperature information is unavailable for this route.'
    }

    if (normalized.includes('bus arrival')) {
        return 'Recent bus arrival information is unavailable for this route.'
    }

    if (
        normalized.includes('stale or invalid') ||
        normalized.includes('too old')
    ) {
        return (
            'The available information is too old or incomplete ' +
            'to confirm current conditions.'
        )
    }

    return text
}

function getEvidenceMessages(evidence) {
    const details = evidence?.details || {}
    const messages = []

    if (details.reason) {
        messages.push(
            makeReasonUserFriendly(
                details.reason,
                evidence?.source
            )
        )
    }

    if (details.note) {
        messages.push(String(details.note))
    }

    if (Array.isArray(details.notices)) {
        messages.push(
            ...details.notices.map(String)
        )
    }

    if (Array.isArray(details.messages)) {
        messages.push(
            ...details.messages.map(String)
        )
    }

    if (Array.isArray(details.matchedMaintenance)) {
        if (details.matchedMaintenance.length === 0) {
            messages.push(
                'No matching maintenance records were returned. ' +
                'This does not confirm that all facilities are working.'
            )
        } else {
            details.matchedMaintenance.forEach((item, index) => {
                const description = [
                    item.StationName || item.Station,
                    item.LiftDesc,
                    item.Line,
                ]
                    .filter(Boolean)
                    .join(' · ')

                messages.push(
                    description || `Maintenance record ${index + 1}`
                )
            })
        }
    }

    if (Array.isArray(details.stations) && details.stations.length > 0) {
        const readableLevel = { l: 'Low', m: 'Moderate', h: 'High' }

        const parts = details.stations.map((station) => {
            const level = String(station.CrowdLevel || '').toLowerCase()
            return `${station.Station || 'Station'}: ${readableLevel[level] || station.CrowdLevel || 'Unknown'}`
        })

        messages.push(`Crowding — ${parts.join(', ')}`)
    }

    if (Array.isArray(details.observations) && details.observations.some(
        (observation) => Object.hasOwn(observation, 'temperatureCelsius')
    )) {
        const temperatures = details.observations
            .map((observation) => observation.temperatureCelsius)
            .filter((value) => typeof value === 'number' && Number.isFinite(value))
        if (temperatures.length > 0) {
            const low = Math.min(...temperatures)
            const high = Math.max(...temperatures)
            messages.push(`Nearby air temperature: ${low === high ? `${low}°C` : `${low}–${high}°C`}.`)
        } else {
            messages.push('Nearby temperature readings are unavailable.')
        }
    } else if (Array.isArray(details.observations) && details.observations.length > 0) {
        const readings = details.observations
            .map((observation) => Number(observation.rainfallMm))
            .filter(Number.isFinite)

        if (readings.length > 0) {
            const heaviest = Math.max(...readings)

            messages.push(
                heaviest > 0
                    ? `Rain detected near your route: up to ${heaviest} mm recorded nearby.`
                    : 'No rainfall detected near your route in the last few minutes.'
            )
        } else {
            messages.push('Nearby rain gauge readings are unavailable.')
        }
    }

    if (Number.isFinite(Number(details.estimatedShelteredWalkingMeters))
        && details.estimatedShelteredWalkingMeters !== null
        && details.estimatedShelteredWalkingMeters !== undefined) {
        const distance = Number(
            details.estimatedShelteredWalkingMeters
        )

        messages.push(
            `Estimated sheltered walking: ${Math.round(distance)} m`
        )
    }

    if (details.method) {
        messages.push(String(details.method))
    }

    if (
        evidence?.availability === 'available' &&
        messages.length === 0
    ) {
        messages.push(
            'The source returned data, but no additional details are available.'
        )
    }

    if (
        evidence?.availability !== 'available' &&
        messages.length === 0
    ) {
        messages.push(
            'We could not verify this condition with the available data.'
        )
    }

    // Remove repeated messages within a single evidence card.
    return [...new Set(messages)]
}

function EvidenceCard({ evidence }) {
    const iconElement = getConditionIcon(evidence?.source)
    const status = getEvidenceStatus(evidence)
    const messages = getEvidenceMessages(evidence)

    return (
        <article className="rounded-xl border border-[#7A7F7A]/20 bg-white p-4">
            <div className="flex items-start gap-3">
                <div className="rounded-lg bg-[#DCE7D2] p-2">
                    {createElement(iconElement, {
                        size: 20,
                        className: 'text-[#2A3439]',
                    })}
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-semibold text-[#2A3439]">
                            {getSourceLabel(evidence?.source)}
                        </h4>

                        <span
                            className={`rounded-full px-2 py-1 text-xs font-semibold ${status.className}`}
                        >
                            {status.label}
                        </span>
                    </div>

                    {messages.length > 0 && (
                        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-[#555C60]">
                            {messages.map((message, index) => (
                                <li key={`${message}-${index}`}>
                                    {message}
                                </li>
                            ))}
                        </ul>
                    )}

                    <div className="mt-4 space-y-1 border-t border-[#7A7F7A]/15 pt-3 text-xs text-[#7A7F7A]">
                        <p>
                            Observed:{' '}
                            {formatTimestamp(evidence?.observedAt)}
                        </p>

                        <p>
                            Retrieved:{' '}
                            {formatTimestamp(evidence?.retrievedAt)}
                        </p>
                    </div>
                </div>
            </div>
        </article>
    )
}

function RouteConditions({ sources = [] }) {
    const [open, setOpen] = useState(false)
    const evidenceItemsRaw = Array.isArray(sources)
        ? sources
        : []

    // Remove exact duplicate evidence records.
    // Different records from the same source are preserved.
    const evidenceMap = new Map()

    evidenceItemsRaw.forEach((evidence) => {
        const key = JSON.stringify({
            source: evidence?.source || '',
            availability: evidence?.availability || '',
            observedAt: evidence?.observedAt || null,
            retrievedAt: evidence?.retrievedAt || null,
            details: evidence?.details || {},
        })

        if (!evidenceMap.has(key)) {
            evidenceMap.set(key, evidence)
        }
    })

    const evidenceItems = [...evidenceMap.values()]

    return (
        <section className="mt-6 rounded-[24px] border border-[#7A7F7A]/20 bg-[#FAF7F0] p-5 sm:p-6">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                aria-expanded={open}
                aria-controls="route-conditions-content"
                className="flex w-full items-center justify-between gap-3 text-left"
            >
                <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-[#DCE7D2] p-3">
                        <CheckCircle2
                            size={22}
                            className="text-[#2A3439]"
                        />
                    </div>

                    <div>
                        <h2
                            className="text-2xl text-[#2A3439]"
                            style={{
                                fontFamily: '"DM Serif Display", serif',
                            }}
                        >
                            Route conditions
                        </h2>

                        <p className="mt-1 text-sm leading-relaxed text-[#555C60]">
                            Review reported conditions and data availability
                            before starting your journey.
                        </p>
                    </div>
                </div>

                <ChevronDown
                    size={20}
                    className={`shrink-0 text-[#555C60] transition-transform ${open ? 'rotate-180' : ''}`}
                />
            </button>

            {open && (
                <div id="route-conditions-content">
                    {/* Condition information */}
                    <div className="mt-6 border-t border-[#7A7F7A]/20 pt-5">
                        {evidenceItems.length > 0 ? (
                            <div className="grid gap-3">
                                {evidenceItems.map((evidence, index) => (
                                    <EvidenceCard
                                        key={`${evidence?.source || 'source'}-${index}`}
                                        evidence={evidence}
                                    />
                                ))}
                            </div>
                        ) : (
                            <p className="rounded-xl bg-white p-3 text-sm text-[#555C60]">
                                Condition data was not provided for this route.
                                Current conditions therefore remain unverified.
                            </p>
                        )}
                    </div>

                    {/* Estimate and data limitations */}
                    <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-4">
                        <div className="flex items-start gap-2">
                            <Clock
                                size={19}
                                className="mt-0.5 shrink-0 text-blue-900"
                            />

                            <div>
                                <h3 className="font-semibold text-blue-950">
                                    Important limitations
                                </h3>

                                <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-relaxed text-blue-950">
                                    <li>
                                        Travel times and route estimates may
                                        differ from actual journey conditions.
                                    </li>

                                    <li>
                                        Live information may be delayed,
                                        incomplete, or unavailable.
                                    </li>

                                    <li>
                                        Nearby rainfall readings describe
                                        observed conditions, not a route-specific
                                        weather forecast.
                                    </li>

                                    <li>
                                        Missing maintenance reports do not
                                        guarantee that lifts or other facilities
                                        are operational.
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </section>
    )
}

export default RouteConditions