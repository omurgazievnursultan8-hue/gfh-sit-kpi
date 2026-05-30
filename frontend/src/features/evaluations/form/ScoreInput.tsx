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
  const currentNum = parseFloat(value)
  const hasValue = !Number.isNaN(currentNum) && value !== ''
  const activeStars = hasValue && max > 0 ? (currentNum / max) * 5 : 0
  const valueForStar = (n: number): number => round((max * n) / 5, step)

  const setStars = (n: number) => {
    const cur = hasValue && max > 0 ? Math.round((currentNum / max) * 5) : 0
    if (n === cur) return onChange('0')
    onChange(valueForStar(n).toString())
  }

  if (pending) {
    return (
      <div className="efm-field">
        <div className="efm-flabel">{t('evaluation.form.scoreLabel', { defaultValue: 'Оценка' })}</div>
        <div className="efm-readout-pending">{t('evaluation.form.autoPending')}</div>
      </div>
    )
  }

  const starsRow = [1, 2, 3, 4, 5].map(n => {
    const fire = () => setStars(n)
    presetRef?.(n - 1, fire)
    const fillPct = Math.max(0, Math.min(1, activeStars - (n - 1))) * 100
    return (
      <button
        key={n}
        type="button"
        disabled={disabled}
        role="radio"
        aria-checked={Math.round(activeStars) === n}
        className="efm-star"
        onClick={fire}
        title={`${valueForStar(n)} / ${max}`}
      >
        <span className="efm-star-wrap">
          <span className="efm-star-bg" aria-hidden>★</span>
          <span className="efm-star-fg" aria-hidden style={{ width: `${fillPct}%` }}>★</span>
        </span>
      </button>
    )
  })

  return (
    <div className="efm-field">
      <div className="efm-flabel">
        {t('evaluation.form.scoreLabel', { defaultValue: 'Оценка' })}
        {disabled && <span className="efm-flabel-hint">· {t('evaluation.form.locked', { defaultValue: 'заблокировано' })}</span>}
      </div>
      <div className="efm-ratebox">
        <div className={`efm-stars ${negative ? 'is-neg' : ''}`} role="radiogroup" aria-label={t('evaluation.form.score')}>
          {starsRow}
        </div>
        <div className="efm-rate-readout">
          <div className="efm-nrow">
            <div className="efm-numinput">
              <input
                type="number"
                min={0}
                max={max}
                step={step}
                value={value}
                disabled={disabled}
                placeholder="—"
                onChange={e => {
                  const v = e.target.value
                  if (v === '') return onChange('')
                  const n = Math.max(0, Math.min(max, parseFloat(v)))
                  onChange(Number.isNaN(n) ? '' : n.toString())
                }}
                aria-label={t('evaluation.form.score')}
              />
              <span className="u">/ {max}</span>
            </div>
            <span className="efm-star-val">
              <b>{activeStars.toFixed(1)}</b> ★ из 5
            </span>
          </div>
          <div className="efm-ratehint">
            {disabled
              ? t('evaluation.form.systemScore', { defaultValue: 'Системная оценка' })
              : t('evaluation.form.rateHint', { defaultValue: 'Нажмите звёзды или введите балл' })}
          </div>
        </div>
      </div>
    </div>
  )
}
