import { useEffect, useRef, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Edit3,
  MapPin,
  Plus,
  Trash2,
} from 'lucide-react'
import Navbar from '../components/Navbar'
import { API_URL, getCsrfToken } from '../api'
import { lookupPostalCode } from '../api/locations'

const emptyForm = {
  label: '',
  address: '',
  latitude: '',
  longitude: '',
}

function SavedPlaces({ onHome, onRoutes, onProfile, onSignIn, onUsePlace, onPlacesChange, isAuthenticated, startAdding }) {

  const [places, setPlaces] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [editingPlace, setEditingPlace] = useState(startAdding ? { id: null } : null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [postalCode, setPostalCode] = useState('')
  const [lookup, setLookup] = useState({ status: 'idle', matches: [] })
  const [retry, setRetry] = useState(0)
  const postalRequest = useRef(null)
  const formOpen = editingPlace !== null

  useEffect(() => {
    if (!formOpen || !/^[0-9]{6}$/.test(postalCode)) return
    const controller = new AbortController()
    postalRequest.current = controller
    const timer = setTimeout(async () => {
      try {
        const matches = await lookupPostalCode(postalCode, controller.signal)
        if (controller.signal.aborted) return
        if (matches.length === 1) {
          const place = matches[0]
          setForm(current => ({ ...current, address: place.address, latitude: place.latitude, longitude: place.longitude }))
        }
        setLookup({ status: matches.length === 1 ? 'resolved' : matches.length ? 'choose' : 'empty', matches })
      } catch (failure) {
        if (!controller.signal.aborted) setLookup({ status: 'error', matches: [], message: failure.message })
      }
    }, 300)
    return () => { clearTimeout(timer); controller.abort() }
  }, [postalCode, formOpen, retry])

  const changePostalCode = (value) => {
    const code = value.replace(/\D/g, '').slice(0, 6)
    if (code === postalCode) return
    postalRequest.current?.abort()
    setPostalCode(code)
    setLookup({ status: code.length === 6 ? 'loading' : 'idle', matches: [] })
    setForm(current => ({ ...current, address: '', latitude: '', longitude: '' }))
  }

  const chooseAddress = (place) => {
    setForm(current => ({ ...current, address: place.address, latitude: place.latitude, longitude: place.longitude }))
    setLookup({ status: 'resolved', matches: [] })
  }

  const changeAddress = (address) => {
    // Manual edits cancel autofill and must not retain coordinates for an old address.
    postalRequest.current?.abort()
    setPostalCode('')
    setLookup({ status: 'idle', matches: [] })
    setForm(current => ({ ...current, address, latitude: '', longitude: '' }))
  }


  // Show saved places when this page first loads
  useEffect(() => {
    const controller = new AbortController() // AbortController: cancel fetch() request if u dont need anym

    fetch(`${API_URL}/api/users/me/saved-places`, {
      credentials: 'include',
      signal: controller.signal,
    })
      .then(async (response) => {
        if (response.status === 401) {
          throw new Error('Please sign in to view your saved places.')
        }

        if (!response.ok) {
          throw new Error('Unable to load saved places.')
        }

        return response.json() // convert json to javascript data
      })
      .then((data) => {
        setPlaces(data) // shows the data on frontend
      })
      .catch((requestError) => {
        if (requestError.name !== 'AbortError') {
          setError(requestError.message)
        }
      })
      .finally(() => {
        setLoading(false)
      })

    return () => controller.abort()
  }, [])

  // OPEN ADD / EDIT FORM
  const openForm = (place = null) => {
    postalRequest.current?.abort()
    setPostalCode('')
    setLookup({ status: 'idle', matches: [] })

    if (place) {
      // Editing an existing place
      setEditingPlace(place)

      setForm({
        label: place.label,
        address: place.address,
        latitude: place.latitude ?? '',
        longitude: place.longitude ?? '',
      })
    } else {
      // Adding a new place
      setEditingPlace({ id: null })
      setForm(emptyForm)
    }
    setError('')
  }

  // SAVE PLACE
  const savePlace = async (event) => {
    event.preventDefault()
    if (saving || lookup.status === 'loading' || lookup.status === 'choose') return
    setSaving(true)
    setError('')

    try {
      const token = await getCsrfToken()

      const isEdit = editingPlace.id !== null

      const response = await fetch(
        `${API_URL}/api/users/me/saved-places${isEdit ? `/${editingPlace.id}` : ''}`,
        {
          method: isEdit ? 'PUT' : 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-XSRF-TOKEN': token,
          },
          body: JSON.stringify({
            label: form.label,
            address: form.address,

            latitude:
              form.latitude === ''
                ? null
                : Number(form.latitude),

            longitude:
              form.longitude === ''
                ? null
                : Number(form.longitude),
          }),
        }
      )
      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(
          data?.message || 'Unable to save this place.'
        )
      }

      // Update Saved Places page
      setPlaces((currentPlaces) => {
        if (isEdit) {
          return currentPlaces.map((place) =>
            place.id === data.id
              ? data
              : place
          )
        }
        return [...currentPlaces, data]
      })

      // Update places stored by parent
      if (onPlacesChange) {
        onPlacesChange((currentPlaces) => {
          if (isEdit) {
            return currentPlaces.map((place) =>
              place.id === data.id
                ? data
                : place
            )
          }
          return [...currentPlaces, data]
        })
      }

      // Close form
      setEditingPlace(null)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  // DELETE PLACE
  const deletePlace = async (place) => {
    const confirmed = window.confirm(
      `Remove ${place.label} from your saved places?`
    )
    if (!confirmed) {
      return
    }
    setError('')

    try {
      const token = await getCsrfToken()

      const response = await fetch(
        `${API_URL}/api/users/me/saved-places/${place.id}`,
        {
          method: 'DELETE',
          credentials: 'include',
          headers: {
            'X-XSRF-TOKEN': token,
          },
        }
      )
      if (!response.ok) {
        throw new Error('Unable to remove this place.')
      }

      // Remove from this page
      setPlaces((currentPlaces) =>
        currentPlaces.filter(
          (item) => item.id !== place.id
        )
      )

      // Update parent places
      if (onPlacesChange) {
        onPlacesChange((currentPlaces) =>
          currentPlaces.filter(
            (item) => item.id !== place.id
          )
        )

      }
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  return (

    <div className="min-h-screen bg-[#FAF7F0] text-[#2A3439]">

      <Navbar
        activePage="saved"
        onHome={onHome}
        onRoutes={onRoutes}
        onSavedPlaces={() => { }}
        onProfile={onProfile}
        onSignIn={onSignIn}
        isAuthenticated={isAuthenticated}
      />

      <main className="mx-auto max-w-7xl px-8 py-12">

        {/* ADD / EDIT PLACE */}
        {editingPlace ? (
          <section className="mx-auto max-w-2xl">

            {/* BACK */}
            <button
              type="button"
              onClick={() => setEditingPlace(null)}
              className="flex items-center gap-2 font-semibold text-[#7A7F7A] transition hover:text-[#2A3439]"
            >
              <ArrowLeft size={19} />
              Back to saved places
            </button>

            {/* HEADING */}
            <div className="mt-8">

              <p className="text-[13px] font-bold uppercase tracking-[0.16em] text-[#7A7F7A]">
                {editingPlace.id
                  ? 'Edit place'
                  : 'New place'}
              </p>

              <h1
                className="mt-2 text-5xl text-[#2A3439]"
                style={{
                  fontFamily: '"DM Serif Display", serif',
                }}
              >
                {editingPlace.id
                  ? 'Edit saved place'
                  : 'Add a saved place'}
              </h1>

              <p className="mt-3 text-[#7A7F7A]">
                Save somewhere you visit often for quicker route planning.
              </p>

            </div>

            {/* FORM */}
            <form
              onSubmit={savePlace}
              className="mt-10"
            >
              <fieldset disabled={saving} className="min-w-0">

              {/* LABEL */}
              <div>
                <label
                  htmlFor="place-label"
                  className="mb-2 block font-semibold"
                >
                  Name
                </label>

                <input
                  id="place-label"
                  type="text"
                  required
                  maxLength="100"
                  value={form.label}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      label: event.target.value,
                    })
                  }
                  placeholder="Home, Work, School..."
                  className="h-[60px] w-full rounded-xl border border-[#7A7F7A]/40 bg-white px-5 outline-none transition focus:border-[#3E424B]"
                />

              </div>

              <div className="mt-5">
                <label htmlFor="place-postal-code" className="mb-2 block font-semibold">
                  Postal code <span className="ml-2 text-sm font-normal text-[#7A7F7A]">Optional</span>
                </label>
                <input id="place-postal-code" type="text" inputMode="numeric" autoComplete="postal-code"
                  maxLength={6} pattern="[0-9]{6}" value={postalCode}
                  onChange={event => changePostalCode(event.target.value)}
                  aria-describedby="postal-code-status" aria-busy={lookup.status === 'loading'}
                  placeholder="Enter 6 digits to fill your address"
                  className="h-[60px] w-full rounded-xl border border-[#7A7F7A]/40 bg-white px-5 outline-none transition focus:border-[#3E424B]" />
                <p id="postal-code-status" role="status" className="mt-2 text-sm text-[#59605B]">
                  {lookup.status === 'idle' && 'Enter your postal code, or type the address below.'}
                  {lookup.status === 'loading' && 'Looking up your address…'}
                  {lookup.status === 'resolved' && 'Address filled in. Check it before saving.'}
                  {lookup.status === 'choose' && 'Choose your address below.'}
                  {lookup.status === 'empty' && 'No address found. Check the postal code or enter the address yourself.'}
                  {lookup.status === 'error' && lookup.message}
                </p>
                {lookup.status === 'error' && (
                  <button type="button" className="mt-2 font-semibold underline" onClick={() => {
                    setLookup({ status: 'loading', matches: [] })
                    setRetry(count => count + 1)
                  }}>Try again</button>
                )}
                {lookup.status === 'choose' && (
                  <ul className="mt-3 space-y-2" aria-label="Matching addresses">
                    {lookup.matches.map(place => (
                      <li key={`${place.address}:${place.latitude}:${place.longitude}`}>
                        <button type="button" onClick={() => chooseAddress(place)}
                          className="w-full rounded-xl border border-[#7A7F7A]/40 bg-white px-5 py-4 text-left hover:bg-[#DCE7D2]">
                          <span className="block font-semibold">{place.name}</span>
                          {place.name !== place.address && <span className="mt-1 block text-sm">{place.address}</span>}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* ADDRESS */}
              <div className="mt-5">
                <label
                  htmlFor="place-address"
                  className="mb-2 block font-semibold"
                >
                  Address
                </label>

                <textarea
                  id="place-address"
                  required
                  maxLength="500"
                  rows="3"
                  value={form.address}
                  onChange={event => changeAddress(event.target.value)}
                  placeholder="Enter the full address"
                  className="w-full resize-none rounded-xl border border-[#7A7F7A]/40 bg-white px-5 py-4 outline-none transition focus:border-[#3E424B]"
                />
              </div>

              {/* ERROR */}

              {error && (

                <p
                  role="alert"
                  className="mt-5 text-sm font-semibold text-[#A12B2B]"
                >
                  {error}
                </p>

              )}



              {/* BUTTONS */}

              <div className="mt-8 flex gap-4">

                <button
                  type="button"
                  onClick={() => setEditingPlace(null)}
                  disabled={saving}
                  className="flex-1 rounded-xl border-2 border-[#3E424B] px-5 py-4 font-bold transition hover:bg-[#DCE7D2]"
                >
                  Cancel
                </button>


                <button
                  type="submit"
                  disabled={saving || lookup.status === 'loading' || lookup.status === 'choose'}
                  className="flex-1 rounded-xl bg-[#3E424B] px-5 py-4 font-bold text-white transition hover:bg-[#2A3439] disabled:opacity-60"
                >
                  {saving
                    ? 'Saving...'
                    : 'Save place'}
                </button>

              </div>
              </fieldset>
            </form>

          </section>

        ) : (

          <>


            {/* ================================================= */}
            {/* SAVED PLACES HEADER */}
            {/* ================================================= */}

            <div className="flex items-end justify-between">

              <div>

                <p className="text-[13px] font-bold uppercase tracking-[0.16em] text-[#7A7F7A]">
                  Your shortcuts
                </p>


                <h1
                  className="mt-2 text-5xl text-[#2A3439]"
                  style={{
                    fontFamily: '"DM Serif Display", serif',
                  }}
                >
                  Saved places
                </h1>


                <p className="mt-3 text-[16px] text-[#7A7F7A]">
                  Keep the places you visit often in one place.
                </p>

              </div>

              {/* ADD PLACE */}
              <button
                type="button"
                onClick={() => openForm()}
                className="flex items-center gap-2 rounded-full bg-[#3E424B] px-6 py-3 font-bold text-white transition hover:bg-[#2A3439]"
              >
                <Plus size={19} />

                Add place
              </button>

            </div>

            {error && (
              <p
                role="alert"
                className="mt-6 text-sm font-semibold text-[#A12B2B]"
              >
                {error}
              </p>
            )}

            {loading && (
              <p className="mt-10 text-[#7A7F7A]">
                Loading saved places...
              </p>

            )}

            {/* ================================================= */}
            {/* NO SAVED PLACES */}
            {/* ================================================= */}
            {!loading && places.length === 0 && (
              <button
                type="button"
                onClick={() => openForm()}
                className="mt-10 flex min-h-[230px] w-full flex-col items-center justify-center rounded-[18px] border-2 border-dashed border-[#A88FA1]/45 transition hover:bg-[#A88FA1]/10"
              >

                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#A88FA1] text-white">
                  <Plus size={21} />
                </div>


                <p className="mt-4 text-lg font-semibold">
                  Add your first saved place
                </p>

                <p className="mt-1 text-sm text-[#7A7F7A]">
                  Your saved places will also appear on Home.
                </p>
              </button>
            )}

            {/* SAVED PLACE CARDS */}
            {!loading && places.length > 0 && (
              <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">

                {places.map((place) => (
                  <div
                    key={place.id}
                    className="flex min-h-[220px] flex-col rounded-[18px] border-2 border-[#3E424B]/80 bg-[#DCE7D2] px-7 py-6"
                  >

                    <div className="flex items-start justify-between">

                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/70">
                        <MapPin size={20} />
                      </div>

                      <div className="flex gap-1">

                        {/* EDIT */}
                        <button
                          type="button"
                          aria-label={`Edit ${place.label}`}
                          onClick={() => openForm(place)}
                          className="rounded-full p-2 transition hover:bg-white/70"
                        >
                          <Edit3 size={18} />
                        </button>

                        {/* DELETE */}
                        <button
                          type="button"
                          aria-label={`Delete ${place.label}`}
                          onClick={() => deletePlace(place)}
                          className="rounded-full p-2 text-[#8A3A3A] transition hover:bg-white/70"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>

                    <h2 className="mt-5 text-[22px] font-semibold">
                      {place.label}
                    </h2>

                    <p className="mt-1 text-[14px] leading-6 text-[#7A7F7A]">
                      {place.address}
                    </p>

                    <button
                      type="button"
                      onClick={() => onUsePlace(place)}
                      className="group mt-auto flex items-center gap-2 pt-5 text-left text-[14px] font-bold"
                    >
                      Plan route
                      <ArrowRight
                        size={17}
                        className="transition group-hover:translate-x-1"
                      />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}

export default SavedPlaces
