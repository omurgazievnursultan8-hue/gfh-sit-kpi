interface KpiRingProps {
  score: number | null
}

const RADIUS = 50
const CIRCUMFERENCE = 2 * Math.PI * RADIUS // 314.16

function gradeLabel(score: number): string {
  if (score >= 90) return 'A'
  if (score >= 80) return 'A−'
  if (score >= 70) return 'B+'
  if (score >= 60) return 'B'
  if (score >= 50) return 'C'
  return 'D'
}

export function KpiRing({ score }: KpiRingProps) {
  const arcLen = score !== null ? (score / 100) * CIRCUMFERENCE : 0

  return (
    <div className="relative" style={{ width: 130, height: 130, flexShrink: 0 }}>
      <svg
        viewBox="0 0 120 120"
        width={130}
        height={130}
        style={{ transform: 'rotate(-90deg)' }}
        aria-label={score !== null ? `KPI score ${score} out of 100` : 'No KPI score yet'}
      >
        {/* Base track */}
        <circle
          cx={60} cy={60} r={RADIUS}
          stroke="rgba(255,255,255,0.10)" strokeWidth={9} fill="none"
        />
        {/* Red zone 0–60% */}
        <circle
          cx={60} cy={60} r={RADIUS}
          stroke="rgba(163,31,31,0.28)" strokeWidth={9} fill="none"
          strokeDasharray={`${0.6 * CIRCUMFERENCE} ${CIRCUMFERENCE}`}
          strokeDashoffset={0} opacity={0.55}
        />
        {/* Yellow zone 60–80% */}
        <circle
          cx={60} cy={60} r={RADIUS}
          stroke="rgba(168,133,43,0.30)" strokeWidth={9} fill="none"
          strokeDasharray={`${0.2 * CIRCUMFERENCE} ${CIRCUMFERENCE}`}
          strokeDashoffset={-(0.6 * CIRCUMFERENCE)} opacity={0.55}
        />
        {/* Green zone 80–100% */}
        <circle
          cx={60} cy={60} r={RADIUS}
          stroke="rgba(26,117,88,0.32)" strokeWidth={9} fill="none"
          strokeDasharray={`${0.2 * CIRCUMFERENCE} ${CIRCUMFERENCE}`}
          strokeDashoffset={-(0.8 * CIRCUMFERENCE)} opacity={0.55}
        />
        {/* Score arc */}
        {score !== null && (
          <circle
            cx={60} cy={60} r={RADIUS}
            stroke="var(--gold)" strokeWidth={9} fill="none"
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
              style={{ fontSize: 38, fontWeight: 600, color: 'var(--gold-soft)' }}
            >
              {Math.round(score)}
            </div>
            <div
              className="font-mono uppercase tracking-widest mt-1"
              style={{ fontSize: 9.5, color: 'rgba(245,236,210,0.6)' }}
            >
              из 100
            </div>
            <span
              className="inline-block font-mono font-semibold mt-1 px-1.5 py-px rounded"
              style={{
                fontSize: 9.5,
                background: 'rgba(168,133,43,0.22)',
                border: '1px solid rgba(168,133,43,0.40)',
                color: 'var(--gold)',
              }}
            >
              {gradeLabel(score)}
            </span>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 32, color: 'rgba(245,236,210,0.3)', fontWeight: 600 }}>—</div>
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
