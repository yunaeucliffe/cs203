function InfoRow({ icon, label, value, last = false }) {
  return (
    <div
      className={`flex items-center gap-5 py-6 ${!last ? 'border-b border-[#7A7F7A]/15' : ''
        }`}
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#DCE7D2]">
        {icon}
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-[#7A7F7A]">
          {label}
        </p>

        <p className="mt-1 font-medium">
          {value}
        </p>
      </div>
    </div>
  )
}

export default InfoRow