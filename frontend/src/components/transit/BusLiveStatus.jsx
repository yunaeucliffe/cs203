const time = value => new Date(value).toLocaleTimeString('en-SG', {
    timeZone: 'Asia/Singapore', hour: 'numeric', minute: '2-digit', hour12: true,
})

// Condensed live arrival estimate for one BUS leg, meant to sit inline within
// that leg's row in the journey timeline (replaces the old standalone
// "Bus arrivals for your journey" section).
function BusLiveStatus({ bus, live }) {
    if (!bus) return null

    const { arrivals, stale, noCatchableArrivals } = bus

    let primary
    if (arrivals.length > 0) {
        primary = `Next bus: ${time(arrivals[0])}${arrivals[1] ? `, then ${time(arrivals[1])}` : ''}`
    } else if (noCatchableArrivals) {
        primary = 'No live arrivals shown yet for this time — check again closer to departure.'
    } else {
        primary = 'Live arrival info unavailable right now.'
    }

    return (
        <div className="mt-2 rounded-lg bg-[#FAF7F0] px-3 py-2">
            <p className="text-sm font-semibold text-[#2A3439]">{primary}</p>
            <p className="mt-0.5 text-xs text-[#7A7F7A]">
                Live estimate from LTA; actual arrival may differ.
                {stale && ' Estimate expired.'}
                {live && ' Updates automatically.'}
            </p>
        </div>
    )
}

export default BusLiveStatus
