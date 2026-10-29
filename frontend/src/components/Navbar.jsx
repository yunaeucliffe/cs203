import Logo from './Logo'
import { SharingIndicator } from './TripSharing'

function Navbar({ activePage, onHome, onRoutes, onSavedPlaces, onSignIn, onProfile, isAuthenticated = false }) {

  return (
    <nav className="pt-6">

      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 sm:px-8">
        <button
          type="button"
          onClick={onHome}
          aria-label="SilverRoute home"
          className="cursor-pointer rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#3E424B]"
        >
          <Logo />
        </button>

        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <SharingIndicator />

          <div className="flex flex-wrap items-center gap-2 rounded-4xl border border-[#7A7F7A]/30 bg-[#FAF7F0] p-2">

            <button
              onClick={onHome}
              className={`rounded-full px-4 py-2.5 sm:px-7 font-medium transition ${activePage === 'home'
                  ? 'bg-[#3E424B] text-white'
                  : 'text-[#7A7F7A] hover:bg-[#DCE7D2] hover:text-black'
                }`}
            >
              Home
            </button>


            <button
              onClick={onRoutes}
              className={`rounded-full px-4 py-2.5 sm:px-7 font-medium transition ${activePage === 'routes'
                  ? 'bg-[#3E424B] text-white'
                  : 'text-[#7A7F7A] hover:bg-[#DCE7D2] hover:text-black'
                }`}
            >
              Routes
            </button>


            <button
              onClick={isAuthenticated ? onSavedPlaces : onSignIn}
              className={`rounded-full px-4 py-2.5 sm:px-7 font-medium transition ${activePage === 'saved'
                  ? 'bg-[#3E424B] text-white'
                  : 'text-[#7A7F7A] hover:bg-[#DCE7D2] hover:text-black'
                }`}
            >
              Saved Places
            </button>


            <button
              onClick={isAuthenticated ? onProfile : onSignIn} className="rounded-full px-4 py-2.5 sm:px-7 font-medium text-[#7A7F7A] transition hover:bg-[#FFD3B4] hover:text-black">
              {isAuthenticated ? 'Profile' : 'Sign in'}
            </button>

          </div>
        </div>

      </div>

    </nav>
  )
}

export default Navbar
