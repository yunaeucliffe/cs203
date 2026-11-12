import { useCallback, useContext, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, Copy, MapPin, Share2, X } from 'lucide-react'
import { TripSharingContext } from './TripSharingContext'
import { shareRequest, shareUrl, requestLocation } from '../api/tripShares'
import { estimateArrival, matchesJourney, freshJourneyLocation, isSharingJourney } from '../utils/tripSharing'

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

// Upload navigation's GPS fix every 20 seconds. Some phones stop reporting while you
// stand still, so ask for a position directly when navigation's fix is too old.
function LocationUpdates({ share, allowed, journey, onStatus }) {
  const latest = useRef(null)
  useEffect(() => { latest.current = journey?.location }, [journey?.location])
  useEffect(() => {
    if (!share.liveLocation || !allowed) return
    let stopped = false
    let uploading = false
    async function sendLocation() {
      if (uploading) return
      uploading = true
      try {
        const location = freshJourneyLocation(latest.current) ? latest.current : (await requestLocation()).coords
        if (stopped) return
        await shareRequest(`/${share.id}/location`, 'PUT', {
          latitude: location.latitude, longitude: location.longitude,
        })
        if (!stopped) onStatus(share.id, 'Sharing your current journey location.', true)
      } catch (error) {
        // Location errors have a code; request errors already have a readable message.
        if (!stopped) onStatus(share.id, error.code ? 'Location unavailable. Waiting for a new location.' : error.message, false)
      } finally { uploading = false }
    }
    sendLocation()
    const timer = setInterval(sendLocation, 20000)
    return () => { stopped = true; clearInterval(timer) }
  }, [share.id, share.liveLocation, allowed, onStatus])
  return null
}

// Green "Sharing live location" pill; amber when live location is paused or the last update failed.
function SharingStatus({ share }) {
  const { allowed, status, journey } = useContext(TripSharingContext)
  const paused = share.liveLocation && !isSharingJourney(share, journey, allowed)
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
  const { allowed, enable, end, status, journey } = useContext(TripSharingContext)
  const [label, show] = useButtonMessage()
  const [ending, setEnding] = useState(null)
  const paused = share.liveLocation && !isSharingJourney(share, journey, allowed)
  const onThisJourney = matchesJourney(share, journey)
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
      <p>{onThisJourney ? 'Resume sharing your current journey location.' : 'Location sharing is paused. Open this journey in Navigation to resume.'}</p>
      <button type="button" disabled={!onThisJourney} className={buttons.secondary} aria-live="polite" onClick={resume}>
        <MapPin size={18} />{label('resume', 'Resume live location')}
      </button>
    </div>}
    <div className="space-y-2" aria-live="polite">
      <p className="text-sm font-semibold text-[#555C60]">Send link</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <button type="button" className={buttons.primary} onClick={() => send('share')}><Share2 size={18} />{label('share', 'Share link')}</button>
        <button type="button" className={buttons.secondary} onClick={() => send('copy')}><Copy size={18} />{label('copy', 'Copy link')}</button>
      </div>
    </div>
    <div className="space-y-2 border-t border-[#7A7F7A]/20 pt-4" aria-live="polite">
      <p className="text-sm font-semibold text-[#555C60]">Done traveling?</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <button type="button" className={buttons.success} disabled={!!ending} onClick={() => stop('arrived')}>
          <Check size={18} />{ending === 'arrived' ? 'Ending sharing...' : label('arrived', "I've arrived")}
        </button>
        <button type="button" className={buttons.danger} disabled={!!ending} onClick={() => stop('stopped')}>
          <X size={18} />{ending === 'stopped' ? 'Stopping...' : label('stopped', 'Stop sharing')}
        </button>
      </div>
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
  const [allowed, setAllowed] = useState({})
  const [journey, setJourney] = useState(null)
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
    setAllowed(previous => { const next = { ...previous }; delete next[id]; return next })
    setNotice(arrived ? "You've arrived. Trip sharing has ended." : 'Trip sharing has ended.')
  }
  // Ending navigation ends its shares, so family see that sharing stopped rather than a frozen location.
  function endJourney() {
    for (const share of active.filter(share => matchesJourney(share, journey))) {
      end(share.id, false).catch(() => setNotice('Trip sharing could not be stopped. Stop it from the sharing menu.'))
    }
    setJourney(null)
  }
  // The server ends every share on sign-out; drop them here at once so location uploads and the
  // navbar pill stop now rather than at the next refresh.
  function signedOut() {
    version.current++
    if (shares.length > 0) setNotice('You signed out, so trip sharing has ended.')
    setShares([])
    setAllowed({})
    setStatus({})
    setJourney(null)
  }
  return <TripSharingContext.Provider value={{ shares: active, allowed, status, end, journey, setJourney, endJourney, signedOut,
    enable: id => setAllowed(previous => ({ ...previous, [id]: journey?.id })),
    add: (share, consent) => {
      version.current++
      setNotice('')
      setShares(previous => [...previous.filter(item => item.id !== share.id), share])
      if (consent) setAllowed(previous => ({ ...previous, [share.id]: journey?.id }))
    },
  }}>
    {active.map(share => <LocationUpdates key={share.id} share={share} journey={journey}
      allowed={isSharingJourney(share, journey, allowed)} onStatus={reportStatus} />)}
    {/* One message, fixed on screen so it's seen wherever sharing was ended from. Placed like the app's other pop-ups (Routes). */}
    {notice && <div role="status" className="fixed left-4 right-4 top-4 z-[2000] flex items-start gap-2 rounded-xl border border-[#7A7F7A]/20 bg-white p-4 pr-2 shadow-lg sm:left-auto sm:max-w-sm">
      <p className="flex flex-1 items-start gap-2 pt-2 font-semibold"><Check size={18} className="mt-0.5 shrink-0 text-green-700" aria-hidden="true" />{notice}</p>
      {/* 44px target so it is easy to tap on a phone */}
      <button type="button" aria-label="Dismiss message" onClick={() => setNotice('')}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg hover:bg-[#FAF7F0]">
        <X size={24} aria-hidden="true" />
      </button>
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
  const { add, shares, journey } = useContext(TripSharingContext)
  const [label, show] = useButtonMessage()
  const [live, setLive] = useState(false)
  const [busy, setBusy] = useState(false)
  // Trimmed the same way the server stores them, so the active share is recognised.
  const originName = (origin?.name || route.legs?.[0]?.from?.name || '').trim()
  const destinationName = (destination?.name || route.legs?.at(-1)?.to?.name || '').trim()
  const summary = (route.summary || '').trim()
  async function create() {
    setBusy(true)
    // Navigation already asks for GPS permission; the checkbox consents to sharing it.
    try {
      const share = await shareRequest('', 'POST', {
        origin: originName, destination: destinationName,
        routeSummary: summary, estimatedArrival: estimateArrival(route), liveLocation: live,
      })
      add(share, live)
    } catch (error) { show('create', error.message) }
    finally { setBusy(false) }
  }
  const shared = shares.filter(share => matchesJourney(share, journey))
  if (shared.length > 0) return <section className={`${card} space-y-6`} aria-label="Trip sharing">
    {shared.map(share => <div key={share.id} className="space-y-4"><SharingStatus share={share} /><ActiveShare share={share} /></div>)}
  </section>
  return <section className={card} aria-label="Share this trip">
    <p className="mt-1 text-[#555C60]">Send a link so your family or caregiver can follow your trip.</p>
    <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl bg-[#FAF7F0] p-4">
      <input className="mt-0.5 h-5 w-5 shrink-0 accent-[#3E424B]" type="checkbox" checked={live} onChange={event => setLive(event.target.checked)} />
      <span>
        <span className="block font-semibold">Include my live location</span>
        <span className="block text-sm text-[#555C60]">Your location updates while Navigation is open.</span>
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
