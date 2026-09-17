import { Navigation } from 'lucide-react'

function Logo() {
    return(

        <div className="flex items-center gap-3">

          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#3E424B] text-white">
            <Navigation size={20} />
          </div>

          <span className="text-2xl font-bold tracking-tight text-[#2A3439]">
            SilverRoute
          </span>

        </div> 
    )
}

export default Logo
