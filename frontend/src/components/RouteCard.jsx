import {
    Footprints,
    Bus,
    Umbrella,
    Navigation,
    ArrowRight,
} from 'lucide-react'

function RouteCard({ route, index, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="flex h-full w-full cursor-pointer flex-col rounded-[24px] border-2 border-[#7A7F7A]/20 bg-white p-6 text-left transition hover:-translate-y-1 hover:border-[#3E424B] hover:shadow-md"
        >
            {/* ROUTE NUMBER + RECOMMENDED BADGE */}
            <div className="flex min-h-8 flex-wrap items-center gap-3">
                <p className="shrink-0 text-sm font-bold text-[#7A7F7A]">
                    ROUTE {index + 1}
                </p>
                {index === 0 && (
                    <span className="rounded-full bg-[#3E424B] px-3 py-1 text-sm font-semibold text-white">
                        Recommended for you
                    </span>
                )}
            </div>

            {/* DURATION */}
            <h3
                className="mt-5 text-4xl text-[#2A3439]"
                style={{ fontFamily: '"DM Serif Display", serif' }}
            >
                {route.durationMinutes == null
                    ? 'Time unavailable'
                    : `${route.durationMinutes} min`}
            </h3>

            {/* ROUTE SUMMARY */}
            <p className="mt-3 text-base text-[#555C60]">
                {route.summary}
            </p>
            

            {/* ROUTE DETAILS */}
            <div className="mt-6 flex-1 space-y-4 border-t border-[#7A7F7A]/20 pt-5">

                {/* WALKING */}
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                    <span className="flex min-w-0 items-center gap-2 [&>svg]:shrink-0">
                        <Footprints size={22} />
                        Walking
                    </span>
                    <span className="font-semibold">
                        {route.walkingMinutes == null
                            ? 'Unavailable'
                            : `${route.walkingMinutes} min`}
                    </span>
                </div>

                {/* TRANSFERS */}
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                    <span className="flex min-w-0 items-center gap-2 [&>svg]:shrink-0">
                        <Bus size={22} />
                        Transfers
                    </span>
                    <span className="font-semibold">
                        {route.transfers ?? 'Unavailable'}
                    </span>
                </div>

                {/* SHELTERED WALKING */}
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                    <span className="flex min-w-0 items-center gap-2 [&>svg]:shrink-0">
                        <Umbrella size={22} />
                        Sheltered walking
                    </span>
                    <span className="font-semibold">
                        {route.estimatedShelteredWalkingMeters == null
                            ? 'Unavailable'
                            : `${Math.round(route.estimatedShelteredWalkingMeters)} m`}
                    </span>
                </div>

                {/* DISTANCE */}
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                    <span className="flex min-w-0 items-center gap-2 [&>svg]:shrink-0">
                        <Navigation size={22} />
                        Distance
                    </span>
                    <span className="font-semibold">
                        {route.distanceMeters == null
                            ? 'Unavailable'
                            : `${(route.distanceMeters / 1000).toFixed(1)} km`}
                    </span>
                </div>

            </div>

            {/* RECOMMENDATION REASON */}
            {route.reasons?.length > 0 && (
                <p className="mt-5 rounded-xl bg-[#DCE7D2]/50 p-4 text-lg leading-relaxed text-[#2A3439]">
                    {route.reasons[0]}
                </p>
            )}

            {/* VIEW DETAILS INDICATOR */}
            <div className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-[#FAF7F0] px-4 py-3 font-semibold text-[#2A3439] transition">
                View details
                <ArrowRight size={18} />
            </div>

        </button>
    )
}

export default RouteCard
