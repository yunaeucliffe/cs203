import { useEffect, useRef, useState } from 'react'
import { chooseRoute, undoRouteChoice } from '../api/routes.js'

export default function RouteChoice({ recommendationId, routeId }) {
  const [receipt, setReceipt] = useState(null)
  const [choiceVersion, setChoiceVersion] = useState(0)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const pending = useRef(null)
  useEffect(() => () => pending.current?.abort(), [])
  const submit = async (undo = false) => {
    if (pending.current || (!undo && receipt) || (undo && !receipt)) return
    const controller = new AbortController()
    pending.current = controller
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const result = undo
        ? await undoRouteChoice(recommendationId, receipt.choiceVersion, controller.signal)
        : await chooseRoute(recommendationId, routeId, controller.signal, choiceVersion)
      if (!controller.signal.aborted) {
        setChoiceVersion(result.choiceVersion)
        setReceipt(undo ? null : result)
        if (undo) setNotice(result.message)
      }
    } catch (failure) {
      if (!controller.signal.aborted) setError(failure.message)
    } finally {
      if (!controller.signal.aborted) setSaving(false)
      pending.current = null
    }
  }
  return <section className="my-5 rounded-xl bg-white/70 p-5" aria-label="Confirm route choice">
    <p className="text-sm">Previewing a route does not change your preferences. Confirm a route to help personalize future recommendations. Made a mistake? Undo your choice, then select and confirm another route.</p>
    <button type="button" disabled={saving || Boolean(receipt)} onClick={() => submit()}
      className="mt-3 rounded-full bg-[#3E424B] px-6 py-3 text-white disabled:opacity-60">
      {saving ? (receipt ? 'Undoing choice…' : 'Saving choice…') : receipt ? 'Route choice saved' : 'Choose this route'}
    </button>
    {receipt && <button type="button" disabled={saving} onClick={() => submit(true)}
      className="ml-3 mt-3 rounded-full border border-[#3E424B] px-6 py-3 disabled:opacity-60">
      Undo choice
    </button>}
    {notice && <p role="status" className="mt-3">{notice}</p>}
    {receipt && <p role="status" className="mt-3">{receipt.message}</p>}
    {error && <p role="alert" className="mt-3 text-red-700">{error}</p>}
  </section>
}
