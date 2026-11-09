# Demo journey simulation

A presenter's tool for showing an active journey without walking a route. It plays a simulated
position along a route the normal route engine returned, so time left, arrival time, per-step
times and live bus arrivals all behave exactly as they do on the road.

It is **off unless switched on**, is never part of a user-facing session, and its controls are
deliberately styled as an instrument panel rather than as part of SilverRoute.

## Switching it on

Add `?demo=1` to the app URL. The choice is remembered for that browser, so it survives
reloads and the rest of the demo:

```
http://localhost:5173/?demo=1                 local
https://silverroute.vercel.app/?demo=1        deployed
```

`?demo=0` switches it off and forgets it. A deployment that exists only to demo can set
`VITE_DEMO_MODE=true` instead (see `frontend/.env.example`); leave it unset everywhere else.

With demo mode on, a **DEV · JOURNEY SIM** panel appears in the bottom-right corner of the
journey screen. Nothing simulates until **Start simulated journey** is pressed.

## Running a demo

The simulation hangs off the ordinary flow, so nothing is bypassed:

1. Search a route and open a route card, as a user would.
2. Confirm the route and press **Start navigation** — both still require a real
   recommendation from the route engine and a recorded choice.
3. In the dev panel, press **Start simulated journey**.

The location dot then walks the route's own geometry: along each leg at that leg's planned
pace, holding at a bus stop for the planned wait (at least two minutes, so there is a bus to
wait for). The map follows the dot, and the sidebar's time left, arrival time, per-step times
and bus countdowns update from that position, through the same code paths as a real GPS fix.

### Controls

| Control | What it does |
| --- | --- |
| **Pause** / **Play** | Freezes or resumes the dot. The wall clock keeps running. |
| **Restart** | Back to the start of the journey. |
| **Stop** | Ends the simulation; the device's own location takes over again. |
| Progress slider | Jumps anywhere in the journey. |
| **Speed** 0.5–8× | How fast the dot moves through the planned journey. |
| **To stop** | Jumps straight to the next bus stop on the route. |
| **Miss next bus** | Re-times the next bus so it cannot be reached (see below). |
| **Location** on/off | Withholds the position, as a denied or lost GPS fix would. |
| **Live data** on/off | Makes every live bus request fail. |
| **Bus times** scripted/real | Scripted arrivals, or the real LTA data for the stop. |

## What is simulated and what is real

**The wall clock is never altered.** `Date.now()` is the real time everywhere, so "Last
updated", the one-minute staleness rule and "Times may be outdated" behave exactly as in
production. Playback speed moves the *traveller*, not the clock — which is why above 1× the dot
outpaces the bus countdowns, as the panel notes.

**Position** is a fix like any other: on the route, accurate to 8 m, stamped with the real
time. It is fed to the same `locateOnRoute` matching the phone's fixes go through, so the
journey counts as on-route and the planned-times fallback stays hidden while it runs. The
device's GPS watch is stopped while a simulation runs, and resumes when it is stopped.

**Bus arrivals** are scripted by default, because real arrivals during a demo may be twenty
minutes away, absent at night, and will never be missed on cue. A scripted stop answers in
place of the provider, in the same shape as the backend's `LTA BusArrival` evidence and with
real wall-clock arrival times, so the countdown is a real countdown. The schedule is fixed the
first time a stop is polled (a bus roughly a minute after the traveller reaches the stop, then
every four minutes) rather than regenerated per refresh, so the times tick down instead of
sliding away. Switch **Bus times** to `real` to demo against live LTA data instead.

### Showing a bus being missed

**Miss next bus** rewrites the next bus's estimated arrival to just before the earliest the
traveller could be at the stop — which is what a revised live estimate does in real use. The
app then drops that bus and counts down to the one after it, as `navigationTiming` does for a
real unreachable arrival. Pressing the button is the predictable point in the demo.

### Showing the two fallbacks

- **Location** off → no fix, so the journey falls back to planned times with
  *"Location unavailable. Showing planned times."*
- **Live data** off → every bus request fails. The last good times are kept, as in real use,
  and flagged with *"Live updates unavailable. Times may be outdated."*

Both can be switched back on mid-demo; the live-data toggle forces an immediate refresh rather
than waiting for the next twenty-second poll.

## Code

| File | Role |
| --- | --- |
| `frontend/src/dev/demoMode.js` | The switch: URL flag, remembered per browser. |
| `frontend/src/dev/simulatedJourney.js` | Route → timeline, and position after N seconds. |
| `frontend/src/dev/scriptedBuses.js` | Scripted arrival times and provider-shaped evidence. |
| `frontend/src/dev/simulationStore.js` | Playback state, clock, and the stand-in provider. |
| `frontend/src/dev/useJourneySimulation.js` | Hook used by the journey screen. |
| `frontend/src/dev/SimulationPanel.jsx` | The dev panel. |

Tests: `frontend/tests/journeySimulation.test.js` (`npm test`) covers the timeline, the
simulated position being accepted as on-route, and a bus being skipped for the next one.

Two production hooks gained optional arguments for it, both no-ops by default:
`useBusArrivals(route, enabled, refreshKey)` and
`useNavigationTiming(route, location, startedAt, { busRefreshKey, resetKey })`.

## Limits

- A route whose legs carry no geometry and no stop coordinates cannot be simulated; the panel
  says so instead of offering to start.
- A bus leg without a five-digit stop code gets no scripted arrivals, exactly as it would get
  no live ones.
- Journey progress only ever moves forwards through the steps, so jumping backwards restarts
  that tracking (handled automatically).
- While simulating, a shared trip link shows the simulated position.
