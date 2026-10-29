import { useCallback, useContext, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, Copy, MapPin, Share2, X } from 'lucide-react'
import { TripSharingContext } from './TripSharingContext'
import { shareRequest, shareUrl, requestLocation } from '../api/tripShares'
import { estimateArrival } from '../utils/tripSharing'

// Full width on phones, natural width side by side on larger screens.
const button = 'flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl px-5 py-2 text-center text-base font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3E424B] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto'
const buttons = {
  primary: `${button} bg-[#3E424B] text-white hover:bg-[#2A3439]`,
  secondary: `${button} border border-[#7A7F7A]/40 bg-white hover:bg-[#FAF7F0]`,
  success: `${button} bg-[#DCE7D2] hover:bg-[#CFDDC3]`,
  danger: `${button} border border-red-200 bg-white text-red-800 hover:bg-red-50`,
}
const card = 'mt-5'

// Shows a short message on the clicked button (e.g. "Link copied"), then puts its label back.
function useButtonMessage() {
  const [message, setMessage] = useState({})
  const timer = useRef()
  useEffect(() => () => clearTimeout(timer.current), [])
  function show(name, text) {
    clearTimeout(timer.current)
    setMessage({ name, text })
    timer.current = setTimeout(() => setMessage({}), 3000)
  }
  const label = (name, normal) => message.name === name ? message.text : normal
  return [label, show]
}

// Keeps updates running when the route details are no longer on screen.
// Status messages are shown in the sharing card via onStatus.
function LocationUpdates({ share, allowed, onStatus }) {
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
          if (!cancelled) onStatus(share.id, 'Live location is updating. Keep SilverRoute open.', true)
        } catch (error) {
          if (!cancelled) onStatus(share.id, error.message, false)
        } finally { uploading = false }
      }, () => {
        uploading = false
        if (!cancelled) onStatus(share.id, 'Location updates stopped. Trip details are still shared. Check location permission.', false)
      }, { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 })
    }
    sendLocation()
    const timer = setInterval(sendLocation, 20000)
    return () => { cancelled = true; clearInterval(timer) }
  }, [share.id, share.liveLocation, allowed, onStatus])
  return null
}

// Green "Sharing live location" pill; amber when live location is paused or the last update failed.
function SharingStatus({ share }) {
  const { allowed, status } = useContext(TripSharingContext)
  const paused = share.liveLocation && !allowed.includes(share.id)
  const failing = status[share.id]?.ok === false
  const warn = paused || failing
  return <span className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${warn ? 'bg-amber-100 text-amber-900' : 'bg-[#DCE7D2]'}`}>
    <span className={`h-2.5 w-2.5 rounded-full ${warn ? 'bg-amber-600' : 'bg-green-700'}`} aria-hidden="true" />
    {paused ? 'Live location paused' : failing ? 'Location not updating' : share.liveLocation ? 'Sharing live location' : 'Sharing trip details'}
  </span>
}

// Shown in the navbar on every page while sharing is active; opens the sharing controls.
export function SharingIndicator() {
  const { shares } = useContext(TripSharingContext) ?? { shares: [] }
  if (shares.length === 0) return null
  return <details className="relative">
    <summary className="cursor-pointer list-none rounded-full hover:opacity-80 [&::-webkit-details-marker]:hidden">
      <SharingStatus share={shares[0]} />
    </summary>
    <div className="absolute right-0 top-full z-[1100] mt-2 max-h-[70vh] w-[min(28rem,calc(100vw-2rem))] space-y-6 overflow-y-auto rounded-[24px] border border-[#7A7F7A]/20 bg-white p-5 shadow-lg">
      {shares.map(share => <ActiveShare key={share.id} share={share} />)}
    </div>
  </details>
}

function ActiveShare({ share }) {
  const { allowed, enable, end, status } = useContext(TripSharingContext)
  const [label, show] = useButtonMessage()
  const [ending, setEnding] = useState(null)
  const paused = share.liveLocation && !allowed.includes(share.id)
  async function stop(name) {
    setEnding(name)
    try { await end(share.id, name === 'arrived') }
    catch (error) { setEnding(null); show(name, error.message) }
  }
  async function send(name) {
    try {
      const url = shareUrl(share.token)
      if (name === 'share' && navigator.share) { await navigator.share({ title: 'My SilverRoute trip', url }); show(name, 'Shared') }
      else if (navigator.clipboard) { await navigator.clipboard.writeText(url); show(name, 'Link copied') }
      else show(name, 'Copy it from Sharing details')
    } catch (error) { if (error.name !== 'AbortError') show(name, 'Could not share. Try again') }
  }
  async function resume() {
    try { await requestLocation(); enable(share.id) }
    catch { show('resume', 'Location permission not granted') }
  }
  return <div className="space-y-4" aria-label="Active trip sharing">
    <p className="text-lg font-semibold">{share.origin} → {share.destination}</p>
    {paused && <div className="flex flex-col gap-3 rounded-xl bg-amber-50 p-4 text-amber-900 sm:flex-row sm:items-center sm:justify-between">
      <p>Turn live location back on so your family can see where you are.</p>
      <button type="button" className={buttons.secondary} aria-live="polite" onClick={resume}>
        <MapPin size={18} />{label('resume', 'Resume live location')}
      </button>
    </div>}
    <div className="grid gap-3 sm:grid-cols-2" aria-live="polite">
      <button type="button" className={buttons.primary} onClick={() => send('share')}><Share2 size={18} />{label('share', 'Share link')}</button>
      <button type="button" className={buttons.secondary} onClick={() => send('copy')}><Copy size={18} />{label('copy', 'Copy link')}</button>
      <button type="button" className={buttons.success} disabled={!!ending} onClick={() => stop('arrived')}>
        <Check size={18} />{ending === 'arrived' ? 'Ending sharing...' : label('arrived', "I've arrived")}
      </button>
      <button type="button" className={buttons.danger} disabled={!!ending} onClick={() => stop('stopped')}>
        <X size={18} />{ending === 'stopped' ? 'Stopping...' : label('stopped', 'Stop sharing')}
      </button>
    </div>
    <p role="status" className="text-sm text-[#555C60] empty:hidden">{status[share.id]?.text || ''}</p>
    <details className="text-sm text-[#555C60]">
      <summary className="cursor-pointer py-2 font-semibold">Sharing details</summary>
      <label className="mt-2 block">Sharing link
        <input className="mt-1 w-full rounded-xl border border-[#7A7F7A]/30 bg-[#FAF7F0] p-3 text-[#2A3439]" readOnly value={shareUrl(share.token)} onFocus={event => event.target.select()} />
      </label>
      <p className="mt-2">Sharing ends when you tap "I've arrived" or "Stop sharing", or automatically after 24 hours.</p>
    </details>
  </div>
}

export function TripSharingProvider({ children }) {
  const [shares, setShares] = useState([])
  const [allowed, setAllowed] = useState([])
  const [status, setStatus] = useState({})
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
  const reportStatus = useCallback((id, text, ok) => setStatus(previous => ({ ...previous, [id]: { text, ok } })), [])
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
  return <TripSharingContext.Provider value={{ shares: active, allowed, status, end,
    enable: id => setAllowed(previous => [...previous, id]),
    add: (share, consent) => {
      version.current++
      setNotice('')
      setShares(previous => [...previous.filter(item => item.id !== share.id), share])
      if (consent) setAllowed(previous => [...previous, share.id])
    },
  }}>
    {active.map(share => <LocationUpdates key={share.id} share={share} allowed={allowed.includes(share.id)} onStatus={reportStatus} />)}
    {/* One message, fixed on screen so it's seen wherever sharing was ended from. */}
    {notice && <div role="status" className="fixed inset-x-4 bottom-4 z-[1100] mx-auto flex max-w-md items-center justify-between gap-3 rounded-xl border border-[#7A7F7A]/20 bg-white p-4 shadow-lg">
      <span className="flex items-center gap-2 font-semibold"><Check size={18} className="shrink-0 text-green-700" />{notice}</span>
      <button type="button" className="min-h-10 rounded-lg px-3 text-sm font-semibold hover:bg-[#FAF7F0]" onClick={() => setNotice('')}>Dismiss</button>
    </div>}
    {children}
  </TripSharingContext.Provider>
}

export function TripSharingButton({ route, origin, destination, canShare = false }) {
  const dialog = useRef(null)
  const titleId = useId()

  return <>
    <button type="button" disabled={!canShare} aria-label={canShare ? 'Share this trip' : 'Choose this route before sharing'} title={canShare ? 'Share this trip' : 'Choose this route before sharing'} aria-haspopup="dialog"
      onClick={() => dialog.current?.showModal()}
      className="flex min-h-[52px] min-w-[52px] items-center justify-center rounded-xl border border-[#7A7F7A]/40 bg-white text-[#3E424B] transition enabled:hover:bg-[#DCE7D2] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#3E424B]">
      <Share2 size={24} aria-hidden="true" />
    </button>
    {canShare && createPortal(
      <dialog ref={dialog} aria-labelledby={titleId}
        className="fixed inset-0 m-auto max-h-[85vh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-3xl bg-white p-5 text-[#2A3439] shadow-xl backdrop:bg-black/40 sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <h2 id={titleId} className="text-2xl font-semibold">Share trip with family</h2>
          <button type="button" aria-label="Close sharing options" onClick={() => dialog.current?.close()}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl hover:bg-[#FAF7F0] focus-visible:outline-2 focus-visible:outline-offset-2">
            <X size={24} aria-hidden="true" />
          </button>
        </div>
        <TripSharing route={route} origin={origin} destination={destination} />
      </dialog>, document.body)}
  </>
}

export default function TripSharing({ route, origin, destination }) {
  const { add, shares } = useContext(TripSharingContext)
  const [label, show] = useButtonMessage()
  const [live, setLive] = useState(false)
  const [busy, setBusy] = useState(false)
  // Trimmed the same way the server stores them, so the active share is recognised.
  const originName = (origin?.name || route.legs?.[0]?.from?.name || '').trim()
  const destinationName = (destination?.name || route.legs?.at(-1)?.to?.name || '').trim()
  const summary = (route.summary || '').trim()
  async function create() {
    setBusy(true)
    // If location permission is denied, a details-only link is still created
    // and the sharing card shows "Sharing trip details".
    const consent = live && await requestLocation().then(() => true, () => false)
    try {
      const share = await shareRequest('', 'POST', {
        origin: originName, destination: destinationName,
        routeSummary: summary, estimatedArrival: estimateArrival(route), liveLocation: consent,
      })
      add(share, consent)
    } catch (error) { show('create', error.message) }
    finally { setBusy(false) }
  }
  const shared = shares.filter(share => share.origin === originName
    && share.destination === destinationName && share.routeSummary === summary)
  if (shared.length > 0) return <section className={`${card} space-y-6`} aria-label="Trip sharing">
    {shared.map(share => <div key={share.id} className="space-y-4"><SharingStatus share={share} /><ActiveShare share={share} /></div>)}
  </section>
  return <section className={card} aria-label="Share this trip">
    <p className="mt-1 text-[#555C60]">Send a link so your family or caregiver can follow your trip.</p>
    <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl bg-[#FAF7F0] p-4">
      <input className="mt-0.5 h-5 w-5 shrink-0 accent-[#3E424B]" type="checkbox" checked={live} onChange={event => setLive(event.target.checked)} />
      <span>
        <span className="block font-semibold">Include my live location</span>
        <span className="block text-sm text-[#555C60]">Keep SilverRoute open so your location keeps updating.</span>
      </span>
    </label>
    <button type="button" className={`${buttons.primary} mt-4`} aria-live="polite" disabled={busy || !(route.durationMinutes > 0)} onClick={create}>
      <Share2 size={18} />{busy ? 'Preparing...' : label('create', 'Create sharing link')}
    </button>
    <details className="mt-3 text-sm text-[#555C60]">
      <summary className="cursor-pointer py-2 font-semibold">How sharing works</summary>
      <p>Anyone with your link can view the trip. Tap "I've arrived" when you reach your destination, or stop sharing at any time. For privacy, sharing ends automatically after 24 hours.</p>
    </details>
  </section>
}
