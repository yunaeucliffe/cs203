export default function TravelTimeDisclaimer() {
  return (
    <div className="mt-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-950">
      <p><strong>Travel times are estimates and may change.</strong></p>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li>Traffic, weather, service disruptions, walking pace and transfer delays can affect your trip.</li>
        <li>Live arrival data may also be delayed or unavailable.</li>
        <li>Check the latest service information before travelling and allow extra time for connections.</li>
      </ul>
    </div>
  )
}
