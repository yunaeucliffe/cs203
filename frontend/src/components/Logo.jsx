import { Navigation } from 'lucide-react'

function Logo() {
    return(

        <div className="flex items-center gap-2 sm:gap-3">

          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#3E424B] text-white sm:h-10 sm:w-10">
            <Navigation size={18} className="sm:hidden" />
            <Navigation size={20} className="hidden sm:block" />
          </div>

          <span className="text-xl font-bold tracking-tight text-[#2A3439] sm:text-2xl">
            SilverRoute
          </span>

        </div> 
    )
}

export default Logo
