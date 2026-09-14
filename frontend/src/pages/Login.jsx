function Login({ onLogin, onSignUp}) {
  const handleSubmit = (event) => {
    event.preventDefault()
    onLogin()
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>SilverRoute</h1>

        <p className="login-subtitle">
          Travel comfortably, every journey.
        </p>

        <form onSubmit={handleSubmit}>
          <label>Email</label>
          <input
            type="email"
            placeholder="Enter your email"
            required
          />

          <label>Password</label>
          <input
            type="password"
            placeholder="Enter your password"
            required
          />

          <button type="submit" className="login-button">
            Log In
          </button>
        </form>

        <p className="signup-text">
        Don't have an account?{' '}
        <button type="button" onClick={onSignUp}>
            Sign Up
        </button>
        </p>
      </div>
    </div>
  )
}

export default Login