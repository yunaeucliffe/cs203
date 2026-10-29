import { useEffect, useState } from 'react'
import SignIn from './SignIn'
import SignUp from './SignUp'
import Preferences from './Preferences'
import Profile from './Profile'
import Routes from './Routes'
import SavedPlaces from './SavedPlaces'
import Navbar from '../components/Navbar'
import LocationAutocomplete from '../components/LocationAutocomplete'
import SavedPlacesCard from '../components/SavedPlacesCard'
import { API_URL } from '../api'

import {
    Plus,
    ArrowRight,
    Search,
} from 'lucide-react'

function Home() {
    const [destination, setDestination] = useState('')
    const [destinationPlace, setDestinationPlace] = useState(null)
    const [currentPage, setCurrentPage] = useState('home')
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [userName, setUserName] = useState('there')
    const [savedPlaces, setSavedPlaces] = useState([])
    const [addSavedPlace, setAddSavedPlace] = useState(false)
    // Each page change adds a browser history entry, so the phone's Back button returns
    // to the previous SilverRoute page instead of leaving the app.
    const goTo = (page, { replace = false } = {}) => {
        if (page === currentPage && !replace) return
        setCurrentPage(page)
        if (replace) window.history.replaceState({ page }, '')
        else window.history.pushState({ page }, '')
    }

    useEffect(() => {
        window.history.replaceState({ page: 'home' }, '')
        const onPopState = (event) => setCurrentPage(event.state?.page ?? 'home')
        window.addEventListener('popstate', onPopState)
        return () => window.removeEventListener('popstate', onPopState)
    }, [])

    useEffect(() => {
        const controller = new AbortController()

        fetch(`${API_URL}/api/users/me/profile`, {
            credentials: 'include',
            signal: controller.signal,
        })
            .then(async (response) => {
                setIsAuthenticated(response.ok)
                if (!response.ok) return
                const profile = await response.json()
                setUserName(profile.name.split(' ')[0])
                const placesResponse = await fetch(`${API_URL}/api/users/me/saved-places`, {
                    credentials: 'include',
                    signal: controller.signal,
                })
                if (placesResponse.ok) setSavedPlaces(await placesResponse.json())
            })
            .catch((error) => {
                if (error.name !== 'AbortError') {
                    setIsAuthenticated(false)
                }
            })

        return () => controller.abort()
    }, [])

    const handleSearch = () => {
        if (destination.trim() === '') {
            return
        }

        goTo('routes')
    }

    const openSavedPlaces = () => {
        if (isAuthenticated) goTo('savedPlaces')
        else goTo('signIn')
    }

    const openAddSavedPlace = () => {
        if (isAuthenticated) {
            setAddSavedPlace(true)
            goTo('savedPlaces')
        } else {
            goTo('signIn')
        }
    }

    const selectSavedPlace = (place) => {
        setDestination(place.address)
        setDestinationPlace(Number.isFinite(place.latitude) && Number.isFinite(place.longitude)
            ? { name: place.address, address: place.address, latitude: place.latitude, longitude: place.longitude } : null)
        goTo('routes')
    }

    if (currentPage === 'signIn') {
        return (
            <SignIn
                onHome={() => goTo('home')}
                onSignIn={(account) => {
                    // Replace the sign-in entry so Back doesn't reopen the sign-in form.
                    goTo('home', { replace: true })
                    setIsAuthenticated(true)
                    setUserName(account.name.split(' ')[0])
                    fetch(`${API_URL}/api/users/me/saved-places`, {
                        credentials: 'include',
                    })
                        .then((response) => response.ok ? response.json() : [])
                        .then(setSavedPlaces)
                        .catch(() => setSavedPlaces([]))
                }}
                onSignUp={() => {
                    goTo('signUp')
                }}
            />
        )
    }

    if (currentPage === 'signUp') {
        return (
            <SignUp
                onHome={() => goTo('home')}
                onBackToLogin={() => {
                    goTo('signIn')
                }}
                onSignUp={(account) => {
                    goTo('preferences', { replace: true })
                    setIsAuthenticated(true)
                    setUserName(account.name.split(' ')[0])
                    setSavedPlaces([])
                }}
            />
        )
    }

    if (currentPage === 'preferences') {
        return (
            <Preferences
                onComplete={() => goTo('home', { replace: true })}
            />
        )
    }

    if (currentPage === 'profile') {
        return (
            <Profile
                onBack={() => goTo('home')}
                onHome={() => goTo('home')}
                onRoutes={() => goTo('routes')}
                onSavedPlaces={openSavedPlaces}
                onSignIn={() => goTo('signIn')}
                isAuthenticated={isAuthenticated}
                onLogout={() => {
                    setIsAuthenticated(false)
                    goTo('home', { replace: true })
                }}
            />
        )
    }

    if (currentPage === 'savedPlaces') {
        return (
            <SavedPlaces
                startAdding={addSavedPlace}

                onHome={() => {
                    goTo('home')
                    setAddSavedPlace(false)
                }}

                onRoutes={() => {
                    goTo('routes')
                    setAddSavedPlace(false)
                }}

                onProfile={() => {
                    goTo('profile')
                    setAddSavedPlace(false)
                }}

                onSignIn={() => {
                    goTo('signIn')
                    setAddSavedPlace(false)
                }}

                onUsePlace={selectSavedPlace}
                onPlacesChange={setSavedPlaces}
                isAuthenticated={isAuthenticated}
            />
        )
    }

    if (currentPage === 'routes') {
        return (
            <Routes
                onBack={() => goTo('home')}
                onSignIn={() => goTo('signIn')}
                onProfile={() => goTo('profile')}
                onSavedPlaces={openSavedPlaces}
                isAuthenticated={isAuthenticated}
                initialDestination={destination}
                initialDestinationPlace={destinationPlace}
            />
        )
    }

    return (
        <div className=" relative min-h-screen bg-[#FAF7F0] text-[#2A3439]">

            {/* MAP BACKGROUND 
            <img
                src="/background.png"
                alt=""
                className="pointer-events-none fixed inset-0 z-0 object-cover opacity-[0.07]"
            /> */}

            <div className="relative z-10">

                <Navbar
                    activePage="home"
                    onHome={() => goTo('home')}
                    onRoutes={() => goTo('routes')}
                    onSignIn={() => goTo('signIn')}
                    onProfile={() => goTo('profile')}
                    onSavedPlaces={openSavedPlaces}
                    isAuthenticated={isAuthenticated}
                />

                {/* MAIN */}
                <main className="mx-auto max-w-7xl px-4 sm:px-8">

                    <div className="grid grid-cols-1 lg:min-h-[calc(100vh-87px)] lg:grid-cols-[1.12fr_0.88fr]">


                        {/* ================================================= */}
                        {/* LEFT SIDE */}
                        {/* ================================================= */}

                        <section className="flex flex-col justify-center border-b border-[#7A7F7A]/20 py-8 lg:border-b-0 lg:border-r lg:py-12 lg:pr-14">

                            {/* Greeting */}
                            <p className="mb-4 text-base font-semibold text-[#555C60]">
                                Hello, {isAuthenticated ? userName : 'there'}
                            </p>

                            {/* Main heading */}
                            <h1
                                className="max-w-[720px] text-4xl text-[#2A3439] sm:text-5xl"
                                style={{
                                    fontFamily: '"DM Serif Display", serif',
                                }}
                            >
                                Where would you like to go today?
                            </h1>

                            {/* SEARCH AREA */}
                            <div className="mt-6 max-w-[680px] sm:mt-10">

                                <div className="flex flex-col border-2 border-[#3E424B] bg-white sm:flex-row">

                                    {/* Input */}
                                    <div className="flex min-w-0 flex-1 items-center gap-3 px-5">

                                        <Search
                                            size={23}
                                            className="shrink-0 text-[#555C60]"
                                        />

                                        <LocationAutocomplete
                                            label="Destination"
                                            placeholder="Enter destination, landmark or address"
                                            value={destination}
                                            selectedPlace={destinationPlace}
                                            onChange={(text) => { setDestination(text); setDestinationPlace(null) }}
                                            onSelect={(place) => {
                                                setDestination(place.name)
                                                setDestinationPlace(place)
                                            }}
                                            onSubmit={handleSearch}
                                            className="h-[70px] w-full bg-transparent text-base text-[#2A3439] outline-none placeholder:text-[#555C60]"
                                        />

                                    </div>


                                    {/* Find Route */}
                                    <button
                                        onClick={handleSearch}
                                        className="flex min-h-[60px] items-center justify-center gap-3 bg-[#3E424B] px-7 text-base font-bold text-white transition hover:bg-[#2A3439] sm:min-w-[170px]"
                                    >
                                        Find route

                                        <ArrowRight size={20} />

                                    </button>

                                </div>

                            </div>

                        </section>

                        {/* ================================================= */}
                        {/* RIGHT SIDE — SAVED PLACES */}
                        {/* ================================================= */}

                        <section className="flex flex-col justify-center py-8 lg:py-12 lg:pl-12">

                            {/* Heading */}
                            <div className="mb-6 flex items-end justify-between">

                                <div>
                                    <p className="mb-1 text-sm font-bold uppercase tracking-[0.16em] text-[#555C60]">
                                        Quick access
                                    </p>

                                    <h2
                                        className="text-3xl text-[#2A3439]"
                                        style={{
                                            fontFamily: '"DM Serif Display", serif',
                                        }}
                                    >
                                        Saved places
                                    </h2>
                                </div>

                                <button onClick={openSavedPlaces} className="text-sm font-bold text-[#555C60] underline underline-offset-4 transition hover:text-[#2A3439]">
                                    View all
                                </button>

                            </div>

                            {/* Saved Places */}
                            {isAuthenticated && savedPlaces.length > 0 ? (
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    {savedPlaces.slice(0, 2).map((place) => (
                                        <SavedPlacesCard
                                            key={place.id}
                                            label={place.label}
                                            address={place.address}
                                            onClick={() => selectSavedPlace(place)}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="rounded-[18px] border border-[#7A7F7A]/20 bg-white p-6 text-[#555C60]">
                                    {isAuthenticated
                                        ? 'You have no saved places yet.'
                                        : 'Sign in to see your saved places.'}
                                </div>
                            )}

                            {/* ADD PLACE */}

                            <button onClick={openAddSavedPlace} className="group mt-4 flex min-h-[100px] w-full items-center gap-5 border-2 border-dashed border-[#A88FA1]/45 rounded-xl px-5 text-left transition hover:border-[#A88FA1] hover:bg-[#A88FA1]/10">

                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#A88FA1] text-white">
                                    <Plus size={21} />
                                </div>

                                <div className="flex-1">
                                    <h3
                                        className="text-lg text-[#2A3439]"
                                        style={{
                                            fontFamily: '"DM Serif Display", serif',
                                        }}

                                    >
                                        Add a saved place
                                    </h3>

                                    <p className="mt-1 text-sm text-[#555C60]">
                                        Keep somewhere you visit often.
                                    </p>

                                </div>

                                <ArrowRight
                                    size={20}
                                    className="text-[#555C60] transition group-hover:translate-x-1"
                                />
                            </button>
                        </section>
                    </div>
                </main>
            </div>

        </div>
    )
}

export default Home
