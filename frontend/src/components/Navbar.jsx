import Logo from './Logo'

function Navbar({ activePage, onHome, onRoutes, onSavedPlaces, onSignIn, onProfile, isAuthenticated = false }) {

  return (
    <nav className="pt-6">

      <div className="mx-auto flex max-w-7xl items-center justify-between px-8">
        <Logo />

        <div className="flex items-center gap-1 rounded-full border border-[#7A7F7A]/30 bg-[#FAF7F0] p-1.5">

          <button
            onClick={onHome}
            className={`rounded-full px-6 py-2.5 font-medium transition ${
              activePage === 'home'
                ? 'bg-[#3E424B] text-white'
                : 'text-[#7A7F7A] hover:bg-[#DCE7D2] hover:text-black'
            }`}
          >
            Home
          </button>


          <button
            onClick={onRoutes}
            className={`rounded-full px-6 py-2.5 font-medium transition ${
              activePage === 'routes'
                ? 'bg-[#3E424B] text-white'
                : 'text-[#7A7F7A] hover:bg-[#DCE7D2] hover:text-black'
            }`}
          >
            Routes
          </button>


          <button
            onClick={isAuthenticated ? onSavedPlaces : onSignIn}
            className={`rounded-full px-6 py-2.5 font-medium transition ${
              activePage === 'saved'
                ? 'bg-[#3E424B] text-white'
                : 'text-[#7A7F7A] hover:bg-[#DCE7D2] hover:text-black'
            }`}
          >
            Saved Places
          </button>


          <button 
            onClick={isAuthenticated ? onProfile : onSignIn} className="rounded-full px-6 py-2.5 font-medium text-[#7A7F7A] transition hover:bg-[#FFD3B4] hover:text-black">
            {isAuthenticated ? 'Profile' : 'Sign in'}
          </button>

        </div>

      </div>

    </nav>
  )
}

export default Navbar
