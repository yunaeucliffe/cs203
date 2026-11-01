import L from 'leaflet'
import { Marker, Pane } from 'react-leaflet'

// Below Leaflet's overlay pane (400) so the cone is painted under the location dot
// rather than tinting it, the way phone map apps draw it.
const PANE_Z_INDEX = 350

// Light-blue cone showing which way the user is facing. It fades towards the tip so the
// beam reads clearly against pale map tiles without hiding the streets ahead.
export default function DirectionMarker({ position, heading }) {
  const icon = L.divIcon({
    className: 'direction-marker-icon',
    html: `
      <svg width="88" height="88" viewBox="0 0 88 88" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="direction-cone-fade" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#2F6FED" stop-opacity="0.65" />
            <stop offset="60%" stop-color="#2F6FED" stop-opacity="0.38" />
            <stop offset="100%" stop-color="#2F6FED" stop-opacity="0.05" />
          </radialGradient>
        </defs>
        <path
          d="M44 6
            C58 17, 67 31, 72 49
            C62 44, 53 42, 44 42
            C35 42, 26 44, 16 49
            C21 31, 30 17, 44 6 Z"
          fill="url(#direction-cone-fade)"
          transform="rotate(${heading} 44 44)"
        />
      </svg>
    `,
    iconSize: [88, 88],
    iconAnchor: [44, 44],
  })

  return (
    <Pane name="direction-cone" style={{ zIndex: PANE_Z_INDEX }}>
      <Marker position={position} icon={icon} interactive={false} />
    </Pane>
  )
}
