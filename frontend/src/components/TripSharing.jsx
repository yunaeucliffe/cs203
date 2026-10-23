import { useCallback, useContext, useEffect, useRef, useState } from 'react'
import { TripSharingContext } from './TripSharingContext'
import { shareRequest, shareUrl, requestLocation } from '../api/tripShares'
import { estimateArrival } from '../utils/tripSharing'

const actionClass = 'min-h-12 rounded-xl border-2 border-[#3E424B] px-5 py-3 text-lg font-semibold disabled:opacity-60'

// Keep updates running when the route details are no longer on screen.
function LocationUpdates({ share, allowed }) {
  const [message, setMessage] = useState('')
  useEffect(() => {
    if (!share.liveLocation || !allowed || !navigator.geolocation) return
    let cancelled = false
    let uploading = false
    // Send a fresh position every 20 seconds, even when the user is standing still,
    // so the recipient only sees "outdated" when updates have really stopped.
    function sendLocation() {
      if (uploading) return
      uploading = true
      navigator.geolocation.getCurrentPosition(async position => {
        try {
          if (cancelled) return
          await shareRequest(`/${share.id}/location`, 'PUT', {
            latitude: position.coords.latitude, longitude: position.coords.longitude,
          })
          if (!cancelled) setMessage('Live location is updating. Keep SilverRoute open.')
        } catch (error) {
          if (!cancelled) setMessage(error.message)
        } finally { uploading = false }
      }, () => {
        uploading = false
        if (!cancelled) setMessage('Location updates stopped. Trip details are still shared. Check location permission.')
      }, { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 })
    }
    sendLocation()
    const timer = setInterval(sendLocation, 20000)
    return () => { cancelled = true; clearInterval(timer) }
  }, [share.id, share.liveLocation, allowed])
  return message && <p className="px-5 pb-2" role="status">{message}</p>
}

function ActiveShare({ share }) {
  const { allowed, enable, end } = useContext(TripSharingContext)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  async function stop(arrived) {
    setBusy(true)
    try { await end(share.id, arrived) }
    catch (error) { setMessage(error.message); setBusy(false) }
  }
  async function send(copy) {
    try {
      const url = shareUrl(share.token)
      if (!copy && navigator.share) await navigator.share({ title: 'My SilverRoute trip', url })
      else if (navigator.clipboard) { await navigator.clipboard.writeText(url); setMessage('Link copied.') }
      else setMessage('Select and copy the link below.')
    } catch (error) { if (error.name !== 'AbortError') setMessage('Could not share. Select and copy the link below.') }
  }
  return <section className="my-4 rounded-xl border-2 border-[#7A7F7A]/30 bg-white p-5" aria-label="Active trip sharing">
    <h3 className="text-xl font-semibold">Your trip is being shared</h3>
    <p className="mt-2 text-lg">{share.origin} to {share.destination}</p>
    <div className="my-4 flex flex-wrap gap-3">
      <button type="button" className={`${actionClass} bg-[#3E424B] text-white`} onClick={() => send(false)}>Share link</button>
      <button type="button" className={actionClass} onClick={() => send(true)}>Copy link</button>
    </div>
    <div className="my-4 flex flex-wrap gap-3">
      <button type="button" className={`${actionClass} bg-[#DCE7D2]`} disabled={busy} onClick={() => stop(true)}>I've arrived</button>
      <button type="button" className={`${actionClass} text-red-800`} disabled={busy} onClick={() => stop(false)}>{busy ? 'Ending sharing...' : 'Stop sharing'}</button>
    </div>
    {share.liveLocation && !allowed.includes(share.id) && <button type="button" className={actionClass} onClick={async () => {
      try { await requestLocation(); enable(share.id) }
      catch { setMessage('Location permission was not granted. Trip details are still shared.') }
    }}>Resume live location</button>}
    <details className="mt-4">
      <summary className="cursor-pointer py-3 text-lg font-semibold">Sharing details</summary>
      <label className="block">Sharing link
        <input className="my-2 w-full rounded border p-3" readOnly value={shareUrl(share.token)} onFocus={event => event.target.select()} />
      </label>
      <p>{share.liveLocation ? 'Live location is included.' : 'Only trip details are shared.'}</p>
      <p>Tap "I've arrived" to end sharing when you reach your destination. Sharing also ends automatically after 24 hours.</p>
    </details>
    <p role="status">{message}</p>
  </section>
}

export function TripSharingProvider({ children }) {
  const [shares, setShares] = useState([])
  const [allowed, setAllowed] = useState([])
  const [notice, setNotice] = useState('')
  const [now, setNow] = useState(() => Date.now())
  // Bumped on every create/stop so a refresh that started earlier can't undo it.
  const version = useRef(0)
  const refresh = useCallback(async () => {
    const started = version.current
    try {
      const list = await shareRequest()
      if (started === version.current) setShares(list)
    } catch (error) {
      if (error.status === 401 && started === version.current) setShares([])
    }
  }, [])
  useEffect(() => {
    const initial = setTimeout(refresh, 0)
    const timer = setInterval(refresh, 10000)
    const tick = setInterval(() => setNow(Date.now()), 1000)
    return () => { clearTimeout(initial); clearInterval(timer); clearInterval(tick) }
  }, [refresh])
  const active = shares.filter(share => new Date(share.expiresAt).getTime() > now)
  async function end(id, arrived) {
    await shareRequest(`/${id}${arrived ? '?arrived=true' : ''}`, 'DELETE')
    version.current++
    setShares(previous => previous.filter(item => item.id !== id))
    setAllowed(previous => previous.filter(item => item !== id))
    setNotice(arrived ? "You've arrived. Trip sharing has ended." : 'Trip sharing has ended.')
  }
  return <TripSharingContext.Provider value={{ shares: active, allowed, end,
    enable: id => setAllowed(previous => [...previous, id]),
    add: (share, consent) => {
      version.current++
      setNotice('')
      setShares(previous => [...previous.filter(item => item.id !== share.id), share])
      if (consent) setAllowed(previous => [...previous, share.id])
    },
  }}>
    {active.length > 0 && <details className="m-4 rounded-xl border bg-[#DCE7D2] p-4">
      <summary className="cursor-pointer py-2 text-lg font-semibold">Your trip is being shared. Manage sharing</summary>
      {active.map(share => <ActiveShare key={share.id} share={share} />)}
    </details>}
    {active.map(share => <LocationUpdates key={share.id} share={share} allowed={allowed.includes(share.id)} />)}
    {/* One message, fixed on screen so it's seen wherever sharing was ended from. */}
    {notice && <p className="fixed inset-x-4 bottom-4 z-[1100] mx-auto max-w-xl rounded-xl bg-[#DCE7D2] p-4 text-lg shadow-lg" role="status">
      {notice} <button type="button" className="ml-2 font-semibold underline" onClick={() => setNotice('')}>Dismiss</button>
    </p>}
    {children}
  </TripSharingContext.Provider>
}

export default function TripSharing({ route, origin, destination }) {
  const { add, shares } = useContext(TripSharingContext)
  const [live, setLive] = useState(false)
  // Trimmed the same way the server stores them, so the active share is recognised.
  const originName = (origin?.name || route.legs?.[0]?.from?.name || '').trim()
  const destinationName = (destination?.name || route.legs?.at(-1)?.to?.name || '').trim()
  const summary = (route.summary || '').trim()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  async function create() {
    setBusy(true)
    setMessage('')
    let consent = false
    if (live) {
      try { await requestLocation(); consent = true }
      catch { setMessage('Location permission was not granted. Sharing trip details only.') }
    }
    try {
      const estimatedArrival = estimateArrival(route)
      const share = await shareRequest('', 'POST', {
        origin: originName, destination: destinationName,
        routeSummary: summary, estimatedArrival, liveLocation: consent,
      })
      add(share, consent)
    } catch (error) { setMessage(error.message) }
    finally { setBusy(false) }
  }
  const shared = shares.filter(share => share.origin === originName
    && share.destination === destinationName && share.routeSummary === summary)
  if (shared.length > 0) return <>
    {shared.map(share => <ActiveShare key={share.id} share={share} />)}
    <p role="status">{message}</p>
  </>
  return <section className="my-5 rounded-xl border-2 border-[#7A7F7A]/30 bg-white p-5 text-lg" aria-label="Share this trip">
    <h3 className="text-xl font-semibold">Share trip with family</h3>
    <p className="mt-2">Let your family or caregiver follow your trip.</p>
    <label className="my-4 flex items-center gap-3 py-2"><input className="h-6 w-6 shrink-0" type="checkbox" checked={live} onChange={event => setLive(event.target.checked)} /> Include my live location</label>
    {live && <p className="mb-4">Allow location access and keep SilverRoute open for live updates.</p>}
    <button type="button" className={`${actionClass} bg-[#3E424B] text-white`} disabled={busy || !(route.durationMinutes > 0)} onClick={create}>{busy ? 'Preparing...' : 'Share trip with family'}</button>
    <details className="mt-3">
      <summary className="cursor-pointer py-3 font-semibold">Sharing details</summary>
      <p>Anyone with your link can view the trip. Tap "I've arrived" when you reach your destination to end sharing. You can also stop sharing at any time.</p>
      <p>For privacy, sharing ends automatically after 24 hours if you forget.</p>
    </details>
    <p role="status">{message}</p>
  </section>
}
