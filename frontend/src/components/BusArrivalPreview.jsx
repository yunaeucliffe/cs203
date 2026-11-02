import { clockTime } from '../utils/navigationTiming.js'

// Next bus and the ones after it, like transit apps show them. The step already names the
// bus and stop, so only the times are shown here.
export function BusArrivalTimes({ bus, now }) {
  const minutes = at => Math.max(0, Math.ceil((at - now) / 60000))
  const next = bus.at && minutes(bus.at)
  return <>
    <p className={bus.at ? 'text-base font-semibold' : 'text-sm text-[#555C60]'}>
      {!bus.at ? 'No live bus time yet. Using planned time.'
        : next === 0 ? 'Arriving now' : `Arrives in ${next} min`}
    </p>
    {bus.arrivals?.length > 1 && <p className="text-sm text-[#555C60]">
      Also in {bus.arrivals.slice(1, 3).map(minutes).join(', ')} min
    </p>}
  </>
}

// The route page shares one polling hook across all journey steps.
export default function BusArrivalPreview({ bus, now, failed }) {
  const updatedAt = Date.parse(bus.retrievedAt)
  return <div className="mt-3 space-y-1 border-l-2 border-[#A88FA1]/60 pl-3" aria-label="Bus arrival estimates">
    <BusArrivalTimes bus={bus} now={now} />
    <p className="mt-1 text-sm text-[#555C60]">Last updated {Number.isFinite(updatedAt)
      ? clockTime(updatedAt) : '— waiting for live data'}</p>
    {(bus.stale || failed) && <p className="text-sm text-amber-900">Times may be outdated.</p>}
  </div>
}
