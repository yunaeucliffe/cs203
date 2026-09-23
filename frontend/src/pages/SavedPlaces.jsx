import { useEffect, useState } from 'react'
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
                  onChange={(event) =>
                    setForm({
                      ...form,
                      address: event.target.value,
                    })
                  }
                  placeholder="Enter the full address"
                  className="w-full resize-none rounded-xl border border-[#7A7F7A]/40 bg-white px-5 py-4 outline-none transition focus:border-[#3E424B]"
                />
              </div>

              {/* LATITUDE + LONGITUDE */}
              <div className="mt-5 grid grid-cols-2 gap-4">

                {/* LATITUDE */}
                <div>
                  <label
                    htmlFor="latitude"
                    className="mb-2 block font-semibold"
                  >
                    Latitude
                    <span className="ml-2 text-sm font-normal text-[#7A7F7A]">
                      Optional
                    </span>
                  </label>

                  <input
                    id="latitude"
                    type="number"
                    step="any"
                    min="-90"
                    max="90"
                    value={form.latitude}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        latitude: event.target.value,
                      })
                    }
                    className="h-[60px] w-full rounded-xl border border-[#7A7F7A]/40 bg-white px-5 outline-none transition focus:border-[#3E424B]"
                  />

                </div>

                {/* LONGITUDE */}
                <div>

                  <label
                    htmlFor="longitude"
                    className="mb-2 block font-semibold"
                  >
                    Longitude

                    <span className="ml-2 text-sm font-normal text-[#7A7F7A]">
                      Optional
                    </span>

                  </label>

                  <input
                    id="longitude"
                    type="number"
                    step="any"
                    min="-180"
                    max="180"
                    value={form.longitude}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        longitude: event.target.value,
                      })
                    }
                    className="h-[60px] w-full rounded-xl border border-[#7A7F7A]/40 bg-white px-5 outline-none transition focus:border-[#3E424B]"
                  />

                </div>

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
                  disabled={saving}
                  className="flex-1 rounded-xl bg-[#3E424B] px-5 py-4 font-bold text-white transition hover:bg-[#2A3439] disabled:opacity-60"
                >
                  {saving
                    ? 'Saving...'
                    : 'Save place'}
                </button>

              </div>

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