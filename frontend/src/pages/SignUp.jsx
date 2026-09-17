import AuthLayout from '../components/AuthLayout'
import Input from '../components/Input'

function SignUp({ onBackToLogin }) {
  const handleSubmit = (event) => {
    event.preventDefault()
    onBackToLogin()
  }

  return (
    <AuthLayout title="Create an account" description="Create your account to get started.">
        <form onSubmit={handleSubmit} className="mt-10 flex flex-col gap-4">
          <label htmlFor="signup-name">Name</label>
          <input
            id="signup-name"
            name="name"
            autoComplete="name"
            type="text"
            placeholder="Enter your name"
            required
            className="h-[68px] w-full rounded-full border border-[#7A7F7A]/40 px-6 text-lg"
          />

          <label htmlFor="signup-email">Email</label>
          <input
            id="signup-email"
            name="email"
            autoComplete="email"
            type="email"
            placeholder="Enter your email"
            required
            className="h-[68px] w-full rounded-full border border-[#7A7F7A]/40 px-6 text-lg"
          />

          <Input name="password" placeholder="Create a password" autoComplete="new-password" required />
          <Input name="confirmPassword" label="Confirm password" autoComplete="new-password" required />

          <button type="submit" className="h-[68px] rounded-full bg-[#3E424B] text-lg font-semibold text-white">
            Sign Up
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