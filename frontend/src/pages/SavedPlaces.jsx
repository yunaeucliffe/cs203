import { useEffect, useState } from 'react'
import { ArrowLeft, Edit3, MapPin, Plus, Trash2 } from 'lucide-react'
import Navbar from '../components/Navbar'
import { API_URL, getCsrfToken } from '../api'

const emptyForm = { label: '', address: '', latitude: '', longitude: '' }

function SavedPlaces({ onHome, onRoutes, onProfile, onSignIn, onUsePlace, onPlacesChange, isAuthenticated }) {
  const [places, setPlaces] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingPlace, setEditingPlace] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    fetch(`${API_URL}/api/users/me/saved-places`, {
      credentials: 'include',
      signal: controller.signal,
    })
      .then(async (response) => {
        if (response.status === 401) throw new Error('Please sign in to view your saved places.')
        if (!response.ok) throw new Error('Unable to load saved places.')
        return response.json()
      })
      .then(setPlaces)
      .catch((requestError) => {
        if (requestError.name !== 'AbortError') setError(requestError.message)
      })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [])

  const openForm = (place = null) => {
    setEditingPlace(place || { id: null })
    setForm(place ? {
      label: place.label,
      address: place.address,
      latitude: place.latitude ?? '',
      longitude: place.longitude ?? '',
    } : emptyForm)
    setError('')
  }

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
          headers: { 'Content-Type': 'application/json', 'X-XSRF-TOKEN': token },
          body: JSON.stringify({
            label: form.label,
            address: form.address,
            latitude: form.latitude === '' ? null : Number(form.latitude),
            longitude: form.longitude === '' ? null : Number(form.longitude),
          }),
        },
      )
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.message || 'Unable to save this place.')
      setPlaces((current) => isEdit
        ? current.map((place) => place.id === data.id ? data : place)
        : [...current, data])
      onPlacesChange((current) => isEdit
        ? current.map((place) => place.id === data.id ? data : place)
        : [...current, data])
      setEditingPlace(null)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  const deletePlace = async (place) => {
    if (!window.confirm(`Remove ${place.label} from your saved places?`)) return
    setError('')
    try {
      const token = await getCsrfToken()
      const response = await fetch(`${API_URL}/api/users/me/saved-places/${place.id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'X-XSRF-TOKEN': token },
      })
      if (!response.ok) throw new Error('Unable to remove this place.')
      setPlaces((current) => current.filter((item) => item.id !== place.id))
      onPlacesChange((current) => current.filter((item) => item.id !== place.id))
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  return (
    <div className="min-h-screen bg-[#FAF7F0] text-[#2A3439]">
      <Navbar activePage="saved" onHome={onHome} onRoutes={onRoutes}
        onSavedPlaces={() => {}} onProfile={onProfile} onSignIn={onSignIn}
        isAuthenticated={isAuthenticated} />

      <main className="mx-auto max-w-7xl px-8 py-12">
        {editingPlace ? (
          <section className="mx-auto max-w-2xl rounded-[24px] border border-[#7A7F7A]/20 bg-white p-8 shadow-sm">
            <button type="button" onClick={() => setEditingPlace(null)}
              className="mb-7 flex items-center gap-2 font-semibold text-[#71866B] hover:text-[#2A3439]">
              <ArrowLeft size={19} /> Back to saved places
            </button>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#7A7F7A]">
              {editingPlace.id ? 'Update destination' : 'New destination'}
            </p>
            <h1 className="mt-2 text-4xl" style={{ fontFamily: '"DM Serif Display", serif' }}>
              {editingPlace.id ? 'Edit saved place' : 'Add a saved place'}
            </h1>
            <p className="mt-2 text-[#7A7F7A]">Save somewhere you visit often for quicker route planning.</p>

            <form onSubmit={savePlace} className="mt-8 grid gap-5">
              <label className="grid gap-2 font-semibold">Label
                <input required maxLength="100" value={form.label}
                  onChange={(event) => setForm({ ...form, label: event.target.value })}
                  placeholder="Home, Work, School..."
                  className="rounded-xl border border-[#7A7F7A]/40 bg-[#FAF7F0] px-4 py-3 font-normal outline-none focus:border-[#71866B]" />
              </label>
              <label className="grid gap-2 font-semibold">Address
                <textarea required maxLength="500" rows="3" value={form.address}
                  onChange={(event) => setForm({ ...form, address: event.target.value })}
                  placeholder="Enter the full address"
                  className="resize-none rounded-xl border border-[#7A7F7A]/40 bg-[#FAF7F0] px-4 py-3 font-normal outline-none focus:border-[#71866B]" />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 font-semibold">Latitude <span className="text-xs font-normal text-[#7A7F7A]">Optional</span>
                  <input type="number" step="any" min="-90" max="90" value={form.latitude}
                    onChange={(event) => setForm({ ...form, latitude: event.target.value })}
                    className="rounded-xl border border-[#7A7F7A]/40 bg-[#FAF7F0] px-4 py-3 font-normal outline-none focus:border-[#71866B]" />
                </label>
                <label className="grid gap-2 font-semibold">Longitude <span className="text-xs font-normal text-[#7A7F7A]">Optional</span>
                  <input type="number" step="any" min="-180" max="180" value={form.longitude}
                    onChange={(event) => setForm({ ...form, longitude: event.target.value })}
                    className="rounded-xl border border-[#7A7F7A]/40 bg-[#FAF7F0] px-4 py-3 font-normal outline-none focus:border-[#71866B]" />
                </label>
              </div>
              {error && <p role="alert" className="text-sm font-semibold text-[#A12B2B]">{error}</p>}
              <div className="mt-2 flex gap-3">
                <button type="button" onClick={() => setEditingPlace(null)} disabled={saving}
                  className="flex-1 rounded-xl border border-[#71866B] px-5 py-3 font-bold text-[#3F5138]">Cancel</button>
                <button type="submit" disabled={saving}
                  className="flex-1 rounded-xl bg-[#71866B] px-5 py-3 font-bold text-white disabled:opacity-60">
                  {saving ? 'Saving...' : 'Save place'}
                </button>
              </div>
            </form>
          </section>
        ) : (
          <>
            <div className="flex flex-wrap items-end justify-between gap-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#7A7F7A]">Your shortcuts</p>
                <h1 className="mt-2 text-5xl" style={{ fontFamily: '"DM Serif Display", serif' }}>Saved places</h1>
                <p className="mt-3 text-[#7A7F7A]">Choose a place to start a route, or keep your list up to date.</p>
              </div>
              <button type="button" onClick={() => openForm()}
                className="flex items-center gap-2 rounded-full bg-[#3E424B] px-6 py-3 font-bold text-white hover:bg-[#2A3439]">
                <Plus size={19} /> Add place
              </button>
            </div>

            {error && <p role="alert" className="mt-6 rounded-xl bg-red-50 p-4 font-semibold text-[#A12B2B]">{error}</p>}
            {loading ? <p className="mt-12 text-[#7A7F7A]">Loading saved places...</p> : places.length === 0 ? (
              <button type="button" onClick={() => openForm()}
                className="mt-10 flex min-h-64 w-full flex-col items-center justify-center rounded-[24px] border-2 border-dashed border-[#A88FA1]/50 bg-white/50 text-center hover:bg-[#A88FA1]/5">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#A88FA1] text-white"><Plus /></span>
                <strong className="mt-4 text-xl">Add your first saved place</strong>
                <span className="mt-1 text-[#7A7F7A]">It will also appear in Quick access on Home.</span>
              </button>
            ) : (
              <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {places.map((place) => (
                  <article key={place.id} className="flex min-h-56 flex-col rounded-[22px] border-2 border-[#3E424B]/70 bg-[#DCE7D2] p-6">
                    <div className="flex items-start justify-between gap-4">
                      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/70 text-[#3F5138]"><MapPin size={21} /></span>
                      <div className="flex gap-1">
                        <button type="button" aria-label={`Edit ${place.label}`} onClick={() => openForm(place)} className="rounded-full p-2 hover:bg-white/70"><Edit3 size={18} /></button>
                        <button type="button" aria-label={`Delete ${place.label}`} onClick={() => deletePlace(place)} className="rounded-full p-2 text-[#8A3A3A] hover:bg-white/70"><Trash2 size={18} /></button>
                      </div>
                    </div>
                    <h2 className="mt-5 text-2xl" style={{ fontFamily: '"DM Serif Display", serif' }}>{place.label}</h2>
                    <p className="mt-1 flex-1 text-sm leading-6 text-[#5F675F]">{place.address}</p>
                    <button type="button" onClick={() => onUsePlace(place)} className="mt-5 text-left font-bold text-[#3F5138] underline underline-offset-4">Plan a route here</button>
                  </article>
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
