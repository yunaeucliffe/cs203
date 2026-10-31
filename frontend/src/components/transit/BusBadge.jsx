import { BADGE_SIZES, BUS_COLOR } from '../../utils/transit'

function BusBadge({ number, size = 'sm' }) {
    const { box, text } = BADGE_SIZES[size] || BADGE_SIZES.sm

    return (
        <span
            className={`flex ${box} shrink-0 items-center justify-center rounded-md font-bold text-white`}
            style={{ backgroundColor: BUS_COLOR }}
        >
            <span className={text}>{number || 'Bus'}</span>
        </span>
    )
}

export default BusBadge
