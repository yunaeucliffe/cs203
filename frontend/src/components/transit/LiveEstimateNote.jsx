import { Info } from 'lucide-react'

// Keeps the LTA disclaimer + last-updated time out of the way by default, so the
// bus arrival box stays short — expand to read the fine print.
function LiveEstimateNote({ stale, live, updatedLabel }) {
    return (
        <details className="mt-1 text-xs text-[#7A7F7A]">
            <summary className="inline-flex cursor-pointer list-none items-center gap-1 hover:text-[#555C60] [&::-webkit-details-marker]:hidden">
                <Info size={12} />
                Live estimate info
            </summary>
            <p className="mt-1">
                Live estimate from LTA; actual arrival may differ.
                {live && ' Updates automatically.'}
                {stale && ' Estimate expired.'}
                {updatedLabel && ` ${updatedLabel}`}
            </p>
        </details>
    )
}

export default LiveEstimateNote
