import {useEffect, useState} from 'react'
import InfoRow from '../components/InfoRow'
import {PreferenceCard, PreferenceSelector} from '../components/PreferenceComponents'
import {API_URL, getCsrfToken} from '../api'
import {
  ArrowLeft,
  User,
  Mail,
  AtSign,
  Gauge,
  Footprints,
  Umbrella,
  LogOut,
} from 'lucide-react'

function Profile({ onBack, onLogout }) {
  const [user, setUser] = useState(null)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const [formValues, setFormValues] = useState({
    walkingSpeed: 'Normal',
    walkingTolerance: 'Moderate',
    preferSheltered: false,
  })

  useEffect(() => {
    const controller = new AbortController()

    fetch(`${API_URL}/api/users/me/profile`, {
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
      walkingTolerance: user.walkingTolerance,
      preferSheltered: user.preferSheltered,
    })

    setActionError('')
    setIsEditing(true)
  }

  const handleSavePreferences = async (event) => {
    event.preventDefault()
    setActionError('')
    setIsSaving(true)

    try {
      const csrfToken = await getCsrfToken()

      const response = await fetch(
        `${API_URL}/api/users/me/preferences`,
        {
          method: 'PUT',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-XSRF-TOKEN': csrfToken,
          },
          body: JSON.stringify(formValues),
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
      const csrfToken = await getCsrfToken()

      const response = await fetch(
        `${API_URL}/api/auth/logout`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'X-XSRF-TOKEN': csrfToken,
          },
        },
      )

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
      <div className="min-h-screen bg-[#FAF7F0] px-8 py-10 text-[#2A3439]">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2"
        >
          <ArrowLeft size={20} />
          Back
        </button>

        <p role="alert" className="mt-8 text-red-700">
          {error}
        </p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAF7F0] text-[#2A3439]">
        Loading profile...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAF7F0] text-[#2A3439]">
      <main className="mx-auto max-w-4xl px-8 py-10">

        {/* TOP BAR */}
        <div className="relative mb-12 flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="flex h-11 w-11 items-center justify-center rounded-full transition hover:bg-[#DCE7D2]"
            aria-label="Go back"
          >
            <ArrowLeft size={22} />
          </button>

          <h1 className="absolute left-1/2 -translate-x-1/2 text-xl font-semibold">
            Profile
          </h1>

          <div className="h-11 w-11" />
        </div>

        {/* PROFILE HEADER */}
        <section className="mb-10 text-center">
          <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-[#DCE7D2]">
            <User size={48} strokeWidth={1.7} />
          </div>

          <h2 className="mt-5 font-serif text-3xl">
            {user.name}
          </h2>
        </section>

        {/* PERSONAL INFORMATION */}
        <section className="mb-12 rounded-[24px] border border-[#7A7F7A]/15 bg-white/60 px-7 py-2">
          {user.username && (
            <InfoRow
              icon={<AtSign size={21} />}
              label="Username"
              value={user.username}
            />
          )}

          <InfoRow
            icon={<Mail size={21} />}
            label="Email"
            value={user.email}
            last
          />
        </section>

        {/* route pref */}
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">
              Your Preferences
            </h2>
          </div>

          {!isEditing && (
            <button
              type="button"
              onClick={startEditing}
              className="flex items-center gap-1 font-medium text-[#3E424B]"
            >
              Edit
            </button>
          )}
        </div>

        {!isEditing && (
          <div className="grid gap-4 sm:grid-cols-3">

            <PreferenceCard
              icon={<Gauge size={25} />}
              label="Walking speed"
              value={user.walkingSpeed}
            />

            <PreferenceCard
              icon={<Footprints size={25} />}
              label="Walking tolerance"
              value={user.walkingTolerance}
            />

            <PreferenceCard
              icon={<Umbrella size={25} />}
              label="Sheltered paths"
              value={user.preferSheltered ? 'Yes' : 'No'}
            />

          </div>
        )}

        {/* EDITING PREFERENCES */}
        {isEditing && (
          <form
            onSubmit={handleSavePreferences}
            className="rounded-[24px] border border-[#7A7F7A]/15 bg-white/60 p-7"
          >

            <PreferenceSelector
              title="Walking speed"
              description="How quickly do you usually walk?"
              options={['Slow', 'Normal', 'Fast']}
              value={formValues.walkingSpeed}
              onChange={(value) =>
                setFormValues({
                  ...formValues,
                  walkingSpeed: value,
                })
              }
            />

            <div className="my-7 border-t border-[#7A7F7A]/15" />

            <PreferenceSelector
              title="Walking tolerance"
              description="How much walking are you comfortable with?"
              options={['Short', 'Moderate', 'Long']}
              value={formValues.walkingTolerance}
              onChange={(value) =>
                setFormValues({
                  ...formValues,
                  walkingTolerance: value,
                })
              }
            />

            <div className="my-7 border-t border-[#7A7F7A]/15" />

            <PreferenceSelector
              title="Sheltered paths"
              description="Would you prefer sheltered paths where possible?"
              options={['Yes', 'No']}
              value={formValues.preferSheltered ? 'Yes' : 'No'}
              onChange={(value) =>
                setFormValues({
                  ...formValues,
                  preferSheltered: value === 'Yes',
                })
              }
            />

            <div className="mt-8 flex justify-end gap-3">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => setIsEditing(false)}
                className="rounded-full border border-[#7A7F7A]/30 px-6 py-3 font-medium transition hover:bg-[#FAF7F0]"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="rounded-full bg-[#3E424B] px-7 py-3 font-medium text-white transition hover:opacity-90 disabled:opacity-60"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>

          </form>
        )}

        {actionError && (
          <p
            role="alert"
            className="mt-4 text-sm text-red-700"
          >
            {actionError}
          </p>
        )}

        {/* SIGN OUT */}
        <div className="mt-12 border-t border-[#7A7F7A]/20 pt-7">
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-3 text-[#7A7F7A] transition hover:text-[#2A3439]"
          >
            <LogOut size={20} />
            <span className="font-medium">Sign out</span>
          </button>
        </div>

      </main>
    </div>
  )
}

export default Profile