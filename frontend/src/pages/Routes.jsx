import { useState } from 'react'

import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Polyline,
  Popup,
} from 'react-leaflet'

import 'leaflet/dist/leaflet.css'

import {
  MapPin,
  Navigation,
  LocateFixed,
  Footprints,
  Bus,
  ArrowRight,
  Umbrella,
  Accessibility,
} from 'lucide-react'

import Navbar from '../components/Navbar'

function Route({ onBack }) {
  const [destination, setDestination] = useState('')
  const [showRoute, setShowRoute] = useState(false)

  /*
   * TEMPORARY MAP DATA
   *
   * These coordinates are currently hardcoded just to test
   * the map and blue route line.
   *
   * Later, these will come from the backend / OneMap Routing API.
   */

  const currentLocation = [1.3521, 103.8198]

  const destinationLocation = [1.3575, 103.8190]

  const routeCoordinates = [
    [1.3521, 103.8198],
    [1.3530, 103.8195],
    [1.3540, 103.8192],
    [1.3550, 103.8190],
    [1.3560, 103.8188],
    [1.3575, 103.8190],
  ]

  // For now this only displays dummy route information.
  // Later, this function can call the backend / routing API.
  const handleFindRoute = () => {
    if (destination.trim() === '') {
      return
    }

    setShowRoute(true)
  }

  return (
    <div className="min-h-screen bg-[#FAF7F0] text-[#2A3439]">

      {/* NAVBAR */}
      <Navbar
        activePage="routes"
        onHome={onBack}
        onRoutes={() => {}}
      />

      {/* MAIN PAGE */}
      <main className="mx-auto max-w-7xl px-8 pb-10 pt-10">

        {/* TWO-COLUMN LAYOUT */}
        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">

          {/* ====================================== */}
          {/* LEFT SIDE */}
          {/* ====================================== */}

          <section>

            {/* SEARCH AREA */}
            <div className="rounded-[24px] border border-[#7A7F7A]/20 bg-white p-6">

              {/* CURRENT LOCATION */}
              <div className="mb-5">

                <label className="mb-2 block text-sm font-bold text-[#2A3439]">
                  From
                </label>

                <div className="flex h-[62px] items-center gap-3 rounded-2xl bg-[#FAF7F0] px-4">

                  <LocateFixed
                    size={21}
                    className="shrink-0 text-[#7A7F7A]"
                  />

                  <input
                    type="text"
                    value="Current location"
                    readOnly
                    className="w-full bg-transparent text-base outline-none"
                  />

                  <button
                    type="button"
                    className="shrink-0 text-sm font-semibold text-[#7A7F7A] transition hover:text-[#2A3439]"
                  >
                    Use my location
                  </button>

                </div>

              </div>

              {/* DESTINATION */}
              <div>

                <label className="mb-2 block text-sm font-bold text-[#2A3439]">
                  To
                </label>

                <div className="flex h-[62px] items-center gap-3 rounded-2xl bg-[#FAF7F0] px-4">

                  <MapPin
                    size={21}
                    className="shrink-0 text-[#7A7F7A]"
                  />

                  <input
                    type="text"
                    value={destination}
                    onChange={(event) => setDestination(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        handleFindRoute()
                      }
                    }}
                    placeholder="Enter destination, landmark or address"
                    className="w-full bg-transparent text-base outline-none placeholder:text-[#7A7F7A]"
                  />

                </div>

              </div>

              {/* FIND ROUTE */}
              <button
                type="button"
                onClick={handleFindRoute}
                className="mt-5 flex h-[62px] w-full items-center justify-center gap-3 rounded-2xl bg-[#3E424B] text-lg font-semibold text-white transition hover:scale-[1.01]"
              >
                Find route

                <Navigation size={20} />

              </button>

            </div>

            {/* ====================================== */}
            {/* ROUTE RESULT */}
            {/* Only appears after Find route is clicked */}
            {/* ====================================== */}

            {showRoute && (

              <div className="mt-6 rounded-[24px] border-2 border-[#3E424B]/80 bg-[#DCE7D2] p-6">

                {/* ROUTE HEADER */}
                <div>

                  <p className="text-xs font-extrabold tracking-[0.14em] text-[#7A7F7A]">
                    BEST FOR YOU
                  </p>

                  <h2
                    className="mt-2 text-4xl text-[#2A3439]"
                    style={{ fontFamily: '"DM Serif Display", serif' }}
                  >
                    18 min
                  </h2>

                  <p className="mt-1 text-[#7A7F7A]">
                    1.2 km total journey
                  </p>

                </div>

                {/* TRANSPORT SEQUENCE */}
                <div className="mt-6 flex items-center gap-3">

                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white">
                    <Footprints size={20} />
                  </div>

                  <ArrowRight
                    size={17}
                    className="text-[#7A7F7A]"
                  />

                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white">
                    <Bus size={20} />
                  </div>

                  <ArrowRight
                    size={17}
                    className="text-[#7A7F7A]"
                  />

                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white">
                    <Footprints size={20} />
                  </div>

                </div>

                {/* ROUTE INFORMATION */}
                <div className="mt-6 divide-y divide-[#7A7F7A]/20 border-y border-[#7A7F7A]/20">

                  {/* SHELTERED */}
                  <div className="flex items-center justify-between py-4">

                    <div className="flex items-center gap-3">
                      <Umbrella size={20} />

                      <span className="font-medium">
                        Sheltered route
                      </span>
                    </div>

                    <span className="font-semibold">
                      80%
                    </span>

                  </div>

                  {/* WALKING */}
                  <div className="flex items-center justify-between py-4">

                    <div className="flex items-center gap-3">
                      <Footprints size={20} />

                      <span className="font-medium">
                        Walking
                      </span>
                    </div>

                    <span className="font-semibold">
                      6 min · 400 m
                    </span>

                  </div>

                  {/* TRANSFERS */}
                  <div className="flex items-center justify-between py-4">

                    <div className="flex items-center gap-3">
                      <Bus size={20} />

                      <span className="font-medium">
                        Transfers
                      </span>
                    </div>

                    <span className="font-semibold">
                      1
                    </span>

                  </div>

                  {/* ACCESSIBILITY */}
                  <div className="flex items-center justify-between py-4">

                    <div className="flex items-center gap-3">
                      <Accessibility size={20} />

                      <span className="font-medium">
                        Accessibility
                      </span>
                    </div>

                    <span className="text-right font-semibold">
                      Lift available · No stairs
                    </span>

                  </div>

                </div>

                {/* START NAVIGATION */}
                <button
                  type="button"
                  className="mt-6 flex h-[62px] w-full items-center justify-center gap-3 rounded-2xl bg-[#3E424B] text-lg font-semibold text-white transition hover:scale-[1.01]"
                >
                  Start navigation

                  <ArrowRight size={20} />

                </button>

              </div>

            )}

          </section>

          {/* ====================================== */}
          {/* RIGHT SIDE - MAP */}
          {/* ====================================== */}

          <section className="overflow-hidden rounded-[28px] border border-[#7A7F7A]/20">

            <MapContainer
              center={currentLocation}
              zoom={15}
              scrollWheelZoom={true}
              className="h-[650px] w-full"
            >

              {/* OneMap Singapore map */}
              <TileLayer
                url="https://www.onemap.gov.sg/maps/tiles/Default/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.onemap.gov.sg/">OneMap</a> contributors | Singapore Land Authority'
              />

              {/* CURRENT LOCATION */}
              <CircleMarker
                center={currentLocation}
                radius={9}
                pathOptions={{
                  color: '#ffffff',
                  weight: 4,
                  fillColor: '#4285F4',
                  fillOpacity: 1,
                }}
              >
                <Popup>
                  You are here
                </Popup>
              </CircleMarker>

              {showRoute && (
                <>
                  {/* DESTINATION */}
                  <CircleMarker
                    center={destinationLocation}
                    radius={9}
                    pathOptions={{
                      color: '#ffffff',
                      weight: 4,
                      fillColor: '#E45757',
                      fillOpacity: 1,
                    }}
                  >
                    <Popup>
                      Destination
                    </Popup>
                  </CircleMarker>

                  {/* BLUE ROUTE */}
                  <Polyline
                    positions={routeCoordinates}
                    pathOptions={{
                      color: '#2F6FED',
                      weight: 7,
                      opacity: 0.95,
                    }}
                  />
                </>
              )}

            </MapContainer>

          </section>

        </div>

      </main>

    </div>
  )
}

export default Route
