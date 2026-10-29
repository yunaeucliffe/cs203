import { useEffect, useRef, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Edit3,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import Navbar from '../components/Navbar'
import { API_URL, getCsrfToken } from '../api'
import { lookupPostalCode } from '../api/locations'
import CategoryTag from '../components/CategoryTag'

const CATEGORY_COLORS = [
  '#E8DFF5', // Lavender
  '#DCEBFA', // Light blue
  '#FCE4E6', // Soft pink
  '#FFF0D6', // Peach
  '#FFF3CC', // Pastel yellow
  '#DDF3E4', // Mint green
]

const emptyForm = {
  label: '',
  address: '',
  latitude: '',
  longitude: '',
}

function SavedPlaces({ onHome, onRoutes, onProfile, onSignIn, onUsePlace, onPlacesChange, isAuthenticated, startAdding }) {

  const [places, setPlaces] = useState([])
  const [categories, setCategories] = useState([])
  const [placeCategories, setPlaceCategories] = useState({})

  const [selectedCategory, setSelectedCategory] = useState('all')

  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)

  const [categoryName, setCategoryName] = useState('')
  const [categoryColor, setCategoryColor] = useState(CATEGORY_COLORS[0])
  const [creatingCategory, setCreatingCategory] = useState(false)

  const [formCategoryId, setFormCategoryId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [editingPlace, setEditingPlace] = useState(startAdding ? { id: null } : null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [postalCode, setPostalCode] = useState('')
  const [lookup, setLookup] = useState({ status: 'idle', matches: [] })
  const [retry, setRetry] = useState(0)
  const categoryDialog = useRef(null)
  const postalRequest = useRef(null)
  const formOpen = editingPlace !== null

  useEffect(() => {
    if (showCategoryForm) categoryDialog.current.showModal()
    else categoryDialog.current.close()
  }, [showCategoryForm])

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

    Promise.all(['saved-places', 'categories'].map(async resource => {
      const response = await fetch(`${API_URL}/api/users/me/${resource}`, {
        credentials: 'include',
        signal: controller.signal,
      })
      if (response.status === 401) {
        throw new Error('Please sign in to view your saved places.')
      }
      if (!response.ok) throw new Error(`Unable to load ${resource.replace('-', ' ')}.`)
      return response.json()
    }))
      .then(([places, categories]) => {
        setPlaces(places)
        setCategories(categories)
        setPlaceCategories(Object.fromEntries(
          places.filter(place => place.categoryId != null)
            .map(place => [place.id, place.categoryId])
        ))
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

  const openCategoryForm = (category = null) => {
    setEditingCategory(category)
    setCategoryName(category?.name || '')
    setCategoryColor(category?.color || CATEGORY_COLORS[0])
    setError('')
    setShowCategoryForm(true)
  }

  // CREATE / EDIT CATEGORY
  const saveCategory = async () => {
    const name = categoryName.trim()

    if (!name || creatingCategory) return

    const exists = categories.some(
      category => category.id !== editingCategory?.id && category.name.toLowerCase() === name.toLowerCase()
    )

    if (exists) {
      alert('This category already exists.')
      return
    }

    setCreatingCategory(true)
    setError('')
    try {
      const token = await getCsrfToken()
      const response = await fetch(`${API_URL}/api/users/me/categories${editingCategory ? `/${editingCategory.id}` : ''}`, {
        method: editingCategory ? 'PUT' : 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-XSRF-TOKEN': token },
        body: JSON.stringify({ name, color: categoryColor }),
      })
      const category = await response.json().catch(() => null)
      if (!response.ok) throw new Error(category?.message || 'Unable to save category.')
      setCategories(current => editingCategory
        ? current.map(item => item.id === category.id ? category : item)
        : [...current, category])
      if (formOpen && !editingCategory) setFormCategoryId(category.id)
      setCategoryName('')
      setCategoryColor(CATEGORY_COLORS[0])
      setShowCategoryForm(false)
    } catch (failure) {
      setError(failure.message)
    } finally {
      setCreatingCategory(false)
    }

  }

  const deleteCategory = async () => {
    if (creatingCategory || !editingCategory) return
    if (!window.confirm(`Delete "${editingCategory.name}"? Its saved places will have no category.`)) return
    setCreatingCategory(true)
    setError('')
    try {
      const token = await getCsrfToken()
      const response = await fetch(`${API_URL}/api/users/me/categories/${editingCategory.id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'X-XSRF-TOKEN': token },
      })
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.message || 'Unable to delete category.')
      }
      const id = editingCategory.id
      setCategories(current => current.filter(category => category.id !== id))
      setPlaces(current => current.map(place => place.categoryId === id ? { ...place, categoryId: null } : place))
      setPlaceCategories(current => Object.fromEntries(Object.entries(current).filter(([, categoryId]) => categoryId !== id)))
      if (selectedCategory === id) setSelectedCategory('all')
      if (formCategoryId === id) setFormCategoryId('')
      setShowCategoryForm(false)
    } catch (failure) {
      setError(failure.message)
    } finally {
      setCreatingCategory(false)
    }
  }

  // FILTER SAVED PLACES
  const filteredPlaces =
    selectedCategory === 'all'
      ? places
      : places.filter(
          place => placeCategories[place.id] === selectedCategory
        )


  // OPEN ADD / EDIT FORM
  const openForm = (place = null) => {
    postalRequest.current?.abort()
    setPostalCode('')
    setLookup({ status: 'idle', matches: [] })

    if (place) {
      // Editing an existing place
      setEditingPlace(place)
      setFormCategoryId(placeCategories[place.id] || '')

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
      setFormCategoryId('')
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
            categoryId: formCategoryId || null,

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

      // Reflect the category assignment returned by the database.
      setPlaceCategories(current => {
        const updated = { ...current }

        if (data.categoryId != null) {
          updated[data.id] = data.categoryId
        } else {
          delete updated[data.id]
        }

        return updated
      })

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

      setPlaceCategories(current => {
        const updated = { ...current }
        delete updated[place.id]
        return updated
      })

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

              <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#7A7F7A]">
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

                {/* CATEGORY */}
                <div className="mt-8">

                  <label className="mb-3 block font-semibold">
                    Category
                    <span className="ml-2 text-sm font-normal text-[#7A7F7A]">
                      Optional
                    </span>
                  </label>

                  {/* SELECT EXISTING CATEGORY */}
                  <div className="flex flex-wrap gap-3">

                    {/* NO CATEGORY */}
                    <button
                      type="button"
                      onClick={() => setFormCategoryId('')}
                      aria-pressed={formCategoryId === ''}
                      className="rounded-lg"
                    >
                      <CategoryTag
                        name="No category"
                        color="#F0F0F0"
                        selected={formCategoryId === ''}
                      />
                    </button>

                    {/* USER-CREATED CATEGORIES */}
                    {categories.map(category => (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => setFormCategoryId(category.id)}
                        aria-pressed={formCategoryId === category.id}
                        className="rounded-lg"
                      >
                        <CategoryTag
                          name={category.name}
                          color={category.color}
                          selected={formCategoryId === category.id}
                        />
                      </button>
                    ))}

                  </div>


                  {/* CREATE CATEGORY BUTTON */}
                  <button
                    type="button"
                    onClick={() => openCategoryForm()}
                    className="mt-5 flex items-center gap-2 text-sm font-semibold text-[#3E424B] hover:underline"
                  >
                    <Plus size={17} />
                    Create new category
                  </button>



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

                <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#7A7F7A]">
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


                <p className="mt-3 text-base text-[#7A7F7A]">
                  Keep the places you visit often in one place.
                </p>

              </div>

              <div className="flex shrink-0 flex-col items-end gap-3">
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

            </div>


            {/* CATEGORY FILTER */}
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <span id="category-filter-label" className="font-semibold">
                Filter by category
              </span>

              <div
                role="group"
                aria-labelledby="category-filter-label"
                className="flex min-w-0 flex-wrap items-center gap-3"
              >
                {[
                  { id: 'all', name: 'All categories', color: '#F0F0F0' },
                  ...categories,
                ].map(category => {
                  const selected = selectedCategory === category.id

                  return (
                    <div key={category.id} className="flex max-w-full items-center gap-1">
                    <button
                      type="button"
                      aria-pressed={selected}
                      aria-label={selected && category.id !== 'all'
                        ? `Clear ${category.name} filter`
                        : `Filter by ${category.name}`}
                      onClick={() => setSelectedCategory(selected ? 'all' : category.id)}
                      className="inline-flex max-w-full rounded-lg transition hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#3E424B]"
                    >
                      <CategoryTag name={category.name} color={category.color} selected={selected}>
                        {selected && category.id !== 'all' && (
                          <X size={16} aria-hidden="true" className="ml-2 shrink-0" />
                        )}
                      </CategoryTag>
                    </button>
                    {typeof category.id === 'number' && (
                      <button
                        type="button"
                        aria-label={`Edit ${category.name} category`}
                        onClick={() => openCategoryForm(category)}
                        className="rounded-lg p-2 text-[#7A7F7A] transition hover:bg-white hover:text-[#3E424B]"
                      >
                        <Edit3 size={16} />
                      </button>
                    )}
                    </div>
                  )
                })}
              </div>
              <button
                type="button"
                onClick={() => openCategoryForm()}
                className="ml-auto flex shrink-0 items-center gap-2 rounded-lg border border-[#3E424B]/30 px-3 py-2 text-sm font-semibold transition hover:bg-white"
              >
                <Plus size={17} />
                New category
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

                {filteredPlaces.map((place) => (
                  <div
                    key={place.id}
                    className="flex min-h-[220px] flex-col rounded-[18px] border-2 border-[#3E424B]/80 bg-[#DCE7D2] px-7 py-6"
                  >

                    <div className="flex items-start justify-between gap-3">

                      {/* CATEGORY LABEL */}
                      {(() => {
                        const category = categories.find(
                          category => category.id === placeCategories[place.id]
                        )

                        return category ? (
                          <CategoryTag
                            name={category.name}
                            color={category.color}
                          />
                        ) : null
                      })()}

                      <div className="ml-auto flex gap-1">

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

                    <h2 className="mt-6 text-[22px] font-semibold">
                      {place.label}
                    </h2>

                    <p className="mt-1 text-sm leading-6 text-[#7A7F7A]">
                      {place.address}
                    </p>

                    <button
                      type="button"
                      onClick={() => onUsePlace(place)}
                      className="group mt-auto flex items-center gap-2 pt-5 text-left text-sm font-bold"
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
      <dialog
        ref={categoryDialog}
        aria-labelledby="category-dialog-title"
        onClose={() => setShowCategoryForm(false)}
        onCancel={event => {
          if (creatingCategory) event.preventDefault()
        }}
        className="fixed inset-0 m-auto max-h-[90vh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-2xl border border-[#7A7F7A]/20 bg-white p-6 text-[#2A3439] shadow-xl backdrop:bg-black/30"
      >
        <form onSubmit={event => { event.preventDefault(); saveCategory() }}>
          <h2 id="category-dialog-title" className="text-lg font-semibold">{editingCategory ? 'Edit category' : 'Create a category'}</h2>
          {/* LIVE PREVIEW */}
          <div className="pt-2">
            <p className="mb-3 text-sm font-semibold text-[#7A7F7A]">
              Preview
            </p>
            <div>

              <CategoryTag
                name={categoryName.trim() || 'Category name'}
                color={categoryColor}
              />

            </div>

            <p className="mt-2 text-xs text-[#7A7F7A]">
              This is how your category will appear on saved places.
            </p>

          </div>

          {/* CATEGORY NAME */}
          <div className="mt-5">

            <label
              htmlFor="category-name"
              className="mb-2 block text-sm font-semibold"
            >
              Category name
            </label>

            <input
              id="category-name"
              type="text"
              value={categoryName}
              onChange={event => setCategoryName(event.target.value)}
              placeholder="e.g. Healthcare"
              maxLength={40}
              className="h-[52px] w-full rounded-xl border border-[#7A7F7A]/40 px-4 outline-none focus:border-[#3E424B]"
            />

          </div>


          {/* COLOUR SELECTION */}
          <div className="mt-6">

            <p className="text-sm font-semibold">
              Choose a colour
            </p>

            <div className="mt-3 flex flex-wrap gap-3">

              {CATEGORY_COLORS.map(color => (

                <button
                  key={color}
                  type="button"
                  onClick={() => setCategoryColor(color)}
                  aria-label={`Select colour ${color}`}
                  aria-pressed={categoryColor === color}
                  className={`h-10 w-10 rounded-full border-2 transition ${categoryColor === color
                    ? 'border-white ring-2 ring-[#3E424B]'
                    : 'border-transparent'
                    }`}
                  style={{
                    backgroundColor: color,
                  }}
                />

              ))}

            </div>

          </div>

          {/* BUTTONS */}
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            {editingCategory && (
              <button
                type="button"
                onClick={deleteCategory}
                disabled={creatingCategory}
                className="mr-auto flex items-center gap-2 rounded-xl px-3 py-3 font-semibold text-[#A12B2B] hover:bg-[#FCE4E6] disabled:opacity-40"
              >
                <Trash2 size={16} /> Delete
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowCategoryForm(false)}
              disabled={creatingCategory}
              className="rounded-xl px-5 py-3 font-semibold text-[#3E424B] hover:bg-[#FAF7F0]"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={!categoryName.trim() || creatingCategory}
              className="rounded-xl bg-[#3E424B] px-5 py-3 font-semibold text-white transition hover:bg-[#2A3439] disabled:opacity-40"
            >
              {creatingCategory ? 'Saving...' : editingCategory ? 'Save changes' : 'Create category'}
            </button>

          </div>

          {error && <p role="alert" className="mt-4 text-sm font-semibold text-[#A12B2B]">{error}</p>}
        </form>
      </dialog>
    </div>
  )
}

export default SavedPlaces
