import { useState } from 'react'
import { Mail, ArrowRight } from 'lucide-react'
import AuthLayout from '../components/AuthLayout'
import Input from '../components/Input'

function SignIn({ onSignIn, onSignUp }) {
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    const formData = new FormData(event.currentTarget)

    try {
      const csrfResponse = await fetch('http://localhost:8081/api/auth/csrf', {
        credentials: 'include',
      })
      const csrf = await csrfResponse.json()

      const response = await fetch('http://localhost:8081/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-XSRF-TOKEN': csrf.token,
        },
        body: JSON.stringify({
          email: formData.get('email'),
          password: formData.get('password'),
        }),
      })
      const data = await response.json()

      if (!response.ok || !data.success) {
        setError(data.message || 'Invalid email or password')
        return
      }

      localStorage.removeItem('userId')
      onSignIn(data)
    } catch {
      setError('Unable to sign in. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Welcome back!"
      description="Sign in to access your saved places, preferences and previous routes."
    >
            <form
              onSubmit={handleSubmit}
              className="mt-10"
            >


              {/* Email */}

              <div className="flex h-[68px] items-center gap-4 rounded-full border border-[#7A7F7A]/40 px-6">

                <Mail
                  size={20}
                  className="shrink-0 text-[#7A7F7A]"
                />

                <input
                  aria-label="Email"
                  name="email"
                  autoComplete="email"
                  type="email"
                  placeholder="Email"
                  required
                  className="h-full w-full bg-transparent text-lg outline-none placeholder:text-[#7A7F7A]"
                />

              </div>



              {/* Password */}

              <div className="mt-4">
                <Input
                  name="password"
                  autoComplete="current-password"
                  required
                />
              </div>

              {/* Forgot password */}

              <div className="mt-4 text-right">

                <button
                  type="button"
                  className="font-medium text-[#7A7F7A] underline underline-offset-4 transition hover:text-[#2A3439]"
                >
                  Forgot password?
                </button>

              </div>



              {/* Sign in */}

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-8 flex h-[68px] w-full items-center justify-center gap-4 rounded-full bg-[#3E424B] text-lg font-semibold text-white transition hover:scale-[1.01]"
              >
                {isSubmitting ? 'Signing in...' : 'Sign in'}

                <ArrowRight size={20} />

              </button>

              {error && (
                <p role="alert" className="mt-4 text-center text-red-700">
                  {error}
                </p>
              )}

            </form>



            {/* Sign up */}

            <div className="mt-10 flex items-center justify-center gap-1.5 text-base text-[#7A7F7A]">

              <span>
                Don't have an account?
              </span>

              <button
                type="button"
                onClick={onSignUp}
                className="font-semibold text-[#2A3439] underline underline-offset-4 transition hover:text-[#A88FA1]"
              >
                Create an account
              </button>

            </div>

    </AuthLayout>
  )
}

export default SignIn
