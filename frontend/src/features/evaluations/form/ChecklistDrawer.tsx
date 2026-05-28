import { useTranslation } from 'react-i18next'
import type { Criteria } from '../../criteria/criteriaApi'
import type { Phase, ScoreEntry } from './useEvaluationForm'

interface Props {
  open: boolean; onClose: () => void
  positive: Criteria[]; antibonus: Criteria[]
  scores: Record<number, ScoreEntry>
  lang: 'ru' | 'kg'
  onJump: (phase: Phase, idx: number) => void
}

export function ChecklistDrawer({ open, onClose, positive, antibonus, scores, lang, onJump }: Props) {
  const { t } = useTranslation()
  const row = (c: Criteria, i: number, neg: boolean) => {
    const v = scores[c.id]?.value
    const done = !!v && v !== ''
    const name = lang === 'kg' ? c.nameKg : c.nameRu
    return (
      <button
        key={c.id}
        onClick={() => { onJump(neg ? 'antibonus' : 'positive', i); onClose() }}
        style={{
          display: 'grid', gridTemplateColumns: '16px 1fr auto', gap: 10, alignItems: 'center',
          padding: '10px 0', width: '100%', background: 'none', border: 0, cursor: 'pointer',
          borderBottom: '1px dashed var(--dv3-border)', textAlign: 'left',
        }}
      >
        <span style={{
          width: 12, height: 12, transform: 'rotate(45deg)',
          background: done ? (neg ? 'var(--dv3-zone-down)' : 'var(--dv3-accent)') : 'transparent',
          border: `1.5px solid ${done ? (neg ? 'var(--dv3-zone-down)' : 'var(--dv3-accent)') : 'var(--dv3-border-hi)'}`,
        }} />
        <span style={{ fontFamily: "'EB Garamond',Georgia,serif", fontStyle: 'italic', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {neg ? `A${i + 1}` : `${i + 1}`}. {name}
        </span>
        <span style={{ fontSize: 11, color: 'var(--dv3-text3)' }}>
          {done ? `${neg ? '−' : ''}${parseFloat(v).toFixed(1)}` : '—'}
        </span>
      </button>
    )
  }
  return (
    <>
      <div className={`efm-drawer-backdrop ${open ? 'is-open' : ''}`} onClick={onClose} />
      <aside className={`efm-drawer ${open ? 'is-open' : ''}`} aria-label={t('evaluation.form.checklist')}>
        <div style={{ padding: 20 }}>
          <h3 style={{ marginTop: 0, fontFamily: "'EB Garamond',Georgia,serif", fontStyle: 'italic' }}>
            {t('evaluation.form.checklist')}
          </h3>
          {positive.map((c, i) => row(c, i, false))}
          {antibonus.map((c, i) => row(c, i, true))}
        </div>
      </aside>
    </>
  )
}
