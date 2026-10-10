import { useEffect, useId, useState } from 'react'
import { searchSuggestions } from '../api/locations'

export default function LocationAutocomplete({ value, selectedPlace, onChange, onSelect, label, placeholder, className = '', onSubmit }) {
  const id = useId()
  const [focused, setFocused] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [active, setActive] = useState(-1)
  const [retry, setRetry] = useState(0)
  const [result, setResult] = useState({ query: '', places: [], status: '' })
  const query = value.trim()
  const eligible = focused && !dismissed && !selectedPlace && query.length >= 2
  const current = result.query === query ? result : { places: [], status: 'loading' }
  const open = eligible

  useEffect(() => {
    if (!eligible) return
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setResult({ query, places: [], status: 'loading' })
      try {
        const places = await searchSuggestions(query, controller.signal)
        if (!controller.signal.aborted) setResult({ query, places, status: 'ready' })
      } catch (error) {
        if (error.name !== 'AbortError' && !controller.signal.aborted) {
          setResult({ query, places: [], status: 'error' })
        }
      }
    }, 300)
    return () => { clearTimeout(timer); controller.abort() }
  }, [query, eligible, retry])

  function select(place) {
    setDismissed(true)
    setActive(-1)
    onSelect(place)
  }

  return (
    <div className="relative min-w-0 flex-1" onBlur={event => {
      if (!event.currentTarget.contains(event.relatedTarget)) { setFocused(false); setActive(-1) }
    }}>
      <input
        role="combobox" aria-label={label} aria-autocomplete="list" aria-expanded={open}
        aria-controls={open ? `${id}-list` : undefined}
        aria-activedescendant={open && current.places[active] ? `${id}-${active}` : undefined}
        aria-describedby={open ? `${id}-status` : undefined}
        autoComplete="off" maxLength={500} value={value} placeholder={placeholder} className={className}
        onFocus={() => { setFocused(true); setDismissed(false) }}
        onChange={event => { setDismissed(false); setActive(-1); onChange(event.target.value) }}
        onKeyDown={event => {
          if (event.nativeEvent.isComposing) return
          if (event.key === 'Escape') { setDismissed(true); setActive(-1) }
          if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && open && current.places.length) {
            event.preventDefault()
            setActive(index => (index + (event.key === 'ArrowDown' ? 1 : index < 0 ? 0 : -1) + current.places.length) % current.places.length)
          }
          if (event.key === 'Enter') {
            event.preventDefault()
            if (open && current.places[active]) select(current.places[active])
            else onSubmit?.()
          }
        }}
      />
      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-80 overflow-y-auto rounded-xl border border-[#7A7F7A]/30 bg-white shadow-lg">
          <div id={`${id}-status`} role="status" className="px-4 py-2 text-sm text-[#59605B]">
            {current.status === 'loading' ? 'Searching…' : current.status === 'error' ? 'Suggestions unavailable.' : current.places.length ? 'Choose a location.' : 'No locations found. Try another name or postal code.'}
            {current.status === 'error' && <button type="button" className="ml-2 font-semibold underline"
              onMouseDown={event => event.preventDefault()} onClick={() => { setResult({ query, places: [], status: 'loading' }); setRetry(count => count + 1) }}>Try again</button>}
          </div>
          <ul id={`${id}-list`} role="listbox" aria-label={`${label} suggestions`}>
            {current.places.map((place, index) => (
              <li key={`${place.address}:${place.latitude}:${place.longitude}`} id={`${id}-${index}`} role="option"
                aria-selected={active === index} onMouseDown={event => event.preventDefault()}
                onClick={() => select(place)}
                className={`cursor-pointer px-4 py-3 text-base hover:bg-[#FAF7F0] ${active === index ? 'bg-[#FAF7F0]' : ''}`}>
                <div className="font-semibold">{place.name}</div>
                {place.address !== place.name && <div className="mt-1 text-sm text-[#59605B]">{place.address}</div>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
