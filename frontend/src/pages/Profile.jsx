import { useEffect, useState } from 'react'
import './Profile.css'

function Profile({ onBack, onLogout }) {
  const [user, setUser] = useState(null)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formValues, setFormValues] = useState({
    walkingSpeed: 'Normal',
    maxWalkingDistance: 500,
    avoidStairs: false,
  })

  useEffect(() => {
    const controller = new AbortController()

    fetch('http://localhost:8081/api/users/me/profile', {
      credentials: 'include',
      signal: controller.signal,
    })
      .then(async (response) => {
        if (response.status === 401) {
          throw new Error('Your session has expired. Please sign in again.')
        }
        if (!response.ok) {
          throw new Error('Unable to load profile.')
        }
        return response.json()
      })
      .then(setUser)
      .catch((requestError) => {
        if (requestError.name !== 'AbortError') {
          setError(requestError.message)
        }
      })

    return () => controller.abort()
  }, [])

  const startEditing = () => {
    setFormValues({
      walkingSpeed: user.walkingSpeed,
      maxWalkingDistance: user.maxWalkingDistance,
      avoidStairs: user.avoidStairs,
    })
    setActionError('')
    setIsEditing(true)
  }

  const handleSavePreferences = async (event) => {
    event.preventDefault()
    setActionError('')
    setIsSaving(true)

    try {
      const csrfResponse = await fetch('http://localhost:8081/api/auth/csrf', {
        credentials: 'include',
      })
      const csrf = await csrfResponse.json()
      const response = await fetch(
        'http://localhost:8081/api/users/me/preferences',
        {
          method: 'PUT',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-XSRF-TOKEN': csrf.token,
          },
          body: JSON.stringify({
            ...formValues,
            maxWalkingDistance: Number(formValues.maxWalkingDistance),
          }),
        },
      )
      const data = await response.json().catch(() => null)

      if (response.status === 401) {
        throw new Error('Your session has expired. Please sign in again.')
      }
      if (!response.ok) {
        throw new Error(data?.message || 'Unable to save preferences.')
      }

      setUser(data)
      setIsEditing(false)
    } catch (requestError) {
      setActionError(requestError.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleLogout = async () => {
    setActionError('')
    try {
      const csrfResponse = await fetch('http://localhost:8081/api/auth/csrf', {
        credentials: 'include',
      })
      const csrf = await csrfResponse.json()
      const response = await fetch('http://localhost:8081/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: { 'X-XSRF-TOKEN': csrf.token },
      })

      if (!response.ok) {
        throw new Error('Unable to sign out.')
      }

      localStorage.removeItem('userId')
      onLogout()
    } catch (requestError) {
      setActionError(requestError.message)
    }
  }

  if (error) {
    return (
      <div className="profile-page">
        <div className="profile-card">
          <button type="button" className="profile-back-button" onClick={onBack}>
            ← Back
          </button>
          <p role="alert">{error}</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="profile-page">
        <div className="profile-card">
          <p>Loading profile...</p>
        </div>
      </div>
    )
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

        </div>

        {isEditing ? (
          <form className="preferences-form" onSubmit={handleSavePreferences}>
            <label>
              Walking speed
              <select
                value={formValues.walkingSpeed}
                onChange={(event) => setFormValues({
                  ...formValues,
                  walkingSpeed: event.target.value,
                })}
              >
                <option value="Slow">Slow</option>
                <option value="Normal">Normal</option>
                <option value="Fast">Fast</option>
              </select>
            </label>

            <label>
              Maximum walking distance (metres)
              <input
                type="number"
                min="50"
                max="10000"
                required
                value={formValues.maxWalkingDistance}
                onChange={(event) => setFormValues({
                  ...formValues,
                  maxWalkingDistance: event.target.value,
                })}
              />
            </label>

            <label className="preference-checkbox">
              <input
                type="checkbox"
                checked={formValues.avoidStairs}
                onChange={(event) => setFormValues({
                  ...formValues,
                  avoidStairs: event.target.checked,
                })}
              />
              Avoid stairs
            </label>

            <div className="preference-form-actions">
              <button
                type="button"
                className="cancel-preferences-button"
                onClick={() => setIsEditing(false)}
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="save-preferences-button"
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save Preferences'}
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            className="edit-profile-button"
            onClick={startEditing}
          >
            Edit Preferences
          </button>
        )}

        {actionError && <p className="profile-action-error" role="alert">{actionError}</p>}

        <button
          type="button"
          className="logout-profile-button"
          onClick={handleLogout}
        >
          Sign out
        </button>

      </div>
    </div>
  )
}

export default Profile
