interface KpiRingProps {
  score: number | null
  periodShort?: string | null
}

const RADIUS = 50
const CIRCUMFERENCE = 2 * Math.PI * RADIUS // 314.16

export function KpiRing({ score, periodShort }: KpiRingProps) {
  const arcLen = score !== null ? (score / 100) * CIRCUMFERENCE : 0
  const caption = periodShort ? `/ 100 · ${periodShort}` : '/ 100'

  return (
    <div className="relative" style={{ width: 140, height: 140, flexShrink: 0 }}>
      <svg
        viewBox="0 0 120 120"
        width={140}
        height={140}
        style={{ transform: 'rotate(-90deg)' }}
        aria-label={score !== null ? `KPI score ${score} out of 100` : 'No KPI score yet'}
      >
        {/* Base track */}
        <circle
          cx={60} cy={60} r={RADIUS}
          stroke="rgba(255,255,255,0.12)" strokeWidth={10} fill="none"
        />
        {/* Score arc */}
        {score !== null && (
          <circle
            cx={60} cy={60} r={RADIUS}
            stroke="var(--gold)" strokeWidth={10} fill="none"
            strokeLinecap="round"
            strokeDasharray={`${arcLen} ${CIRCUMFERENCE}`}
            strokeDashoffset={0}
            style={{ filter: 'drop-shadow(0 0 5px rgba(168,133,43,0.4))' }}
          />
        )}
      </svg>

      {/* Centre overlay */}
      <div className="absolute inset-0 flex items-center justify-center text-center">
        {score !== null ? (
          <div>
            <div
              className="font-display leading-none"
              style={{ fontSize: 44, fontWeight: 600, color: 'var(--gold)' }}
            >
              {Math.round(score)}
            </div>
            <div
              className="font-mono uppercase tracking-widest mt-1.5"
              style={{ fontSize: 9.5, color: 'rgba(245,236,210,0.55)' }}
            >
              {caption}
            </div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 36, color: 'rgba(245,236,210,0.3)', fontWeight: 600 }}>—</div>
            <div
              className="font-mono uppercase tracking-wider mt-1"
              style={{ fontSize: 10, color: 'rgba(245,236,210,0.45)' }}
            >
              Нет оценки
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
