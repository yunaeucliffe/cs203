import { Train } from 'lucide-react'
import { BADGE_SIZES, DEFAULT_LINE_COLOR, LINE_COLORS, getLineCode } from '../../utils/transit'

function MrtBadge({ service, size = 'sm' }) {
    const code = getLineCode(service)
    const color = code ? LINE_COLORS[code] : DEFAULT_LINE_COLOR
    const { box, text } = BADGE_SIZES[size] || BADGE_SIZES.sm

    return (
        <span
            className={`flex ${box} shrink-0 items-center justify-center rounded-md font-bold text-white`}
            style={{ backgroundColor: color }}
            title={code ? `${code} Line` : 'Train'}
        >
            {code ? (
                <span className={text}>{code}</span>
            ) : (
                <Train size={size === 'md' ? 16 : 13} />
            )}
        </span>
    )
}

export default MrtBadge
