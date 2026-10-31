// Official LTA line colors, so badges match what riders already see on station signage.
export const LINE_COLORS = {
    NS: '#D42E12',
    EW: '#009645',
    CG: '#009645',
    NE: '#9900AA',
    CC: '#FA9E0D',
    CE: '#FA9E0D',
    DT: '#005EC4',
    TE: '#9D5B25',
    BP: '#748477',
    SW: '#748477',
    SE: '#748477',
    PW: '#748477',
    PE: '#748477',
    STC: '#748477',
    PTC: '#748477',
}

export const DEFAULT_LINE_COLOR = '#3E424B'

// Lime green, Google-Maps-style for bus - distinct from the Green/East-West
// Line's darker emerald (#009645) so a bus badge is never mistaken for a
// train line badge.
export const BUS_COLOR = '#8BC34A'

// Shared by MrtBadge and BusBadge so both render as the same size/shape badge.
export const BADGE_SIZES = {
    sm: { box: 'h-6 min-w-6 px-1.5', text: 'text-xs' },
    md: { box: 'h-8 min-w-8 px-2.5', text: 'text-sm' },
}

export function getLegMode(leg) {
    const mode = String(leg?.mode || '').toUpperCase()

    if (mode.includes('WALK')) return 'WALK'
    if (mode.includes('BUS')) return 'BUS'

    if (
        mode.includes('TRAIN') ||
        mode.includes('MRT') ||
        mode.includes('LRT') ||
        mode.includes('RAIL') ||
        mode.includes('SUBWAY')
    ) {
        return 'TRAIN'
    }

    return mode || 'OTHER'
}

// leg.service for a TRAIN leg comes from OneMap's routeShortName, already a clean
// code like "EW" or "NS" (digit suffixes such as "EW24" belong to station stopCode,
// never to service). The digit-stripping fallback only guards against a future
// provider sending something less clean.
export function getLineCode(service) {
    if (!service) return null

    const normalized = String(service).trim().toUpperCase()

    if (LINE_COLORS[normalized]) return normalized

    const match = normalized.match(/^([A-Z]{2,3})/)
    if (match && LINE_COLORS[match[1]]) return match[1]

    return null
}

export function formatTime(time) {
    if (!time) return null

    const date = new Date(time)

    if (Number.isNaN(date.getTime())) {
        return null
    }

    return new Intl.DateTimeFormat('en-SG', {
        timeZone: 'Asia/Singapore',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    }).format(date)
}

export function formatDuration(seconds) {
    if (seconds == null || !Number.isFinite(Number(seconds))) {
        return 'Unavailable'
    }

    return `${Math.ceil(Number(seconds) / 60)} min`
}

export function formatDistance(meters) {
    if (meters == null || !Number.isFinite(Number(meters))) {
        return 'Unavailable'
    }

    const distance = Number(meters)

    if (distance >= 1000) {
        return `${(distance / 1000).toFixed(1)} km`
    }

    return `${Math.round(distance)} m`
}
