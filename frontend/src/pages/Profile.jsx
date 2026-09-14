function Profile({ onBack }) {
  const user = {
    name: 'Mary Tan',
    email: 'mary@example.com',
    walkingSpeed: 'Slow',
    maxWalkingDistance: 500,
    avoidStairs: true,
    preferShelter: true,
  }

  return (
    <div className="profile-page">
      <div className="profile-card">

        <button
          type="button"
          className="profile-back-button"
          onClick={onBack}
        >
          ← Back
        </button>

        <div className="profile-header">
          <div className="profile-icon">👤</div>
          <h1>My Profile</h1>
        </div>

        <div className="profile-info">
          <div className="profile-field">
            <span className="field-label">Name</span>
            <span className="field-value">{user.name}</span>
          </div>

          <div className="profile-field">
            <span className="field-label">Email</span>
            <span className="field-value">{user.email}</span>
          </div>

          <div className="profile-field">
            <span className="field-label">Walking Speed</span>
            <span className="field-value">{user.walkingSpeed}</span>
          </div>

          <div className="profile-field">
            <span className="field-label">
              Maximum Walking Distance
            </span>
            <span className="field-value">
              {user.maxWalkingDistance} m
            </span>
          </div>
        </div>

        <div className="profile-preferences">
          <h2>Travel Preferences</h2>

          <div className="preference">
            <span>Avoid stairs</span>
            <span>{user.avoidStairs ? '✓' : '✕'}</span>
          </div>

          <div className="preference">
            <span>Prefer sheltered routes</span>
            <span>{user.preferShelter ? '✓' : '✕'}</span>
          </div>
        </div>

        <button type="button" className="edit-profile-button">
          Edit Preferences
        </button>

      </div>
    </div>
  )
}

export default Profile