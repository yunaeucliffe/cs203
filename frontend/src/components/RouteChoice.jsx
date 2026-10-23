import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { chooseRoute, undoRouteChoice } from '../api/routes.js'

export default function RouteChoice({ recommendationId, routeId, onChoiceChange, visible, canStartNavigation, canContinueNavigation, onStartNavigation, renderButton }) {
  const [receipt, setReceipt] = useState(null)
  const [confirmedRouteId, setConfirmedRouteId] = useState(null)
  const [choiceVersion, setChoiceVersion] = useState(0)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const dialog = useRef(null)
  const chooseButton = useRef(null)
  const pending = useRef(null)
  const modalOpen = Boolean(receipt && showConfirmation && visible)
  useEffect(() => {
    if (modalOpen) dialog.current?.showModal()
    else dialog.current?.close()
  }, [modalOpen])
  useEffect(() => () => pending.current?.abort(), [])
  useEffect(() => {
    onChoiceChange?.({ recommendationId, routeId: confirmedRouteId, saving })
  }, [onChoiceChange, recommendationId, confirmedRouteId, saving])
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
        setConfirmedRouteId(undo ? null : routeId)
        setShowConfirmation(!undo)
        if (undo) {
          setNotice(result.message)
          chooseButton.current?.focus()
        }
      }
    } catch (failure) {
      if (!controller.signal.aborted) setError(failure.message)
    } finally {
      if (!controller.signal.aborted) setSaving(false)
      pending.current = null
    }
  }
  const button = <button ref={chooseButton} type="button" disabled={saving}
    onClick={() => canContinueNavigation && canStartNavigation ? onStartNavigation() : receipt ? setShowConfirmation(true) : submit()}
    className="flex h-[52px] items-center justify-center rounded-xl bg-[#3E424B] px-8 text-base font-semibold text-white transition hover:bg-[#2A3439] disabled:opacity-60">
    {saving ? 'Saving choice…' : canContinueNavigation && canStartNavigation ? 'Continue navigation' : 'Choose this route'}
  </button>

  return <>
    {renderButton(button)}
    {notice && <p role="status" className="mt-3">{notice}</p>}
    {!receipt && error && <p role="alert" className="mt-3 text-red-700">{error}</p>}
    {createPortal(
      <dialog ref={dialog} aria-labelledby="route-choice-title" aria-describedby="route-choice-message"
        onCancel={event => event.preventDefault()}
        className="fixed inset-0 m-auto w-[calc(100%-3rem)] max-w-md rounded-3xl bg-white p-7 text-[#2A3439] shadow-xl backdrop:bg-black/40">
        <h2 id="route-choice-title" className="text-2xl font-semibold">Route chosen</h2>
        <p id="route-choice-message" className="mt-3">Ready to start navigation? You can also undo your choice to return to route details.</p>
        {error && <p role="alert" className="mt-4 text-red-700">{error}</p>}
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button type="button" disabled={saving} onClick={() => submit(true)}
            className="rounded-full border border-[#3E424B] px-6 py-3 disabled:opacity-60">
            {saving ? 'Undoing choice…' : 'Undo choice'}
          </button>
          <button type="button" disabled={saving || !canStartNavigation} onClick={() => {
            setShowConfirmation(false)
            onStartNavigation()
          }} className="rounded-full bg-[#3E424B] px-6 py-3 text-white disabled:opacity-60">
            Start navigation
          </button>
        </div>
      </dialog>, document.body)}
  </>
}
