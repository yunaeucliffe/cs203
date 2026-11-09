import { useState } from 'react'
import { Pause, Play, RotateCcw, Square, Bus, MapPin, Wifi, FlaskConical, ChevronDown, ChevronUp } from 'lucide-react'
import { SPEEDS } from './simulationStore.js'

const clock = seconds => {
  const whole = Math.max(0, Math.round(seconds))
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`
}

function Control({ children, onClick, disabled, title, pressed }) {
  return <button type="button" onClick={onClick} disabled={disabled} title={title}
    aria-pressed={pressed}
    className="flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded border border-amber-300/40 bg-white/5 px-2 py-1.5 font-mono text-[11px] uppercase tracking-wide text-amber-100 transition hover:bg-amber-300/20 disabled:cursor-not-allowed disabled:opacity-40">
    {children}
  </button>
}

function Toggle({ label, on, onChange, onText = 'on', offText = 'off', icon }) {
  return <button type="button" onClick={() => onChange(!on)} aria-pressed={on}
    className="flex min-h-9 items-center justify-between gap-2 rounded border border-amber-300/40 bg-white/5 px-2 py-1.5 font-mono text-[11px] text-amber-100 transition hover:bg-amber-300/20">
    <span className="flex items-center gap-1.5">{icon}{label}</span>
    <span className={on ? 'font-bold text-lime-300' : 'font-bold text-red-300'}>
      {on ? onText : offText}
    </span>
  </button>
}

// Deliberately styled as an instrument panel rather than part of SilverRoute: this is a
// presenter's tool and must never be mistaken for a feature of the product.
export default function SimulationPanel({ simulation }) {
  const [collapsed, setCollapsed] = useState(false)
  if (!simulation.available) return null

  const { active, playing, speed, progressSeconds, totalSeconds, locationOn, liveDataOn,
    scriptedBuses, ready, nextStop, position } = simulation

  return <section aria-label="Journey simulation (development tool)"
    className="fixed bottom-4 right-4 z-[2100] w-[min(320px,calc(100vw-2rem))] rounded-lg border-2 border-dashed border-amber-300/70 bg-[#14161C]/95 text-amber-50 shadow-2xl backdrop-blur-sm">

    <header className="flex items-center gap-2 border-b border-amber-300/30 px-3 py-2">
      <FlaskConical size={14} className="shrink-0 text-amber-300" aria-hidden="true" />
      <p className="min-w-0 flex-1 font-mono text-[11px] uppercase tracking-widest text-amber-300">
        Dev · journey sim
        {active && <span className="ml-1 text-lime-300">● live</span>}
      </p>
      <button type="button" onClick={() => setCollapsed(value => !value)}
        aria-expanded={!collapsed} aria-label={collapsed ? 'Show simulation controls' : 'Hide simulation controls'}
        className="rounded p-1 text-amber-200 hover:bg-amber-300/20">
        {collapsed ? <ChevronUp size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
      </button>
    </header>

    {!collapsed && <div className="space-y-2 p-3">
      <p className="font-mono text-[10px] leading-snug text-amber-200/70">
        Not part of SilverRoute. Moves a simulated position along this route; the real clock is
        never changed.
      </p>

      {!active ? <>
        <button type="button" onClick={simulation.start} disabled={!ready}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded bg-amber-300 px-3 font-mono text-xs font-bold uppercase tracking-wide text-[#14161C] transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-40">
          <Play size={14} aria-hidden="true" /> Start simulated journey
        </button>
        {!ready && <p className="font-mono text-[10px] text-red-300">
          This route has no map geometry to follow.
        </p>}
      </> : <>
        <p className="font-mono text-[11px] text-amber-100">
          {clock(progressSeconds)} / {clock(totalSeconds)}
          {position && <span className="text-amber-200/70"> · step {position.legIndex + 1}</span>}
          {position?.waiting && <span className="text-amber-200/70"> · at stop</span>}
          {!playing && <span className="text-red-300"> · paused</span>}
        </p>

        <input type="range" min={0} max={Math.max(1, Math.round(totalSeconds))} step={1}
          value={Math.round(progressSeconds)} aria-label="Journey progress"
          onChange={event => simulation.seekTo(Number(event.target.value))}
          className="h-6 w-full accent-amber-300" />

        <div className="flex gap-1.5">
          <Control onClick={() => simulation.setPlaying(!playing)}
            title={playing ? 'Pause playback' : 'Resume playback'}>
            {playing ? <><Pause size={13} aria-hidden="true" /> Pause</> : <><Play size={13} aria-hidden="true" /> Play</>}
          </Control>
          <Control onClick={simulation.restart} title="Back to the start of the journey">
            <RotateCcw size={13} aria-hidden="true" /> Restart
          </Control>
          <Control onClick={simulation.stop} title="End the simulation and use the real device location">
            <Square size={13} aria-hidden="true" /> Stop
          </Control>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[10px] uppercase text-amber-200/70">Speed</span>
          {SPEEDS.map(option => <button key={option} type="button" onClick={() => simulation.setSpeed(option)}
            aria-pressed={speed === option}
            className={`min-h-8 flex-1 rounded border px-1 font-mono text-[11px] transition ${speed === option
              ? 'border-amber-300 bg-amber-300 font-bold text-[#14161C]'
              : 'border-amber-300/40 bg-white/5 text-amber-100 hover:bg-amber-300/20'}`}>
            {option}×
          </button>)}
        </div>

        <div className="flex gap-1.5">
          <Control onClick={simulation.jumpToBusStop} disabled={!nextStop}
            title={nextStop ? `Jump to ${nextStop.name || 'the bus stop'}` : 'No bus stop ahead on this route'}>
            <Bus size={13} aria-hidden="true" /> To stop
          </Control>
          <Control onClick={simulation.missNextBus} disabled={!nextStop?.code || !scriptedBuses}
            title="Re-time the next bus so it cannot be reached; the app skips to the one after">
            Miss next bus
          </Control>
        </div>

        <div className="grid gap-1.5">
          <Toggle label="Location" on={locationOn} onChange={simulation.setLocationOn}
            icon={<MapPin size={13} aria-hidden="true" />} />
          <Toggle label="Live data" on={liveDataOn} onChange={simulation.setLiveDataOn}
            icon={<Wifi size={13} aria-hidden="true" />} />
          <Toggle label="Bus times" on={scriptedBuses} onChange={simulation.setScriptedBuses}
            onText="scripted" offText="real" icon={<Bus size={13} aria-hidden="true" />} />
        </div>

        {speed > 1 && <p className="font-mono text-[10px] leading-snug text-amber-200/70">
          Bus times run on the real clock, so above 1× the dot reaches the stop early and waits
          there in real time. Jump to the stop, then use Miss next bus.
        </p>}
      </>}
    </div>}
  </section>
}
