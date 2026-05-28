import { useState } from 'react'
import { useTranslation } from 'react-i18next'

interface Props {
  value: string
  max: number
  step: number
  disabled?: boolean
  negative?: boolean
  pending?: boolean
  onChange: (v: string) => void
  presetRef?: (n: number, fire: () => void) => void
}

const round = (x: number, step: number): number => Math.round(x / step) * step

export function ScoreInput({ value, max, step, disabled, negative, pending, onChange, presetRef }: Props) {
  const { t } = useTranslation()
  const [customOpen, setCustomOpen] = useState(false)

  const presets: { label: string; value: number }[] = [
    { label: t('evaluation.form.preset.zero'),         value: 0 },
    { label: t('evaluation.form.preset.quarter'),      value: round(max * 0.25, step) },
    { label: t('evaluation.form.preset.half'),         value: round(max * 0.50, step) },
    { label: t('evaluation.form.preset.threeQuarter'), value: round(max * 0.75, step) },
    { label: t('evaluation.form.preset.max'),          value: max },
  ]

  const currentNum = parseFloat(value)
  const isSelected = (n: number) => !Number.isNaN(currentNum) && Math.abs(currentNum - n) < 1e-6

  if (pending) {
    return <div className="efm-readout is-pending">{t('evaluation.form.autoPending')}</div>
  }

  return (
    <>
      <div className="efm-presets" role="group" aria-label={t('evaluation.form.score')}>
        {presets.map((p, i) => {
          const fire = () => onChange(p.value.toString())
          presetRef?.(i, fire)
          return (
            <button
              key={i}
              type="button"
              disabled={disabled}
              className={`efm-preset ${isSelected(p.value) ? 'is-selected' : ''}`}
              onClick={fire}
            >
              {p.label}
            </button>
          )
        })}
        <button
          type="button"
          disabled={disabled}
          className={`efm-preset ${customOpen ? 'is-selected' : ''}`}
          onClick={() => { setCustomOpen(true); presetRef?.(5, () => setCustomOpen(true)) }}
        >
          {t('evaluation.form.preset.custom')}
        </button>
      </div>
      {customOpen && (
        <input
          type="number"
          min={0}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          autoFocus
          onChange={e => {
            const v = e.target.value
            if (v === '') return onChange('')
            const n = Math.max(0, Math.min(max, parseFloat(v)))
            onChange(Number.isNaN(n) ? '' : n.toString())
          }}
          className="efm-custom-num"
          aria-label={t('evaluation.form.score')}
        />
      )}
      <div className="efm-readout">
        {value === '' ? '—' : `${negative ? '−' : ''}${parseFloat(value).toFixed(step < 1 ? 1 : 0)}`}
      </div>
    </>
  )
}
