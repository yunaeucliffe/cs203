import { useEffect } from 'react'
import { Circle, CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import DirectionMarker from './DirectionMarker'

function hasCoordinates(place) {
  return Number.isFinite(place?.latitude) && Number.isFinite(place?.longitude)
}

function MapViewport({ origin, destination }) {
  const map = useMap()

  useEffect(() => {
    const update = () => {
      map.invalidateSize({ pan: false })
      const points = [origin, destination].filter(hasCoordinates)
        .map(place => [place.latitude, place.longitude])
      if (points.length === 1) map.setView(points[0], 16)
      else if (points.length > 1) map.fitBounds(points, { padding: [40, 40], maxZoom: 16 })
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(map.getContainer())
    return () => observer.disconnect()
  }, [map, origin, destination])

  return null
}

export default function RouteSearchMap({ deviceLocation, origin, destination, heading = null }) {
  const start = deviceLocation || origin

  return (
    <section aria-label="Route search map" className="min-w-0 overflow-hidden rounded-[24px] border border-[#7A7F7A]/20 bg-white">
      <div className="relative z-0 h-[300px] sm:h-[550px] lg:h-[650px]">
        <MapContainer center={[1.3521, 103.8198]} zoom={12} scrollWheelZoom={false} className="h-full w-full">
          <TileLayer url="https://www.onemap.gov.sg/maps/tiles/Default/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.onemap.gov.sg/">OneMap</a> | Singapore Land Authority' />
          <MapViewport origin={start} destination={destination} />
          {hasCoordinates(start) && (
            <>
              {/* Compass cone on phones, only when the start is the user's own location */}
              {deviceLocation && heading !== null && (
                <DirectionMarker position={[start.latitude, start.longitude]} heading={heading} />
              )}
              {deviceLocation?.accuracy > 0 && (
                <Circle center={[start.latitude, start.longitude]} radius={deviceLocation.accuracy} pathOptions={{ color: '#2F6FED', weight: 1, fillOpacity: 0.1 }} />
              )}
              <CircleMarker center={[start.latitude, start.longitude]} radius={10} pathOptions={{ color: 'white', weight: 3, fillColor: '#2F6FED', fillOpacity: 1 }}>
                <Popup>{deviceLocation ? 'You are here' : `Starting point: ${start.name}`}</Popup>
              </CircleMarker>
            </>
          )}
          {hasCoordinates(destination) && (
            <CircleMarker center={[destination.latitude, destination.longitude]} radius={10} pathOptions={{ color: 'white', weight: 3, fillColor: '#C83232', fillOpacity: 1 }}>
              <Popup>Destination: {destination.name}</Popup>
            </CircleMarker>
          )}
        </MapContainer>
      </div>
    </section>
  )
}
