import { Footprints, Train, Bus } from 'lucide-react'
import {
    getLegMode,
    getLineCode,
    formatTime,
    formatDuration,
    formatDistance,
    LINE_COLORS,
    DEFAULT_LINE_COLOR,
    BUS_COLOR,
} from '../../utils/transit'
import MrtBadge from './MrtBadge'
import BusBadge from './BusBadge'
import BusLiveStatus from './BusLiveStatus'

const STOP_DOT_COLOR = {
    origin: '#2F6FED',
    destination: '#e53935',
    transfer: '#7A7F7A',
}

function TimelineStop({ time, name, kind = 'transfer' }) {
    if (!name) return null

    const color = STOP_DOT_COLOR[kind] || STOP_DOT_COLOR.transfer
    const filled = kind === 'origin' || kind === 'destination'

    return (
        <div className="grid grid-cols-[64px_28px_1fr] items-center gap-x-3">
            <span className="text-right text-sm font-bold text-[#2A3439]">
                {time}
            </span>
            <span className="flex justify-center">
                <span
                    className="h-3.5 w-3.5 shrink-0 rounded-full border-2"
                    style={{
                        borderColor: color,
                        backgroundColor: filled ? color : 'white',
                    }}
                />
            </span>
            <span className="font-semibold text-[#2A3439]">
                {name}
            </span>
        </div>
    )
}

// Vertical timeline shared by the Route Details page and the active
// Navigation sidebar, so both show journey steps the same way.
function JourneyTimeline({ legs, liveBuses = [], live = true, emptyMessage = 'Detailed journey instructions are not available.' }) {
    if (!legs?.length) {
        return (
            <p className="mt-4 text-sm text-[#7A7F7A]">
                {emptyMessage}
            </p>
        )
    }

    return (
        <div className="mt-5">

            {/* ORIGIN */}
            <TimelineStop
                time={formatTime(legs[0].startTime)}
                name={legs[0].from?.name}
                kind="origin"
            />

            {legs.map((leg, legIndex) => {

                const mode = getLegMode(leg)
                const isLast = legIndex === legs.length - 1
                const stopCount = (leg.intermediateStops?.length ?? 0) + 1
                const lineColor =
                    mode === 'TRAIN'
                        ? LINE_COLORS[getLineCode(leg.service)] || DEFAULT_LINE_COLOR
                        : mode === 'BUS'
                            ? BUS_COLOR
                            : '#B9BEC2'

                return (
                    <div key={legIndex}>

                        {/* LEG */}
                        <div className="grid grid-cols-[64px_28px_1fr] gap-x-3">

                            {/* TIME COLUMN (blank for legs) */}
                            <span />

                            {/* CONNECTOR LINE */}
                            <span className="flex flex-col items-center">
                                <span
                                    className={`w-0.5 flex-1 ${mode === 'WALK' ? 'border-l-2 border-dotted border-[#B9BEC2]' : ''}`}
                                    style={mode === 'WALK' ? undefined : { backgroundColor: lineColor }}
                                />
                            </span>

                            {/* LEG CONTENT */}
                            <div className="flex items-start gap-2 py-3">

                                {mode === 'WALK' && (
                                    <Footprints size={18} className="mt-0.5 shrink-0 text-[#7A7F7A]" />
                                )}
                                {mode === 'TRAIN' && (
                                    <Train size={18} className="mt-0.5 shrink-0 text-[#7A7F7A]" />
                                )}
                                {mode === 'BUS' && (
                                    <Bus size={18} className="mt-0.5 shrink-0 text-[#7A7F7A]" />
                                )}

                                <div className="min-w-0">

                                    {mode === 'WALK' ? (
                                        <>
                                            <p className="font-semibold">Walk</p>
                                            <p className="mt-1 text-sm text-[#7A7F7A]">
                                                About {formatDuration(leg.durationSeconds)}
                                                {leg.distanceMeters != null && `, ${formatDistance(leg.distanceMeters)}`}
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                            <div className="flex flex-wrap items-center gap-2">
                                                {mode === 'TRAIN' && (
                                                    <MrtBadge service={leg.service} size="sm" />
                                                )}
                                                {mode === 'BUS' && (
                                                    <BusBadge number={leg.service} size="sm" />
                                                )}
                                            </div>
                                            {mode === 'BUS' && live && (
                                                <BusLiveStatus
                                                    bus={liveBuses.find((candidate) => candidate.index === legIndex)}
                                                    live={live}
                                                />
                                            )}
                                            {Array.isArray(leg.intermediateStops) && leg.intermediateStops.length > 0 ? (
                                                <details className="mt-1">
                                                    <summary className="cursor-pointer text-base font-medium text-[#555C60]">
                                                        {formatDuration(leg.durationSeconds)} ({stopCount} stop{stopCount === 1 ? '' : 's'})
                                                    </summary>
                                                    <ol className="mt-2 list-decimal space-y-1 pl-5 text-base text-[#555C60]">
                                                        {leg.intermediateStops.map((stop, stopIndex) => (
                                                            <li key={stopIndex}>
                                                                {typeof stop === 'string'
                                                                    ? stop
                                                                    : stop.name || `Stop ${stopIndex + 1}`}
                                                            </li>
                                                        ))}
                                                    </ol>
                                                </details>
                                            ) : (
                                                <p className="mt-1 text-base font-medium text-[#555C60]">
                                                    {formatDuration(leg.durationSeconds)} ({stopCount} stop{stopCount === 1 ? '' : 's'})
                                                </p>
                                            )}
                                        </>
                                    )}

                                </div>

                            </div>

                        </div>

                        {/* STOP */}
                        <TimelineStop
                            time={formatTime(leg.endTime)}
                            name={leg.to?.name}
                            kind={isLast ? 'destination' : 'transfer'}
                        />

                    </div>
                )
            })}

        </div>
    )
}

export default JourneyTimeline
