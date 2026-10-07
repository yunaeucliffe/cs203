import { useEffect, useState } from 'react'
import SignIn from './SignIn'
import SignUp from './SignUp'
import Preferences from './Preferences'
import Profile from './Profile'
import Routes from './Routes'
import SavedPlaces from './SavedPlaces'
import Navbar from '../components/Navbar'
import SavedPlacesCard from '../components/SavedPlacesCard'
import { API_URL } from '../api'

import {
    Plus,
    ArrowRight,
    Search,
} from 'lucide-react'

function Home() {
    const [destination, setDestination] = useState('')
    const [currentPage, setCurrentPage] = useState('home')
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [userName, setUserName] = useState('there')
    const [savedPlaces, setSavedPlaces] = useState([])
    const [addSavedPlace, setAddSavedPlace] = useState(false)

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

        setCurrentPage('routes')
    }

    const openSavedPlaces = () => {
        if (isAuthenticated) setCurrentPage('savedPlaces')
        else setCurrentPage('signIn')
    }

    const openAddSavedPlace = () => {
        if (isAuthenticated) {
            setAddSavedPlace(true)
            setCurrentPage('savedPlaces')
        } else {
            setCurrentPage('signIn')
        }
    }

    const selectSavedPlace = (place) => {
        setDestination(place.address)
        setCurrentPage('routes')
    }

    if (currentPage === 'signIn') {
        return (
            <SignIn
                onSignIn={(account) => {
                    setCurrentPage('home')
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
                    setCurrentPage('signUp')
                }}
            />
        )
    }

    if (currentPage === 'signUp') {
        return (
            <SignUp
                onBackToLogin={() => {
                    setCurrentPage('signIn')
                }}
                onSignUp={(account) => {
                    setCurrentPage('preferences')
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
                onComplete={() => setCurrentPage('home')}
            />
        )
    }

    if (currentPage === 'profile') {
        return (
            <Profile
                onBack={() => setCurrentPage('home')}
                onLogout={() => {
                    setIsAuthenticated(false)
                    setCurrentPage('home')
                }}
            />
        )
    }

    if (currentPage === 'savedPlaces') {
        return (
            <SavedPlaces
                startAdding={addSavedPlace}

                onHome={() => {
                    setCurrentPage('home')
                    setAddSavedPlace(false)
                }}

                onRoutes={() => {
                    setCurrentPage('routes')
                    setAddSavedPlace(false)
                }}

                onProfile={() => {
                    setCurrentPage('profile')
                    setAddSavedPlace(false)
                }}

                onSignIn={() => {
                    setCurrentPage('signIn')
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
                destination={destination}
                onBack={() => setCurrentPage('home')}
                onSignIn={() => setCurrentPage('signIn')}
                onProfile={() => setCurrentPage('profile')}
                onSavedPlaces={openSavedPlaces}
                isAuthenticated={isAuthenticated}
                initialDestination={destination}
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
                    onHome={() => setCurrentPage('home')}
                    onRoutes={() => setCurrentPage('routes')}
                    onSignIn={() => setCurrentPage('signIn')}
                    onProfile={() => setCurrentPage('profile')}
                    onSavedPlaces={openSavedPlaces}
                    isAuthenticated={isAuthenticated}
                />

                {/* MAIN */}
                <main className="mx-auto max-w-7xl px-8">

                    <div className="grid min-h-[calc(100vh-87px)] grid-cols-[1.12fr_0.88fr]">


                        {/* ================================================= */}
                        {/* LEFT SIDE */}
                        {/* ================================================= */}

                        <section className="flex flex-col justify-center border-r border-[#7A7F7A]/20 py-12 pr-14">

                            {/* Greeting */}
                            <p className="mb-4 text-[18px] font-semibold text-[#7A7F7A]">
                                Hello, {isAuthenticated ? userName : 'there'}
                            </p>

                            {/* Main heading */}
                            <h1
                                className="max-w-[720px] text-5xl text-[#2A3439]"
                                style={{
                                    fontFamily: '"DM Serif Display", serif',
                                }}
                            >
                                Where would you like to go today?
                            </h1>

                            {/* SEARCH AREA */}
                            <div className="mt-10 max-w-[680px]">

                                <div className="flex overflow-hidden border-2 border-[#3E424B] bg-white">

                                    {/* Input */}
                                    <div className="flex flex-1 items-center gap-3 px-5">

                                        <Search
                                            size={23}
                                            className="shrink-0 text-[#7A7F7A]"
                                        />

                                        <input
                                            id="destination"
                                            type="text"
                                            placeholder="Enter destination, landmark or address"
                                            value={destination}
                                            onChange={(event) =>
                                                setDestination(event.target.value)
                                            }
                                            onKeyDown={(event) => {
                                                if (event.key === 'Enter') {
                                                    handleSearch()
                                                }
                                            }}
                                            className="h-[70px] w-full bg-transparent text-[18px] text-[#2A3439] outline-none placeholder:text-[#7A7F7A]"
                                        />

                                    </div>


                                    {/* Find Route */}
                                    <button
                                        onClick={handleSearch}
                                        className="flex min-w-[170px] items-center justify-center gap-3 bg-[#3E424B] px-7 text-[17px] font-bold text-white transition hover:bg-[#2A3439]"
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

                        <section className="flex flex-col justify-center py-12 pl-12">

                            {/* Heading */}
                            <div className="mb-6 flex items-end justify-between">

                                <div>
                                    <p className="mb-1 text-[13px] font-bold uppercase tracking-[0.16em] text-[#7A7F7A]">
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

                                <button onClick={openSavedPlaces} className="text-[15px] font-bold text-[#7A7F7A] underline underline-offset-4 transition hover:text-[#2A3439]">
                                    View all
                                </button>

                            </div>

                            {/* Saved Places */}
                            {isAuthenticated && savedPlaces.length > 0 ? (
                                <div className="grid grid-cols-2 gap-4">
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
                                <div className="rounded-[18px] border border-[#7A7F7A]/20 bg-white p-6 text-[#7A7F7A]">
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
                                        className="text-[19px] text-[#2A3439]"
                                        style={{
                                            fontFamily: '"DM Serif Display", serif',
                                        }}

                                    >
                                        Add a saved place
                                    </h3>

                                    <p className="mt-1 text-[13px] text-[#7A7F7A]">
                                        Keep somewhere you visit often.
                                    </p>

                                </div>

                                <ArrowRight
                                    size={20}
                                    className="text-[#7A7F7A] transition group-hover:translate-x-1"
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
