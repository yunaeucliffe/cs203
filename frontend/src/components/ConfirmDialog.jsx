import { useEffect, useRef } from 'react'

// In-app replacement for window.confirm, so it looks like the rest of SilverRoute
// and can't be blocked by the browser. Escape or Cancel closes it without acting.
export default function ConfirmDialog({ message, confirmLabel, onConfirm, onCancel }) {
  const dialog = useRef(null)

  useEffect(() => {
    dialog.current?.showModal()
  }, [])

  return (
    <dialog
      ref={dialog}
      aria-labelledby="confirm-dialog-message"
      onCancel={event => { event.preventDefault(); onCancel() }}
      className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-md rounded-3xl bg-white p-6 text-[#2A3439] shadow-xl backdrop:bg-black/40"
    >
      <p id="confirm-dialog-message" className="text-lg font-semibold">
        {message}
      </p>

      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-12 rounded-xl px-5 font-semibold text-[#3E424B] hover:bg-[#FAF7F0]"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="min-h-12 rounded-xl bg-[#A12B2B] px-5 font-semibold text-white hover:bg-[#8A2424]"
        >
          {confirmLabel}
        </button>
      </div>
    </dialog>
  )
}
