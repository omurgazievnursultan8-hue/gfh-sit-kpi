import { useEffect, useId, useRef } from 'react'
import { useTranslation } from 'react-i18next'

interface Props {
  open: boolean
  title: string
  description: string
  onConfirm: () => void
  onCancel: () => void
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'default'
}

export function ConfirmDialog({
  open,
  title,
  description,
  onConfirm,
  onCancel,
  confirmLabel,
  cancelLabel,
  variant = 'default',
}: Props) {
  const { t } = useTranslation()
  const dialogRef = useRef<HTMLDivElement>(null)
  const confirmRef = useRef<HTMLButtonElement>(null)
  const triggerRef = useRef<HTMLElement | null>(null)
  const titleId = useId()
  const descId = useId()

  // Body scroll lock while dialog open — prevents background scroll
  // through the backdrop on touch + wheel.
  useEffect(() => {
    if (!open || typeof document === 'undefined') return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  // Focus management + Escape + Tab trap.
  useEffect(() => {
    if (!open) return
    const trigger = document.activeElement
    if (trigger instanceof HTMLElement) triggerRef.current = trigger

    // Focus the primary action by default — fast keyboard confirm.
    const raf = requestAnimationFrame(() => confirmRef.current?.focus())

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onCancel(); return }
      if (e.key !== 'Tab') return
      const panel = dialogRef.current
      if (!panel) return
      const focusables = Array.from(
        panel.querySelectorAll<HTMLElement>('button, [tabindex]:not([tabindex="-1"])')
      ).filter(el => !el.hasAttribute('disabled') && el.offsetParent !== null)
      if (focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const active = document.activeElement
      if (e.shiftKey && active === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('keydown', onKey)
      // Restore focus to whichever element opened the dialog.
      triggerRef.current?.focus?.()
      triggerRef.current = null
    }
  }, [open, onCancel])

  if (!open) return null

  const confirm = confirmLabel ?? (t('common.confirm', 'Подтвердить') as string)
  const cancel = cancelLabel ?? (t('common.cancel', 'Отмена') as string)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onCancel} aria-hidden="true" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 max-w-[420px] w-full"
      >
        <h3 id={titleId} className="text-[17px] font-semibold tracking-tight text-slate-900 mb-2">{title}</h3>
        <p id={descId} className="text-[13.5px] text-slate-600 leading-relaxed mb-6">{description}</p>
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="h-10 px-4 text-[13.5px] font-medium border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
          >
            {cancel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            className={`h-10 px-4 text-[13.5px] font-medium text-white rounded-lg ${
              variant === 'danger' ? 'bg-[#b3261e] hover:bg-[#962019]' : 'bg-[#0a6b4e] hover:bg-[#095a42]'
            }`}
          >
            {confirm}
          </button>
        </div>
      </div>
    </div>
  )
}
