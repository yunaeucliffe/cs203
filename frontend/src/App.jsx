import { useState } from 'react'
import './App.css'

import {
  Leaf,
  User,
  ShieldCheck,
  Footprints,
  Heart,
  MapPin,
  Search,
  House,
  Map,
  LogOut,
  TreePine,
  Armchair,
  Navigation,
  Cloud,
  Sun,
  Accessibility,
  Route as RouteIcon,
  CircleDot,
} from 'lucide-react'

import Route from './pages/Route'
import Login from './pages/Login'
import Profile from './pages/Profile'
import SignUp from './pages/SignUp'

function App() {
  const [destination, setDestination] = useState('')
  const [showRoute, setShowRoute] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showSignUp, setShowSignUp] = useState(false)

  const handleSearch = () => {
    if (destination.trim() === '') {
      return
    }

    setShowRoute(true)
  }

  // =====================================================
  // LOGIN / SIGN UP
  // =====================================================

  if (!isLoggedIn) {
    if (showSignUp) {
      return (
        <SignUp
          onBackToLogin={() => setShowSignUp(false)}
        />
      )
    }

    return (
      <Login
        onLogin={() => setIsLoggedIn(true)}
        onSignUp={() => setShowSignUp(true)}
      />
    )
  }

  // =====================================================
  // PROFILE
  // =====================================================

  if (showProfile) {
    return (
      <Profile
        onBack={() => setShowProfile(false)}
      />
    )
  }

  // =====================================================
  // ROUTE PAGE
  // =====================================================

  if (showRoute) {
    return (
      <Route
        destination={destination}
        onBack={() => setShowRoute(false)}
      />
    )
  }

  // =====================================================
  // HOME PAGE
  // =====================================================

  return (
    <div className="home-page">

      {/* =================================================
          HEADER
      ================================================= */}

      <header className="home-header">

        <div className="brand">

          <div className="brand-icon">
            <Leaf
              size={32}
              strokeWidth={2}
            />
          </div>

          <div>

            <div className="brand-name">
              SilverRoute
            </div>

            <div className="brand-tagline">
              Safer Journeys, Brighter Days
            </div>

          </div>

        </div>


        <div className="header-actions">

          <button
            className="profile-button"
            onClick={() => setShowProfile(true)}
          >

            <User size={22} />

            <span>
              Profile
            </span>

          </button>


          <button
            className="logout-button"
            onClick={() => setIsLoggedIn(false)}
          >

            <LogOut size={21} />

            <span>
              Logout
            </span>

          </button>

        </div>

      </header>

      {/* =================================================
          MAIN CONTENT
      ================================================= */}

      <main className="home-content">


        {/* =================================================
            HERO
        ================================================= */}

        <section className="hero-section">


          {/* Decorative clouds */}

          <div className="hero-cloud hero-cloud-left">
            <Cloud size={62} />
          </div>

          <div className="hero-cloud hero-cloud-right">
            <Cloud size={48} />
          </div>


          {/* Decorative sun */}

          <div className="hero-sun">
            <Sun size={65} />
          </div>


          {/* ===============================================
              PARK / ROUTE ILLUSTRATION
          =============================================== */}

          <div className="park-scene">


            {/* Background hills */}

            <div className="park-hill hill-one"></div>

            <div className="park-hill hill-two"></div>


            {/* Trees */}

            <div className="scene-tree tree-left">

              <TreePine
                size={115}
                strokeWidth={1.4}
              />

            </div>


            <div className="scene-tree tree-right">

              <TreePine
                size={95}
                strokeWidth={1.4}
              />

            </div>


            {/* Walking path */}

            <div className="walking-path">

              <div className="path-line"></div>

            </div>


            {/* Bench */}

            <div className="scene-bench">

              <div className="bench-back"></div>

              <div className="bench-seat"></div>

              <div className="bench-leg bench-leg-left"></div>

              <div className="bench-leg bench-leg-right"></div>

            </div>


            {/* Two people */}

            <div className="walking-couple">


              {/* Person 1 */}

              <div className="walker walker-one">

                <div className="walker-head"></div>

                <div className="walker-body"></div>

              </div>


              {/* Person 2 */}

              <div className="walker walker-two">

                <div className="walker-head"></div>

                <div className="walker-body woman-body"></div>

              </div>


            </div>


            {/* Small route dots */}

            <div className="route-dot dot-one">

              <CircleDot size={16} />

            </div>


            <div className="route-dot dot-two">

              <CircleDot size={16} />

            </div>


          </div>


          {/* ===============================================
              HERO TEXT
          =============================================== */}

          <div className="hero-text">

            <p className="welcome-text">
              WELCOME TO SILVERROUTE
            </p>

            <h1>
              A kinder way to
              <br />
              <span>find your way.</span>
            </h1>

            <p className="hero-description">
              Comfortable, safer and more accessible
              journeys designed with you in mind.
            </p>

          </div>


          {/* ===============================================
              SEARCH
          =============================================== */}

          <div className="search-card">

            <div className="search-title">

              <MapPin size={25} />

              <span>
                Where would you like to go?
              </span>

            </div>


            <div className="search-box">

              <MapPin
                className="search-icon"
                size={24}
              />


              <input
                type="text"
                placeholder="Enter your destination"
                value={destination}
                onChange={(event) =>
                  setDestination(event.target.value)
                }
                onKeyDown={(event) => {

                  if (event.key === 'Enter') {
                    handleSearch()
                  }

                }}
              />


              <button
                className="find-route-button"
                onClick={handleSearch}
              >

                <Search size={22} />

                <span>
                  Find Route
                </span>

              </button>

            </div>

          </div>

        </section>


        {/* =================================================
            FEATURES
        ================================================= */}

        <section className="features-section">

          <div className="section-heading">

            <div>

              <h2>
                Our Features
              </h2>

              <p>
                Built around your comfort and confidence
              </p>

            </div>


            <Leaf
              className="section-decoration"
              size={40}
            />

          </div>


          <div className="feature-grid">


            <div className="feature-card">

              <div className="feature-icon">

                <Accessibility size={36} />

              </div>

              <h3>
                Elder-Friendly
              </h3>

              <p>
                Routes designed around your
                comfort and mobility.
              </p>

            </div>


            <div className="feature-card">

              <div className="feature-icon">

                <ShieldCheck size={36} />

              </div>

              <h3>
                Safer Routes
              </h3>

              <p>
                Avoid stairs, steep paths and
                difficult crossings.
              </p>

            </div>


            <div className="feature-card">

              <div className="feature-icon">

                <Footprints size={36} />

              </div>

              <h3>
                Comfortable Pace
              </h3>

              <p>
                Choose routes that match
                your walking ability.
              </p>

            </div>


            <div className="feature-card">

              <div className="feature-icon">

                <Heart size={36} />

              </div>

              <h3>
                Travel Comfortably
              </h3>

              <p>
                Consider shelter, rest areas
                and weather conditions.
              </p>

            </div>

          </div>

        </section>


        {/* =================================================
            HOW SILVERROUTE HELPS
        ================================================= */}

        <section className="journey-section">

          <div className="section-heading">

            <div>

              <h2>
                A Better Way to Travel
              </h2>

              <p>
                SilverRoute considers more than just distance.
              </p>

            </div>

            <RouteIcon
              className="section-decoration"
              size={40}
            />

          </div>


          <div className="journey-card">

            <div className="journey-step">

              <div className="journey-number">
                1
              </div>

              <MapPin size={30} />

              <div>

                <h3>
                  Choose your destination
                </h3>

                <p>
                  Tell SilverRoute where you want
                  to go.
                </p>

              </div>

            </div>


            <div className="journey-line"></div>


            <div className="journey-step">

              <div className="journey-number">
                2
              </div>

              <ShieldCheck size={30} />

              <div>

                <h3>
                  We consider your comfort
                </h3>

                <p>
                  Walking distance, stairs,
                  shelter and transfers are considered.
                </p>

              </div>

            </div>


            <div className="journey-line"></div>


            <div className="journey-step">

              <div className="journey-number">
                3
              </div>

              <Navigation size={30} />

              <div>

                <h3>
                  Follow your comfortable route
                </h3>

                <p>
                  Get a route designed to make
                  your journey easier.
                </p>

              </div>

            </div>

          </div>

        </section>


        {/* =================================================
            POPULAR PLACES
        ================================================= */}

        <section className="popular-section">

          <div className="section-heading">

            <div>

              <h2>
                Popular Nearby
              </h2>

              <p>
                Places you may enjoy visiting
              </p>

            </div>


            <button className="see-all-button">
              See all
            </button>

          </div>


          <div className="place-grid">


            <div className="place-card">

              <div className="place-illustration east-coast">

                <TreePine size={52} />

              </div>

              <div className="place-info">

                <div className="place-title">

                  <MapPin size={18} />

                  <h3>
                    East Coast Park
                  </h3>

                </div>

                <p>
                  Parks & Nature
                </p>

              </div>

            </div>


            <div className="place-card">

              <div className="place-illustration bedok">

                <Armchair size={52} />

              </div>

              <div className="place-info">

                <div className="place-title">

                  <MapPin size={18} />

                  <h3>
                    Bedok Reservoir
                  </h3>

                </div>

                <p>
                  Rest Stops
                </p>

              </div>

            </div>


            <div className="place-card">

              <div className="place-illustration marina">

                <MapPin size={52} />

              </div>

              <div className="place-info">

                <div className="place-title">

                  <MapPin size={18} />

                  <h3>
                    Marina Bay
                  </h3>

                </div>

                <p>
                  Scenic Routes
                </p>

              </div>

            </div>


            <div className="place-card">

              <div className="place-illustration katong">

                <Leaf size={52} />

              </div>

              <div className="place-info">

                <div className="place-title">

                  <MapPin size={18} />

                  <h3>
                    Katong
                  </h3>

                </div>

                <p>
                  Heritage Walks
                </p>

              </div>

            </div>

          </div>

        </section>


        {/* =================================================
            FINAL MESSAGE
        ================================================= */}

        <section className="promise-banner">

          <Leaf
            className="promise-leaf left"
            size={70}
          />

          <div className="promise-content">

            <h2>
              Explore more. Worry less.
            </h2>

            <p>
              Every journey should feel
              comfortable, safe and enjoyable.
            </p>

          </div>

          <Leaf
            className="promise-leaf right"
            size={70}
          />

        </section>

      </main>


      {/* =================================================
          BOTTOM NAVIGATION
      ================================================= */}

      <nav className="bottom-nav">

        <button className="active">

          <House size={30} />

          <span>
            Home
          </span>

        </button>


        <button>

          <Map size={30} />

          <span>
            Trips
          </span>

        </button>

      </nav>

    </div>
  )
}

export default App