import L from 'leaflet'

// HTML/CSS dot markers. They avoid Leaflet's default image-based pin, whose
// image path breaks in the production build.
function createDotIcon(color, { size = 28, shadow = false } = {}) {
    return L.divIcon({
        className: '',
        html: `
            <div style="
                width: ${size}px;
                height: ${size}px;
                background: ${color};
                border: 3px solid white;
                border-radius: 50%;
                ${shadow ? 'box-shadow: 0 2px 6px rgba(0,0,0,0.3);' : ''}
            "></div>
        `,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
    })
}

// Red dot marker used for destination pins across the route map views.
export function createDestinationIcon(options) {
    return createDotIcon('#e53935', options)
}

// Blue dot marker for a route's starting point.
export function createStartIcon(options) {
    return createDotIcon('#2F6FED', options)
}
