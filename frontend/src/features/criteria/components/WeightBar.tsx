interface Props {
  used: number
}

const SEGMENTS = 20

export function WeightBar({ used }: Props) {
  const value = Math.min(Math.max(used, 0), 100)
  const filled = Math.round((value / 100) * SEGMENTS)

  const tone =
    value > 100.001 ? 'danger' :
    value > 95 ? 'warn' : 'ok'

  const accent =
    tone === 'danger' ? '#c0492e' :
    tone === 'warn'   ? 'var(--gold)' :
                        '#3a8f6c'

  const remaining = 100 - value
  const remLabel =
    tone === 'danger' ? `превышение ${Math.abs(remaining).toFixed(1)}%` :
    `свободно ${Math.max(0, remaining).toFixed(1)}%`

  return (
    <div
      className="mb-5"
      style={{
        background: '#fff',
        border: '1px solid rgba(14,39,36,0.10)',
        borderRadius: 12,
        padding: '14px 18px',
      }}
    >
      <div className="flex items-center justify-between gap-4 mb-2.5 flex-wrap">
        <div className="flex items-baseline gap-2">
          <span
            className="font-display"
            style={{ fontSize: 22, fontWeight: 700, lineHeight: 1, color: '#0e2724', letterSpacing: '-0.01em' }}
          >
            {value.toFixed(1)}%
          </span>
          <span style={{ fontSize: 12, color: 'rgba(14,39,36,0.5)' }}>
            из 100% распределено
          </span>
        </div>

        <span
          className="inline-flex items-center gap-1.5"
          style={{ fontSize: 11.5, color: accent, fontWeight: 600 }}
        >
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: accent }} />
          {remLabel}
        </span>
      </div>

      <div className="flex gap-[3px]" aria-label={`weight ${value.toFixed(1)} percent`}>
        {Array.from({ length: SEGMENTS }).map((_, i) => {
          const isFilled = i < filled
          const isDanger = i >= 19 && isFilled
          const isWarn = i >= 16 && i < 19 && isFilled
          const bg = isFilled
            ? (isDanger ? '#c0492e' : isWarn ? 'var(--gold)' : '#3a8f6c')
            : 'rgba(14,39,36,0.07)'
          return (
            <div
              key={i}
              style={{
                flex: 1,
                height: 8,
                background: bg,
                borderRadius: 2,
                transition: 'background 240ms ease',
              }}
            />
          )
        })}
      </div>
    </div>
  )
}
