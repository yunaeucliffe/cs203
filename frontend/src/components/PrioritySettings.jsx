export default function PrioritySettings({ values, onChange }) {
  return <section className="my-8 space-y-5" aria-label="Route priorities">
    <p className="text-sm">These priorities guide route trade-offs. They do not change your walking speed or ability.</p>
    {[["minimizeWalkingPriority", "Priority for less walking"], ["shelterPriority", "Priority for shelter"]].map(([key, label]) =>
      <label key={key} className="block">
        <span className="block font-semibold">{label}: {values[key]} / 100</span>
        <input className="mt-2 w-full" type="range" min="0" max="100" step="1" value={values[key]}
          onChange={event => onChange({ ...values, [key]: Number(event.target.value) })} />
        <span className="flex justify-between text-xs"><span>Low importance</span><span>High importance</span></span>
      </label>)}
    <div className="space-y-3 rounded-xl border border-[#7A7F7A]/20 p-4">
      <label className="flex items-start gap-3">
        <input type="checkbox" checked={values.walkingOnlyEnabled ?? false}
          onChange={event => onChange({ ...values, walkingOnlyEnabled: event.target.checked })} />
        <span><span className="block font-semibold">Offer walking-only routes</span>
          <span className="block text-sm">Show a “Walk all the way” option within your limit, alongside public transport. It stays available in rain or heat. Choosing it does not change your learned priorities.</span>
        </span>
      </label>
      <label className="block">
        <span className="block font-semibold">Maximum walking-only distance (metres)</span>
        <input className="mt-2 w-full rounded-lg border border-[#7A7F7A]/40 bg-white p-3 disabled:opacity-60"
          type="number" min="100" max="5000" step="1" required disabled={!values.walkingOnlyEnabled}
          value={values.walkingOnlyMaxDistanceMeters ?? 500}
          onChange={event => onChange({ ...values, walkingOnlyMaxDistanceMeters: event.target.value === '' ? '' : Number(event.target.value) })} />
        <span className="text-sm">100–5,000 m, based on the actual walking path. Your limit is kept when this option is off.</span>
      </label>
    </div>
    <label className="flex gap-3 items-start">
      <input type="checkbox" checked={values.automaticLearning} onChange={event => onChange({ ...values, automaticLearning: event.target.checked })} />
      <span>Learn from my confirmed route choices
        <span className="block text-sm">AI reviews each confirmed alternative and may adjust each priority by up to 10 points. You can edit them or switch learning off at any time.</span>
      </span>
    </label>
  </section>
}
