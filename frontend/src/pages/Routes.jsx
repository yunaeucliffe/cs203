import { useState } from 'react'
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

                  <ArrowRight size={17} className="text-[#7A7F7A]" />

                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white">
                    <Bus size={20} />
                  </div>

                  <ArrowRight size={17} className="text-[#7A7F7A]" />

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
          {/* RIGHT SIDE - MAP PLACEHOLDER */}
          {/* ====================================== */}

          <section className="flex min-h-[650px] items-center justify-center rounded-[28px] border border-[#7A7F7A]/20 bg-[#E8E8E5]">

            <div className="text-center">

              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white">
                <MapPin
                  size={28}
                  className="text-[#3E424B]"
                />
              </div>

              <p className="mt-4 font-semibold text-[#2A3439]">
                Map integration placeholder
              </p>

              <p className="mt-1 text-sm text-[#7A7F7A]">
                Your route will appear here.
              </p>

            </div>

          </section>

        </div>

      </main>

    </div>
  )
}

export default Route