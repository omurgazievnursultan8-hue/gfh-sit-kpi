import { useLayoutEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

interface Props {
  value: string
  required: boolean
  onChange: (v: string) => void
}

const MIN_LEN = 10

export function NoteField({ value, required, onChange }: Props) {
  const { t } = useTranslation()
  const ref = useRef<HTMLTextAreaElement>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value])

  const tooShort = required && value.trim().length < MIN_LEN
  return (
    <>
      <label className="efm-label" htmlFor="efm-note">{t('evaluation.form.noteLabel')}</label>
      <textarea
        id="efm-note"
        ref={ref}
        value={value}
        placeholder={t('evaluation.form.notePlaceholder')}
        className={`efm-note ${tooShort ? 'is-error' : ''}`}
        onChange={e => onChange(e.target.value)}
        aria-invalid={tooShort}
        aria-describedby={tooShort ? 'efm-note-err' : undefined}
      />
      {tooShort && (
        <div id="efm-note-err" className="efm-note-error">
          {t('evaluation.form.noteRequiredAntibonus')}
        </div>
      )}
    </>
  )
}
