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
  return <main className="min-h-screen bg-[#FAF7F0] p-6 text-[#2A3439]">
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-3xl font-semibold">SilverRoute shared trip</h1>
      {!active ? <p role="status">{message || 'This sharing link has expired.'}</p> : <>
        <h2 className="text-xl">{trip.origin} to {trip.destination}</h2>
        <p>{formatRouteSummary(trip.routeSummary)}</p>
        {new Date(trip.estimatedArrival).getTime() > now
          ? <p>Estimated arrival: {formatDateTime(trip.estimatedArrival)} (Singapore time)</p>
          : <p>Expected to arrive by {formatDateTime(trip.estimatedArrival)} (Singapore time). They have not confirmed arrival yet.</p>}
        {trip.liveLocation ? <>
          <p role="status">{hasLocation ? `${outdated ? 'Outdated location - updates have stopped. ' : ''}Last updated ${updatedAgo(trip.locationUpdatedAt, now)}` : 'Waiting for the first location update.'}</p>
          {hasLocation && <MapContainer center={[trip.latitude, trip.longitude]} zoom={16} className="h-96 w-full rounded-xl">
            <TileLayer url="https://www.onemap.gov.sg/maps/tiles/Default/{z}/{x}/{y}.png" attribution="&copy; OneMap contributors" />
            <FollowLocation latitude={trip.latitude} longitude={trip.longitude} />
            <CircleMarker center={[trip.latitude, trip.longitude]} radius={10} pathOptions={{ color: outdated ? '#777' : '#2F6FED' }}><Popup>Latest shared location</Popup></CircleMarker>
          </MapContainer>}
        </> : <p>Trip details only. Live location is not shared.</p>}
      </>}
    </div>
  </main>
}
