import Logo from './Logo'
import { SharingIndicator } from './TripSharing'

// On phones the four tabs share one full-width row; from the sm breakpoint they sit beside the logo.
const tab = 'rounded-2xl px-2 py-2.5 text-center font-medium leading-tight transition sm:rounded-full sm:px-7'

function Navbar({ activePage, onHome, onRoutes, onSavedPlaces, onSignIn, onProfile, isAuthenticated = false }) {

  const tabColour = (page) => activePage === page
    ? 'bg-[#3E424B] text-white'
    : 'text-[#555C60] hover:bg-[#DCE7D2] hover:text-black'

  return (
    <nav className="pt-4 sm:pt-6">

      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 sm:gap-4 sm:px-8">
        <button
          type="button"
          onClick={onHome}
          aria-label="SilverRoute home"
          className="cursor-pointer rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#3E424B]"
        >
          <Logo />
        </button>

        <div className="flex w-full min-w-0 flex-wrap items-center gap-3 sm:w-auto">
          <SharingIndicator />

          <div className="grid w-full grid-cols-4 items-center gap-1 rounded-3xl border border-[#7A7F7A]/30 bg-[#FAF7F0] p-1.5 sm:flex sm:w-auto sm:flex-wrap sm:gap-2 sm:rounded-4xl sm:p-2">

            <button
              onClick={onHome}
              className={`${tab} ${tabColour('home')}`}
            >
              Home
            </button>


            <button
              onClick={onRoutes}
              className={`${tab} ${tabColour('routes')}`}
            >
              Routes
            </button>


            <button
              onClick={isAuthenticated ? onSavedPlaces : onSignIn}
              className={`${tab} ${tabColour('saved')}`}
            >
              Saved Places
            </button>


            <button
              onClick={isAuthenticated ? onProfile : onSignIn}
              className={`${tab} ${activePage === "profile"
                ? "bg-[#3E424B] text-white"
                : "text-[#555C60] hover:bg-[#FFD3B4] hover:text-black"}`}
            >
              {isAuthenticated ? 'Profile' : 'Sign in'}
            </button>

          </div>
        </div>

      </div>

    </nav>
  )
}

export default Navbar
