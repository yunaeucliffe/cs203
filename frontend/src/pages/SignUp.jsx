function SignUp({ onBackToLogin }) {
  const handleSubmit = (event) => {
    event.preventDefault()
    onBackToLogin()
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>SilverRoute</h1>

        <p className="login-subtitle">
          Create your account to get started.
        </p>

        <form onSubmit={handleSubmit}>
          <label>Name</label>
          <input
            type="text"
            placeholder="Enter your name"
            required
          />

          <label>Email</label>
          <input
            type="email"
            placeholder="Enter your email"
            required
          />

          <label>Password</label>
          <input
            type="password"
            placeholder="Create a password"
            required
          />

          <label>Confirm Password</label>
          <input
            type="password"
            placeholder="Confirm your password"
            required
          />

          <button type="submit" className="login-button">
            Sign Up
          </button>
        </form>

        <p className="signup-text">
          Already have an account?{' '}
          <button type="button" onClick={onBackToLogin}>
            Log In
          </button>
        </p>
      </div>
    </div>
  )
}

export default SignUp