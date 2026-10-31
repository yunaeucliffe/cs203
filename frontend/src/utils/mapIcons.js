import L from 'leaflet'

// Red dot marker used for destination pins across the route map views.
export function createDestinationIcon({ size = 28, shadow = false } = {}) {
    return L.divIcon({
        className: '',
        html: `
            <div style="
                width: ${size}px;
                height: ${size}px;
                background: #e53935;
                border: 3px solid white;
                border-radius: 50%;
                ${shadow ? 'box-shadow: 0 2px 6px rgba(0,0,0,0.3);' : ''}
            "></div>
        `,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
    })
}
