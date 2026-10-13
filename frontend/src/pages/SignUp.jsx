import { useState } from 'react'
import AuthLayout from '../components/AuthLayout'
import Input from '../components/Input'
import { API_URL, getCsrfToken } from '../api'

function SignUp({ onBackToLogin, onSignUp }) {
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    const formData = new FormData(event.currentTarget)

    if (formData.get('password') !== formData.get('confirmPassword')) {
      setError('Passwords do not match.')
      return
    }

    setIsSubmitting(true)
    try {
      const token = await getCsrfToken()
      const response = await fetch(`${API_URL}/api/auth/signup`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-XSRF-TOKEN': token,
        },
        body: JSON.stringify({
          name: formData.get('name'),
          username: formData.get('username'),
          email: formData.get('email'),
          password: formData.get('password'),
        }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok || !data?.success) {
        throw new Error(data?.message || 'Unable to create your account.')
      }
      onSignUp(data)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout title="Create an account" description="Create your account to get started.">
      <form onSubmit={handleSubmit} className="mt-10 flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <label
            htmlFor="signup-name"
            className="font-medium text-[#2A3439]"
          >
            Name
          </label>

          <input
            id="signup-name"
            name="name"
            autoComplete="name"
            type="text"
            placeholder="Enter your name"
            required
            className="h-[68px] w-full rounded-full border border-[#7A7F7A]/40 bg-transparent px-6 text-lg outline-none placeholder:text-[#7A7F7A]"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="signup-username"
            className="font-medium text-[#2A3439]"
          >
            Username
          </label>

          <input
            id="signup-username"
            name="username"
            autoComplete="username"
            type="text"
            minLength="3"
            maxLength="50"
            pattern="[A-Za-z0-9._-]+"
            title="Use letters, numbers, dots, underscores, or hyphens"
            placeholder="Choose a username"
            required
            className="h-[68px] w-full rounded-full border border-[#7A7F7A]/40 bg-transparent px-6 text-lg outline-none placeholder:text-[#7A7F7A]"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="signup-email"
            className="font-medium text-[#2A3439]"
          >
            Email
          </label>

          <input
            id="signup-email"
            name="email"
            autoComplete="email"
            type="email"
            placeholder="Enter your email"
            required
            className="h-[68px] w-full rounded-full border border-[#7A7F7A]/40 bg-transparent px-6 text-lg outline-none placeholder:text-[#7A7F7A]"
          />
        </div>
        <Input name="password" placeholder="Create a password" autoComplete="new-password" minLength="8" maxLength="72" required />
        <Input 
          name="confirmPassword" 
          placeholder="Re-enter password" 
          autoComplete="new-password" 
          required />

        {error && <p role="alert" className="text-center text-red-700">{error}</p>}

        <button type="submit" disabled={isSubmitting} className="h-[68px] rounded-full bg-[#3E424B] text-lg font-semibold text-white disabled:opacity-60">
          {isSubmitting ? 'Creating account...' : 'Sign Up'}
        </button>
      </form>

      <p className="mt-10 text-center text-[#7A7F7A]">
        Already have an account?{' '}
        <button type="button" onClick={onBackToLogin}>
          Log In
        </button>
      </p>
    </AuthLayout>
  )
}

export default SignUp
