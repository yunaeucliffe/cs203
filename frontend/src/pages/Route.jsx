import { MapContainer, TileLayer } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

function Route({ destination, onBack }) {
  return (
    <div className="route-page">

      {/* Header */}
      <button
        type="button"
        className="back-button"
        onClick={onBack}
      >
        ← Back
      </button>

      <h1>Route to {destination}</h1>

      <p className="route-subtitle">
        Here's the most comfortable route for you.
      </p>

      {/* AI Recommendation */}
      <div className="recommended-route">

        <div className="recommendation-header">
          <span>❤️</span>
          <h2>Best for you today</h2>
        </div>

        <div className="route-summary">
          <div>
            <strong>28 min</strong>
            <span>Total time</span>
          </div>

          <div>
            <strong>400 m</strong>
            <span>Walking</span>
          </div>

          <div>
            <strong>1</strong>
            <span>Transfer</span>
          </div>
        </div>

        <div className="route-benefits">
          <span>🌂 Sheltered</span>
          <span>🚫 No stairs</span>
          <span>🚶 Less walking</span>
        </div>

      </div>

      {/* Journey Steps */}
      <div className="journey">

        <div className="journey-step">
          <span className="step-icon">🚶</span>
          <div>
            <strong>Walk 3 min</strong>
            <p>Sheltered walkway</p>
          </div>
        </div>

        <div className="journey-step">
          <span className="step-icon">🚌</span>
          <div>
            <strong>Bus 121</strong>
            <p>7 stops • 15 min</p>
          </div>
        </div>

        <div className="journey-step">
          <span className="step-icon">🚶</span>
          <div>
            <strong>Walk 2 min</strong>
            <p>Sheltered walkway</p>
          </div>
        </div>

      </div>

      {/* Start Button */}
      <button type="button" className="start-button">
        Start Journey
      </button>

      <MapContainer
        center={[1.3521, 103.8198]}
        zoom={12}
        className="route-map"
      >
        <TileLayer
          url="https://www.onemap.gov.sg/maps/tiles/Default/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.onemap.gov.sg/">OneMap</a> contributors | Singapore Land Authority'
        />
      </MapContainer>

    </div>
  )
}

export default Route