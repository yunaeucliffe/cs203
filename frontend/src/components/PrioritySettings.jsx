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
    <label className="flex gap-3 items-start">
      <input type="checkbox" checked={values.automaticLearning} onChange={event => onChange({ ...values, automaticLearning: event.target.checked })} />
      <span>Learn from my confirmed route choices
        <span className="block text-sm">AI reviews each confirmed alternative and may adjust each priority by up to 10 points. You can edit them or switch learning off at any time.</span>
      </span>
    </label>
  </section>
}
