import { useEffect, useState } from 'react'
import { busArrivalDetails } from '../utils/busArrivals.js'
import { fetchBusArrivals } from '../api/routes.js'

const time = value => new Date(value).toLocaleString('en-SG', {
  timeZone: 'Asia/Singapore', day: 'numeric', month: 'short',
  hour: '2-digit', minute: '2-digit', second: '2-digit',
})

export default function BusArrivals({ route, live = true }) {
  const [now, setNow] = useState(Date.now)
  const [updates, setUpdates] = useState([])
  useEffect(() => {
    if (!live) return
    let stopped = false
    let timer
    let controller
    const targets = (route.legs || []).flatMap((leg, index) => {
      if (leg.mode !== 'BUS' || !leg.service) return []
      const matched = busArrivalDetails(route, index).evidence
      const code = matched?.details?.busStopCode || [leg.from?.code, leg.from?.id]
        .map(value => value?.split(':').at(-1)).find(value => /^\d{5}$/.test(value || ''))
      return code ? [{ index, code, service: leg.service }] : []
    })
    if (!targets.length) return
    const refresh = async () => {
      if (stopped) return
      if (!document.hidden) {
        controller = new AbortController()
        const results = await Promise.all(targets.map(async ({ index, code, service }) => {
          try {
            const evidence = await fetchBusArrivals(code, service, controller.signal)
            if (evidence.source !== 'LTA BusArrival' || evidence.details?.busStopCode !== code ||
                evidence.details?.service !== service) throw new Error('Mismatched arrival data')
            return { ...evidence, details: { ...evidence.details, legIndex: index } }
          } catch {
            return { source: 'LTA BusArrival', availability: 'unavailable',
              details: { legIndex: index, busStopCode: code, service } }
          }
        }))
        if (!stopped) { setUpdates(results); setNow(Date.now()) }
      }
      if (!stopped) timer = setTimeout(refresh, 20000)
    }
    refresh()
    return () => { stopped = true; clearTimeout(timer); controller?.abort() }
  }, [route, live])
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 10000)
    return () => clearInterval(timer)
  }, [])
  const current = { ...route, evidence: [...updates, ...(route.evidence || [])] }
  const buses = (route.legs || []).flatMap((leg, index) =>
    leg.mode === 'BUS' ? [{ leg, index, ...busArrivalDetails(current, index, now) }] : [])
  if (!buses.length) return null
  return (
    <section className="mt-5 rounded-xl bg-white/70 p-4" aria-label="Bus arrival estimates">
      <h3 className="font-semibold">Bus arrivals for your journey</h3>
      <p className="mt-1 text-sm">Only arrivals at or after your route's estimated stop arrival are shown. These estimates follow your planned journey.</p>
      {live && <p className="mt-1 text-xs">Updates automatically every 20 seconds while this page is visible.</p>}
      {buses.map(({ leg, index, evidence, arrivals, stale, expectedAtStop, readyAt, noCatchableArrivals }) => (
        <div key={index} className="mt-4 border-t border-[#7A7F7A]/20 pt-3">
          <p className="font-semibold">Bus {leg.service || '(service unavailable)'} at {leg.from?.name || 'boarding stop'}{evidence?.details?.busStopCode && ` (${evidence.details.busStopCode})`}</p>
          {expectedAtStop !== null && <p className="mt-1 text-sm">Estimated at this stop: {time(expectedAtStop)} SGT, based on your route.</p>}
          {arrivals.length ? (
            <ul className="mt-2 space-y-1 text-sm">
              {arrivals.map(arrival => <li key={arrival}>Estimated {time(arrival)} SGT · about {Math.ceil((Date.parse(arrival) - readyAt) / 60000)} min {expectedAtStop > now ? 'wait after reaching the stop' : 'from now, if you have reached the stop'}</li>)}
            </ul>
          ) : <p className="mt-2 text-sm">{expectedAtStop === null
            ? 'Journey timing unavailable. Bus times are hidden because we cannot estimate when you will reach this stop.'
            : noCatchableArrivals
              ? 'No live arrivals are currently available at or after your estimated stop arrival. Later buses may not yet appear in the live data.'
              : 'Arrival information unavailable.'}{stale ? ' Estimates have expired.' : ''}{live ? ' Updates automatically.' : ''}</p>}
          {Number.isFinite(Date.parse(evidence?.retrievedAt)) && <p className="mt-1 text-xs">Retrieved {time(evidence.retrievedAt)} SGT</p>}
        </div>
      ))}
    </section>
  )
}
