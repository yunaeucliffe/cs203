import { ChevronRight, Footprints, Navigation } from 'lucide-react'
import { getLegMode } from '../../utils/transit'
import MrtBadge from './MrtBadge'
import BusBadge from './BusBadge'

const WALK_ICON_SIZE = {
    sm: 16,
    md: 20,
}

function RouteModeChain({ legs, size = 'sm' }) {
    if (!Array.isArray(legs) || legs.length === 0) {
        return null
    }

    return (
        <div className="flex flex-wrap items-center gap-1.5 text-[#555C60]">
            {legs.map((leg, index) => {
                const mode = getLegMode(leg)

                return (
                    <span key={index} className="flex items-center gap-1.5">
                        {index > 0 && (
                            <ChevronRight
                                size={size === 'md' ? 16 : 14}
                                className="shrink-0 text-[#7A7F7A]"
                            />
                        )}

                        {mode === 'WALK' && (
                            <Footprints size={WALK_ICON_SIZE[size]} className="shrink-0" />
                        )}

                        {mode === 'TRAIN' && (
                            <MrtBadge service={leg.service} size={size} />
                        )}

                        {mode === 'BUS' && (
                            <BusBadge number={leg.service} size={size} />
                        )}

                        {mode !== 'WALK' && mode !== 'TRAIN' && mode !== 'BUS' && (
                            <Navigation size={WALK_ICON_SIZE[size]} className="shrink-0" />
                        )}
                    </span>
                )
            })}
        </div>
    )
}

export default RouteModeChain
