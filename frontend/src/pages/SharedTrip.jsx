import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet'
import { API_URL } from '../api'
import { formatRouteSummary, updatedAgo } from '../utils/tripSharing'
import 'leaflet/dist/leaflet.css'

function formatDateTime(value) {
  return new Date(value).toLocaleString('en-SG', {
    timeZone: 'Asia/Singapore',
    day: 'numeric', month: 'short', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  })
}

function FollowLocation({ latitude, longitude }) {
  const map = useMap()
  useEffect(() => { map.panTo([latitude, longitude]) }, [map, latitude, longitude])
  return null
}

export default function SharedTrip({ token }) {
  const [trip, setTrip] = useState(null)
  const [message, setMessage] = useState('Loading shared trip...')
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    let cancelled = false
    let busy = false
    const controller = new AbortController()
    async function refresh() {
      if (busy) return
      busy = true
      try {
        const response = await fetch(`${API_URL}/api/shared-trips/${encodeURIComponent(token)}`, {
          cache: 'no-store', signal: controller.signal,
        })
        if (response.status === 410) throw new Error('They have arrived. Trip sharing has ended.')
        if (!response.ok) throw new Error(response.status === 404
          ? 'This sharing link is invalid, expired, or has been stopped.' : 'Unable to check sharing. Please try again.')
        const data = await response.json()
        if (!cancelled) { setTrip(data); setMessage(''); setNow(Date.now()) }
      } catch (error) {
        if (!cancelled) { setTrip(null); setMessage(error.name === 'TypeError' ? 'Unable to check sharing. Check your connection.' : error.message) }
      } finally { busy = false }
    }
    refresh()
    // Each poll also refreshes the clock used for expiry, "outdated" and "last updated".
    const poll = setInterval(refresh, 5000)
    return () => { cancelled = true; controller.abort(); clearInterval(poll) }
  }, [token])
  const active = trip && new Date(trip.expiresAt).getTime() > now
  const hasLocation = active && Number.isFinite(trip.latitude) && Number.isFinite(trip.longitude)
  const outdated = hasLocation && now - new Date(trip.locationUpdatedAt).getTime() > 60000
  const arrivalPassed = active && new Date(trip.estimatedArrival).getTime() <= now
  const card = 'rounded-[24px] border border-[#7A7F7A]/20 bg-white p-5 sm:p-6'
  return <main className="min-h-screen bg-[#FAF7F0] px-4 py-8 text-[#2A3439] sm:px-6">
    <div className="mx-auto max-w-3xl space-y-5">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-[#7A7F7A]">SilverRoute</p>
        <h1 className="text-2xl font-semibold sm:text-3xl">Shared trip</h1>
      </header>
      {!active ? <section className={`${card} text-lg`} role="status">{message || 'This sharing link has expired.'}</section> : <>
        <section className={card}>
          <h2 className="text-xl font-semibold">{trip.origin} → {trip.destination}</h2>
          <p className="mt-1 text-[#555C60]">{formatRouteSummary(trip.routeSummary)}</p>
          <div className="mt-4 rounded-xl bg-[#FAF7F0] p-4">
            <p className="text-sm text-[#7A7F7A]">{arrivalPassed ? 'Expected to arrive by' : 'Estimated arrival'}</p>
            <p className="text-lg font-semibold">{formatDateTime(trip.estimatedArrival)} <span className="text-sm font-normal text-[#7A7F7A]">Singapore time</span></p>
            {arrivalPassed && <p className="mt-1 text-sm">They have not confirmed arrival yet.</p>}
          </div>
        </section>
        <section className={card}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Live location</h2>
            {hasLocation && <span className={`rounded-full px-3 py-1 text-sm font-semibold ${outdated ? 'bg-amber-100 text-amber-900' : 'bg-[#DCE7D2]'}`}>
              {outdated ? 'Outdated' : 'Live'}
            </span>}
          </div>
          {!trip.liveLocation ? <p className="mt-2 text-[#555C60]">Live location is not shared for this trip.</p> : <>
            <p role="status" className="mt-2 text-[#555C60]">{hasLocation
              ? `${outdated ? 'Updates have stopped. ' : ''}Last updated ${updatedAgo(trip.locationUpdatedAt, now)}.`
              : 'Waiting for the first location update.'}</p>
            {hasLocation && <MapContainer center={[trip.latitude, trip.longitude]} zoom={16} className="mt-4 h-80 w-full rounded-xl sm:h-96">
              <TileLayer url="https://www.onemap.gov.sg/maps/tiles/Default/{z}/{x}/{y}.png" attribution="&copy; OneMap contributors" />
              <FollowLocation latitude={trip.latitude} longitude={trip.longitude} />
              <CircleMarker center={[trip.latitude, trip.longitude]} radius={10} pathOptions={{ color: outdated ? '#777' : '#2F6FED' }}><Popup>Latest shared location</Popup></CircleMarker>
            </MapContainer>}
          </>}
        </section>
      </>}
    </div>
  </main>
}
