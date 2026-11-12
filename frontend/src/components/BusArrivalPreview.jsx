import { clockTime } from '../utils/navigationTiming.js'
import LiveEstimateNote from './transit/LiveEstimateNote'

// Next bus and the ones after it, like transit apps show them. The step already names the
// bus and stop, so only the times are shown here.
export function BusArrivalTimes({ bus, now }) {
  const minutes = at => Math.max(0, Math.ceil((at - now) / 60000))
  const next = bus.at && minutes(bus.at)
  return <>
    {bus.at && <p className="text-sm font-semibold text-[#2A3439]">
      Next bus: {clockTime(bus.at)}
      {bus.arrivals?.[1] && `, then ${clockTime(bus.arrivals[1])}`}
    </p>}
    <p className="mt-1 text-sm text-[#2A3439]">
      {bus.noBuses ? 'No buses available now'
        : !bus.at ? 'No live bus time yet. Using planned time.'
        : next === 0 ? 'Arriving now' : `Arrives in ${next} min`}
    </p>
  </>
}

// The route page shares one polling hook across all journey steps.
export default function BusArrivalPreview({ bus, now, failed }) {
  const updatedAt = Date.parse(bus.retrievedAt)
  return <div className="mt-2 rounded-lg bg-[#FAF7F0] px-3 py-2" aria-label="Bus arrival estimates">
    <BusArrivalTimes bus={bus} now={now} />
    {(bus.stale || failed) && <p className="mt-0.5 text-xs text-amber-900">Times may be outdated.</p>}
    <LiveEstimateNote
      stale={bus.stale || failed}
      live
      updatedLabel={Number.isFinite(updatedAt)
        ? `Last updated ${clockTime(updatedAt)}.`
        : 'Last updated — waiting for live data.'}
    />
  </div>
}
