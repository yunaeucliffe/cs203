import { useState } from 'react'
import { Lock, Eye, EyeOff } from 'lucide-react'

// Password field with a visible label, an optional hint (e.g. the minimum length)
// and a show/hide button that screen readers can announce.
function Input({ id, label, hint, placeholder = 'Password', ...inputProps }) {

  const [showPassword, setShowPassword] = useState(false)
  const hintId = hint ? `${id}-hint` : undefined

  return (
    <div className="flex flex-col gap-2">

      <label htmlFor={id} className="font-medium text-[#2A3439]">
        {label}
      </label>

      <div className="flex h-[68px] items-center gap-4 rounded-full border border-[#7A7F7A]/40 px-6">

        <Lock size={20} className="shrink-0 text-[#555C60]" aria-hidden="true" />

        <input
          {...inputProps}
          id={id}
          aria-describedby={hintId}
          type={showPassword ? 'text' : 'password'}
          placeholder={placeholder}
          className="h-full w-full min-w-0 bg-transparent text-lg outline-none placeholder:text-[#555C60]"
        />

        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          aria-pressed={showPassword}
          className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#555C60] hover:bg-[#FAF7F0]"
        >
          {showPassword
            ? <EyeOff size={21} aria-hidden="true" />
            : <Eye size={21} aria-hidden="true" />
          }
        </button>

      </div>

      {hint && (
        <p id={hintId} className="text-sm text-[#555C60]">
          {hint}
        </p>
      )}

    </div>
  )
}

export default Input
