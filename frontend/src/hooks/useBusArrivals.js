import { useEffect, useState } from 'react'
import { busArrivalDetails, retainBusArrivalEvidence } from '../utils/busArrivals.js'
import { fetchBusArrivals } from '../api/routes.js'

// Polls LTA's live BusArrival API for every BUS leg in `route`, returning
// per-leg live arrival data keyed by leg index. Extracted from the former
// standalone BusArrivals section so the same live data can be rendered
// inline within each leg of the journey timeline instead.
export default function useBusArrivals(route, live = true) {
    const [now, setNow] = useState(Date.now)
    const [updates, setUpdates] = useState([])

    useEffect(() => {
        if (!live) return
        let stopped = false
        let timer
        let controller
        let refreshing = false
        let refreshRequested = false
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
            clearTimeout(timer)
            if (refreshing) { refreshRequested = true; return }
            refreshing = true
            try {
                if (!document.hidden) {
                    controller = new AbortController()
                    const results = await Promise.all(targets.map(async ({ index, code, service }) => {
                        try {
                            const evidence = await fetchBusArrivals(code, service, controller.signal)
                            if (evidence.source !== 'LTA BusArrival' || evidence.details?.busStopCode !== code ||
                                evidence.details?.service !== service) throw new Error('Mismatched arrival data')
                            return { ...evidence, details: { ...evidence.details, legIndex: index } }
                        } catch {
                            return null
                        }
                    }))
                    if (!stopped) {
                        setUpdates(previous => targets.map(({ index }, targetIndex) =>
                            retainBusArrivalEvidence(route, index, results[targetIndex], previous))
                            .filter(Boolean))
                        setNow(Date.now())
                    }
                }
            } finally {
                refreshing = false
                if (!stopped) {
                    if (refreshRequested && !document.hidden) {
                        refreshRequested = false
                        void refresh()
                    } else {
                        refreshRequested = false
                        timer = setTimeout(refresh, 20000)
                    }
                }
            }
        }
        const onVisibilityChange = () => {
            if (!document.hidden) {
                clearTimeout(timer)
                setNow(Date.now())
                void refresh()
            }
        }
        document.addEventListener('visibilitychange', onVisibilityChange)
        refresh()
        return () => {
            stopped = true
            clearTimeout(timer)
            document.removeEventListener('visibilitychange', onVisibilityChange)
            controller?.abort()
        }
    }, [route, live])

    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 10000)
        return () => clearInterval(timer)
    }, [])

    const current = { ...route, evidence: [...updates, ...(route.evidence || [])] }
    const buses = (route.legs || []).flatMap((leg, index) =>
        leg.mode === 'BUS' ? [{ leg, index, ...busArrivalDetails(current, index, now) }] : [])

    return { buses, now }
}
