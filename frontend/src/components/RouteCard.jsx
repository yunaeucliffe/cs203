import {
  Footprints,
  Bus,
  Umbrella,
  Navigation,
} from 'lucide-react'

function RouteCard({ route, index, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex h-full flex-col rounded-[24px] border-2 p-6 text-left transition ${
        selected
          ? 'border-[#3E424B] bg-[#DCE7D2]'
          : 'border-[#7A7F7A]/20 bg-white hover:border-[#3E424B]'
      }`}
    >
      <p className="text-sm font-bold text-[#7A7F7A]">
        ROUTE {index + 1}
      </p>

      {index === 0 && (
        <span className="mt-2 w-fit rounded-full bg-[#3E424B] px-3 py-1 text-xs font-semibold text-white">
          Recommended for you
        </span>
      )}

      <h3
        className="mt-5 text-4xl text-[#2A3439]"
        style={{ fontFamily: '"DM Serif Display", serif' }}
      >
        {route.durationMinutes == null
          ? 'Time unavailable'
          : `${route.durationMinutes} min`}
      </h3>

      <p className="mt-3 text-sm text-[#555C60]">
        {route.summary}
      </p>

      <div className="mt-6 flex-1 space-y-4 border-t border-[#7A7F7A]/20 pt-5">

        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <Footprints size={19} />
            Walking
          </span>
          <span className="font-semibold">
            {route.walkingMinutes == null
              ? 'Unavailable'
              : `${route.walkingMinutes} min`}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <Bus size={19} />
            Transfers
          </span>
          <span className="font-semibold">
            {route.transfers ?? 'Unavailable'}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <Umbrella size={19} />
            Sheltered walking
          </span>
          <span className="font-semibold">
            {route.estimatedShelteredWalkingMeters == null
              ? 'Unavailable'
              : `${Math.round(route.estimatedShelteredWalkingMeters)} m`}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <Navigation size={19} />
            Distance
          </span>
          <span className="font-semibold">
            {route.distanceMeters == null
              ? 'Unavailable'
              : `${(route.distanceMeters / 1000).toFixed(1)} km`}
          </span>
        </div>

      </div>

      {route.reasons?.length > 0 && (
        <p className="mt-5 rounded-xl bg-white/60 p-3 text-sm">
          {route.reasons[0]}
        </p>
      )}

      <div
        className={`mt-5 rounded-xl px-4 py-3 text-center font-semibold ${
          selected
            ? 'bg-[#3E424B] text-white'
            : 'bg-[#FAF7F0] text-[#2A3439]'
        }`}
      >
        {selected ? 'Selected route' : 'View route'}
      </div>
    </button>
  )
}

export default RouteCard