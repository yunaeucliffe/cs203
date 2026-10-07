import { useEffect, useState } from 'react'
import { busArrivalDetails } from '../utils/busArrivals.js'

const time = value => new Date(value).toLocaleString('en-SG', {
  timeZone: 'Asia/Singapore', day: 'numeric', month: 'short',
  hour: '2-digit', minute: '2-digit', second: '2-digit',
})

export default function BusArrivals({ route }) {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 10000)
    return () => clearInterval(timer)
  }, [])
  const buses = (route.legs || []).flatMap((leg, index) =>
    leg.mode === 'BUS' ? [{ leg, index, ...busArrivalDetails(route, index, now) }] : [])
  if (!buses.length) return null
  return (
    <section className="mt-5 rounded-xl bg-white/70 p-4" aria-label="Bus arrival estimates">
      <h3 className="font-semibold">Bus arrival estimates</h3>
      <p className="mt-1 text-sm">Current estimates may change. They do not guarantee that you will catch a bus or connection.</p>
      {buses.map(({ leg, index, evidence, arrivals, stale }) => (
        <div key={index} className="mt-4 border-t border-[#7A7F7A]/20 pt-3">
          <p className="font-semibold">Bus {leg.service || '(service unavailable)'} at {leg.from?.name || 'boarding stop'}{evidence?.details?.busStopCode && ` (${evidence.details.busStopCode})`}</p>
          {arrivals.length ? (
            <ul className="mt-2 space-y-1 text-sm">
              {arrivals.map(arrival => <li key={arrival}>Estimated {time(arrival)} SGT · {Math.ceil((Date.parse(arrival) - now) / 60000)} min</li>)}
            </ul>
          ) : <p className="mt-2 text-sm">Arrival information unavailable.{stale ? ' Estimates have expired. Search again for current information.' : ''}</p>}
          {Number.isFinite(Date.parse(evidence?.retrievedAt)) && <p className="mt-1 text-xs">Retrieved {time(evidence.retrievedAt)} SGT</p>}
        </div>
      ))}
    </section>
  )
}
