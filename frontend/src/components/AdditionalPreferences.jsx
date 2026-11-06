import { Footprints, Sparkles } from 'lucide-react'

function StatusBadge({ enabled, label }) {
  return <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
    enabled ? 'bg-[#DCE7D2] text-[#344A35]' : 'bg-[#ECECE6] text-[#555C60]'
  }`}>{label}</span>
}

export default function AdditionalPreferences({ walkingOnlyEnabled, walkingOnlyMaxDistanceMeters, automaticLearning }) {
  const distance = walkingOnlyMaxDistanceMeters < 1000
    ? `${walkingOnlyMaxDistanceMeters} m`
    : `${walkingOnlyMaxDistanceMeters / 1000} km`

  return <div className="mt-5 grid gap-4 sm:grid-cols-2">
    <section aria-label="Walking-only routes" className="flex flex-col rounded-[20px] border border-[#3E424B]/15 bg-[#FFFEFA] p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#DCE7D2]/65">
          <Footprints size={23} aria-hidden="true" />
        </span>
        <StatusBadge enabled={walkingOnlyEnabled} label={walkingOnlyEnabled ? 'Enabled' : 'Off'} />
      </div>
      <h3 className="text-lg font-semibold text-[#2A3439]">Walking-only routes</h3>
      {walkingOnlyEnabled ? <>
        <p className="mt-2 text-2xl font-semibold tracking-tight text-[#2A3439]">Up to {distance}</p>
        <p className="mt-3 text-sm leading-relaxed text-[#555C60]">Offered alongside public transport for shorter journeys.</p>
      </> : <p className="mt-3 text-sm leading-relaxed text-[#555C60]">Enable in Edit to include walking-only options.</p>}
    </section>

    <section aria-label="Automatic learning" className="flex flex-col rounded-[20px] border border-[#3E424B]/15 bg-[#FFFEFA] p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#DCE7D2]/65">
          <Sparkles size={23} aria-hidden="true" />
        </span>
        <StatusBadge enabled={automaticLearning} label={automaticLearning ? 'On' : 'Off'} />
      </div>
      <h3 className="text-lg font-semibold text-[#2A3439]">Automatic learning</h3>
      <p className="mb-5 mt-3 text-sm leading-relaxed text-[#555C60]">
        {automaticLearning ? 'Your route choices help refine your preferences.' : 'Your preferences stay as you set them.'}
      </p>
      <p className="mt-auto border-t border-[#3E424B]/10 pt-4 text-xs leading-relaxed text-[#62686A]">Changes you make in Edit take priority.</p>
    </section>
  </div>
}
