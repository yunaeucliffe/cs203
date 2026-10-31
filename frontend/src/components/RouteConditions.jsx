import { createElement } from 'react'
import {
    AlertTriangle,
    CheckCircle2,
    Clock,
    CloudRain,
    Info,
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
        'LTA CoveredLinkWay': 'Covered walkway estimate',
    }

    if (labels[source]) return labels[source]

    if (!source) return 'Other condition information'

    return String(source)
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/[_-]+/g, ' ')
}

function getConditionIcon(source) {
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

    if (Array.isArray(details.stations)) {
        details.stations.forEach((station) => {
            const name = station.Station || 'Station'
            const level = String(
                station.CrowdLevel || ''
            ).toLowerCase()

            const readableLevel = {
                l: 'Low',
                m: 'Moderate',
                h: 'High',
            }[level] || station.CrowdLevel || 'Unknown'

            messages.push(`${name}: ${readableLevel} crowding`)
        })
    }

    if (Array.isArray(details.observations)) {
        details.observations.forEach((observation) => {
            const rainfall = Number(observation.rainfallMm)

            const rainfallText = Number.isFinite(rainfall)
                ? `${rainfall} mm recorded`
                : 'Rainfall amount unavailable'

            const distance = Number(
                observation.distanceFromWalkingEndpointMeters
            )

            const distanceText = Number.isFinite(distance)
                ? `, approximately ${Math.round(distance)} m from a walking endpoint`
                : ''

            messages.push(
                `Nearby rain gauge: ${rainfallText}${distanceText}`
            )
        })
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

function rewriteWarning(warning) {
    const text = String(warning).trim()

    // Split combined messages into individual sentences.
    const sentences = text
        .split(/(?<=[.!?])\s+/)
        .map(sentence => sentence.trim())
        .filter(Boolean)

    const normalizedSentences = sentences.map(sentence => {
        const normalized = sentence.toLowerCase()

        // Normalize accessibility warnings.
        if (
            normalized.includes('accessibility') &&
            (
                normalized.includes('not verified') ||
                normalized.includes('unverified')
            )
        ) {
            return 'Accessibility has not been verified.'
        }

        // Normalize crowd-data warnings.
        if (
            normalized.includes('pcd realtime') ||
            normalized.includes('crowd observations') ||
            normalized.includes('no recent crowd')
        ) {
            return 'Recent crowd information is unavailable for the relevant stations.'
        }

        return sentence
    })

    // Remove duplicate sentences while preserving their order.
    return [...new Map(
        normalizedSentences.map(sentence => [
            sentence.toLowerCase(),
            sentence
        ])
    ).values()].join(' ')
}

function getWarningText(warning) {
    if (typeof warning === 'string') {
        return warning.trim()
    }

    return String(
        warning?.message ||
        warning?.description ||
        JSON.stringify(warning)
    ).trim()
}

function RouteConditions({ warnings = [], sources = [] }) {
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

    const warningItemsRaw = Array.isArray(warnings)
        ? warnings
        : warnings
            ? [warnings]
            : []

        // Rewrite warnings first, then consolidate duplicate issues.
    const warningMap = new Map()

    warningItemsRaw.forEach((warning) => {
        const message = rewriteWarning(getWarningText(warning))

        if (!message) return

        const normalized = message.toLowerCase()
        let key = normalized

        if (
            normalized.includes('accessibility') &&
            (
                normalized.includes('not verified') ||
                normalized.includes('unverified')
            )
        ) {
            key = 'accessibility-not-verified'
        } else if (
            normalized.includes('busarrival') ||
            normalized.includes('bus arrival') ||
            normalized.includes('arrival data')
        ) {
            key = 'bus-arrival-unavailable'
        }

        if (!warningMap.has(key)) {
            warningMap.set(key, message)
        }
    })

    const warningItems = [...warningMap.values()]

    return (
        <section
            aria-labelledby="route-conditions-heading"
            className="mt-6 rounded-[24px] border border-[#7A7F7A]/20 bg-[#FAF7F0] p-5 sm:p-6"
        >
            <div className="flex items-start gap-3">
                <div className="rounded-xl bg-amber-100 p-3">
                    <AlertTriangle
                        size={22}
                        className="text-amber-900"
                    />
                </div>

                <div>
                    <h2
                        id="route-conditions-heading"
                        className="text-2xl text-[#2A3439]"
                        style={{
                            fontFamily: '"DM Serif Display", serif',
                        }}
                    >
                        Route conditions & warnings
                    </h2>

                    <p className="mt-1 text-sm leading-relaxed text-[#555C60]">
                        Review reported conditions and data availability
                        before starting your journey.
                    </p>
                </div>
            </div>

            {/* Route warnings */}
            <div className="mt-5">
                <h3 className="flex items-center gap-2 font-semibold text-[#2A3439]">
                    <AlertTriangle size={18} />
                    Route warnings
                </h3>

                {warningItems.length > 0 ? (
                    <ul className="mt-3 space-y-2">
                        {warningItems.map((warning) => (
                            <li
                                key={warning.toLowerCase()}
                                className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-relaxed text-amber-950"
                            >
                                {warning}
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="mt-3 flex items-start gap-2 rounded-xl bg-white p-3 text-sm text-[#555C60]">
                        <Info
                            size={18}
                            className="mt-0.5 shrink-0"
                        />

                        <span>
                            No route warnings were supplied. This does
                            not guarantee that the journey is free of
                            disruptions.
                        </span>
                    </p>
                )}
            </div>

            {/* Condition information */}
            <div className="mt-6 border-t border-[#7A7F7A]/20 pt-5">
                <h3 className="flex items-center gap-2 font-semibold text-[#2A3439]">
                    <CheckCircle2 size={18} />
                    Condition data
                </h3>

                {evidenceItems.length > 0 ? (
                    <div className="mt-3 grid gap-3">
                        {evidenceItems.map((evidence, index) => (
                            <EvidenceCard
                                key={`${evidence?.source || 'source'}-${index}`}
                                evidence={evidence}
                            />
                        ))}
                    </div>
                ) : (
                    <p className="mt-3 rounded-xl bg-white p-3 text-sm text-[#555C60]">
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
        </section>
    )
}

export default RouteConditions