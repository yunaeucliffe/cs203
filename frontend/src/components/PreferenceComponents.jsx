export function PreferenceCard({ icon, label, value }) {
  return (
    <div className="min-h-[150px] rounded-[20px] border border-[#3E424B]/20 bg-[#DCE7D2] p-6">
      <div className="mb-7">
        {icon}
      </div>

      <p className="text-xs font-semibold uppercase tracking-wide text-[#7A7F7A]">
        {label}
      </p>

      <p className="mt-2 text-lg font-semibold">
        {value}
      </p>
    </div>
  )
}


export function PreferenceSelector({
  title,
  description,
  options,
  value,
  onChange,
}) {
  return (
    <div>
      <p className="font-semibold">
        {title}
      </p>

      <p className="mt-1 text-sm text-[#7A7F7A]">
        {description}
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`min-w-[120px] rounded-full border px-6 py-3 font-medium transition ${
              value === option
                ? 'border-[#3E424B] bg-[#DCE7D2] text-[#2A3439]'
                : 'border-[#7A7F7A]/30 bg-transparent text-[#7A7F7A] hover:border-[#3E424B]'
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  )
}