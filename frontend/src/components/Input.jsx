import { useState } from 'react'
import { Lock, Eye, EyeOff } from 'lucide-react'

function Input({ placeholder = 'Password' }) {

  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="flex h-[68px] items-center gap-4 rounded-full border border-[#7A7F7A]/40 px-6">

      <Lock size={20} className="text-[#7A7F7A]" />

      <input
        type={showPassword ? 'text' : 'password'}
        placeholder={placeholder}
        className="h-full w-full bg-transparent text-lg outline-none placeholder:text-[#7A7F7A]"
      />


      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        className="text-[#7A7F7A]"
      >
        {showPassword
          ? <EyeOff size={21} />
          : <Eye size={21} />
        }
      </button>

    </div>
  )
}

export default Input
