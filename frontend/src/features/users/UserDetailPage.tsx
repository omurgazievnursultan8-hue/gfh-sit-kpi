import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { DASHBOARD_CSS } from '../dashboard/dashboardStyles'
import {
  usersApi, userDetailApi,
  type User, type EvaluationListItem, type ScoreItem, type CriteriaItem, type PeriodItem,
} from './usersApi'
import { orgApi, type OrgUnit } from '../org/orgApi'
import { initials } from './components/usersMeta'
import { UserFormModal } from './components/UserFormModal'

function flattenUnits(roots: OrgUnit[]): OrgUnit[] {
  const out: OrgUnit[] = []
  const walk = (u: OrgUnit) => { out.push(u); u.children?.forEach(walk) }
  roots.forEach(walk)
  return out
}

type TabKey = 'criteria' | 'team' | 'periods' | 'info'

interface CriterionRow {
  id: number
  name: string
  scope: string
  type: 'POSITIVE' | 'ANTI_BONUS'
  value: number
  weight: number
  contribution: number
}

function periodLabel(p: PeriodItem | undefined): string {
  if (!p) return '—'
  const year = p.endDate?.slice(0, 4) ?? ''
  return `${p.type} ${year}`.trim()
}

function periodDate(p: PeriodItem | undefined): string {
  if (!p?.endDate) return '—'
  const [y, m, d] = p.endDate.split('-')
  return `${d}.${m}.${y}`
}

function ratingHeadline(score: number): string {
  if (score >= 90) return 'Отличный уровень'
  if (score >= 75) return 'Хороший уровень'
  if (score >= 60) return 'Средний уровень'
  return 'Требует внимания'
}

function formatRuDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
}

function yearsSince(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const years = Math.max(0, Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000)))
  if (years === 0) return ' (меньше года)'
  const tail = years % 10 === 1 && years % 100 !== 11 ? 'год' : years % 10 >= 2 && years % 10 <= 4 && (years % 100 < 10 || years % 100 >= 20) ? 'года' : 'лет'
  return ` (${years} ${tail})`
}

export function UserDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const [user, setUser] = useState<User | null>(null)
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [units, setUnits] = useState<OrgUnit[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [tab, setTab] = useState<TabKey>('criteria')
  const [evaluations, setEvaluations] = useState<EvaluationListItem[]>([])
  const [latestScores, setLatestScores] = useState<ScoreItem[]>([])
  const [criteria, setCriteria] = useState<CriteriaItem[]>([])
  const [periods, setPeriods] = useState<PeriodItem[]>([])
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadErr, setUploadErr] = useState<string | null>(null)
  const [showEdit, setShowEdit] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean; title: string; description: string; variant: 'danger' | 'default'; onConfirm: () => void
  }>({ open: false, title: '', description: '', variant: 'danger', onConfirm: () => {} })
  const [tempPw, setTempPw] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const closeConfirm = () => setConfirmDialog(d => ({ ...d, open: false }))
  const ask = (title: string, description: string, variant: 'danger' | 'default', onConfirm: () => void) =>
    setConfirmDialog({ open: true, title, description, variant, onConfirm })

  const onToggleActive = () => {
    if (!user) return
    if (user.isActive) {
      ask(t('v2.users.deactivateTitle'), t('v2.users.deactivateMsg', { name: user.fullName }), 'danger', async () => {
        try { await usersApi.deactivate(user.id); setUser({ ...user, isActive: false }) }
        finally { closeConfirm() }
      })
    } else {
      ask(t('v2.users.activateTitle'), t('v2.users.activateMsg', { name: user.fullName }), 'default', async () => {
        try { await usersApi.reactivate(user.id); setUser({ ...user, isActive: true }) }
        finally { closeConfirm() }
      })
    }
  }
  const onResetPassword = () => {
    if (!user) return
    ask(t('v2.users.resetPwTitle'), t('v2.users.resetPwMsg', { name: user.fullName }), 'default', async () => {
      try {
        const updated = await usersApi.resetPassword(user.id)
        if (updated?.tempPassword) {
          setTempPw(updated.tempPassword)
          setCopied(false)
        }
      } finally { closeConfirm() }
    })
  }

  const onAvatarPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f || !user) return
    if (f.size > 2 * 1024 * 1024) { setUploadErr('Файл больше 2 МБ'); return }
    if (!['image/png', 'image/jpeg'].includes(f.type)) { setUploadErr('Только PNG или JPEG'); return }
    setUploading(true); setUploadErr(null)
    try {
      const updated = await usersApi.uploadAvatar(user.id, f)
      setUser(updated)
    } catch {
      setUploadErr('Не удалось загрузить аватар')
    } finally {
      setUploading(false)
    }
  }

  useEffect(() => {
    let cancel = false
    setLoading(true); setFailed(false)
    Promise.all([
      usersApi.list(0, 500),
      orgApi.getStructure().catch(() => []),
      userDetailApi.listCriteria().catch(() => [] as CriteriaItem[]),
      userDetailApi.listPeriods().catch(() => [] as PeriodItem[]),
    ])
      .then(([r, u, crit, per]) => {
        if (cancel) return
        setAllUsers(r.content)
        setUnits(flattenUnits(u as OrgUnit[]))
        setUser(r.content.find(u2 => String(u2.id) === id) ?? null)
        setCriteria(crit)
        setPeriods(per)
      })
      .catch(() => { if (!cancel) setFailed(true) })
      .finally(() => { if (!cancel) setLoading(false) })
    return () => { cancel = true }
  }, [id])

  useEffect(() => {
    if (!user) { setEvaluations([]); setLatestScores([]); return }
    let cancel = false
    userDetailApi.listEvaluations(user.id)
      .then(async page => {
        if (cancel) return
        const evals = page.content
        setEvaluations(evals)
        const latest = evals.find(e => e.status === 'SUBMITTED') ?? evals[0]
        if (latest) {
          try {
            const scores = await userDetailApi.getScores(latest.id)
            if (!cancel) setLatestScores(scores)
          } catch {
            if (!cancel) setLatestScores([])
          }
        } else {
          setLatestScores([])
        }
      })
      .catch(() => { if (!cancel) { setEvaluations([]); setLatestScores([]) } })
    return () => { cancel = true }
  }, [user?.id])

  const managerName = useMemo(() => {
    if (!user?.managerId) return null
    return allUsers.find(u => u.id === user.managerId)?.fullName ?? null
  }, [user, allUsers])

  const unitName = useMemo(() => {
    if (!user?.unitId) return null
    return units.find(u => u.id === user.unitId)?.nameRu ?? null
  }, [user, units])

  const latestEvaluation = useMemo<EvaluationListItem | undefined>(() => {
    return evaluations.find(e => e.status === 'SUBMITTED') ?? evaluations[0]
  }, [evaluations])

  const previousEvaluation = useMemo<EvaluationListItem | undefined>(() => {
    if (!latestEvaluation) return undefined
    return evaluations.find(e => e.id !== latestEvaluation.id && e.status === 'SUBMITTED')
  }, [evaluations, latestEvaluation])

  const criteriaById = useMemo(() => {
    const m = new Map<number, CriteriaItem>()
    criteria.forEach(c => m.set(c.id, c))
    return m
  }, [criteria])

  const periodById = useMemo(() => {
    const m = new Map<number, PeriodItem>()
    periods.forEach(p => m.set(p.id, p))
    return m
  }, [periods])

  const criterionRows = useMemo<CriterionRow[]>(() => {
    return latestScores.map(s => {
      const c = criteriaById.get(s.criteriaId)
      const value = Number(s.value ?? 0)
      const weight = Number(c?.weight ?? 0)
      return {
        id: s.criteriaId,
        name: c?.nameRu ?? `#${s.criteriaId}`,
        scope: c?.orgUnitNameRu ?? 'GLOBAL',
        type: (c?.type ?? 'POSITIVE') as 'POSITIVE' | 'ANTI_BONUS',
        value,
        weight,
        contribution: (value * weight) / 100,
      }
    })
  }, [latestScores, criteriaById])

  const positiveRows = useMemo(() => criterionRows.filter(r => r.type === 'POSITIVE'), [criterionRows])
  const penaltyRows  = useMemo(() => criterionRows.filter(r => r.type === 'ANTI_BONUS' && r.value !== 0), [criterionRows])
  const positiveWeightTotal = useMemo(() => positiveRows.reduce((s, r) => s + r.weight, 0), [positiveRows])

  const rating = useMemo(() => {
    if (latestEvaluation?.finalScore != null) return Math.round(Number(latestEvaluation.finalScore))
    if (criterionRows.length === 0) return 0
    return Math.max(0, Math.round(criterionRows.reduce((s, r) => s + r.contribution, 0)))
  }, [latestEvaluation, criterionRows])

  const ratingTrend = useMemo(() => {
    if (!latestEvaluation || !previousEvaluation) return null
    const a = Number(latestEvaluation.finalScore ?? 0)
    const b = Number(previousEvaluation.finalScore ?? 0)
    return { delta: Math.round(a - b), prevPeriod: periodById.get(previousEvaluation.periodId) }
  }, [latestEvaluation, previousEvaluation, periodById])

  const subordinates = useMemo(() => {
    if (!user) return []
    return allUsers.filter(u => u.managerId === user.id && u.isActive)
  }, [user, allUsers])


  return (
    <div className="dv3-root">
      <style>{DASHBOARD_CSS}</style>
      <style>{PAGE_CSS}</style>

      <div className="dv3-terminal">
        <div className="udp-shell">
          {loading && <div className="udp-state">Загрузка…</div>}
          {failed && !loading && <div className="udp-state udp-state--err">Не удалось загрузить профиль</div>}
          {!loading && !failed && !user && <div className="udp-state">Сотрудник не найден</div>}

          {user && !loading && (
            <div className="udp-layout">
              {/* LEFT: profile side */}
              <aside className="udp-side">
                <div className="udp-id">
                  <button
                    type="button"
                    className={`udp-avatar-xl ${user.isActive ? '' : 'is-off'}`}
                    style={user.avatarUrl ? { backgroundImage: `url(${user.avatarUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', color: 'transparent', cursor: 'pointer', border: 0, padding: 0 } : { cursor: 'pointer', border: 0, padding: 0 }}
                    onClick={() => fileInputRef.current?.click()}
                    title={uploading ? 'Загрузка…' : 'Сменить аватар'}
                    disabled={uploading}>
                    {user.avatarUrl ? '' : initials(user.fullName)}
                    {user.isActive && <span className="udp-presence" aria-hidden />}
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/png,image/jpeg" hidden onChange={onAvatarPick} />
                  {uploadErr && <div className="udp-state udp-state--err" style={{ marginTop: 6 }}>{uploadErr}</div>}
                  <div className="udp-name-block">
                    <div className="udp-name">{user.fullName}</div>
                    <div className="udp-position">{user.position ?? '— должность не указана —'}</div>
                  </div>
                  <div className="udp-role-row">
                    <span className="udp-role-badge">{user.role}</span>
                    <button type="button" className="udp-action-icon" aria-label={t('v2.menuEdit')} title={t('v2.menuEdit')} onClick={() => setShowEdit(true)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                    <button
                      type="button"
                      className={`udp-action-icon ${user.isActive ? 'is-danger' : 'is-ok'}`}
                      aria-label={user.isActive ? t('v2.menuDeactivate') : t('v2.menuActivate')}
                      title={user.isActive ? t('v2.menuDeactivate') : t('v2.menuActivate')}
                      onClick={onToggleActive}
                    >
                      {user.isActive ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      )}
                    </button>
                    <button type="button" className="udp-action-icon is-warn" aria-label={t('v2.menuResetPw')} title={t('v2.menuResetPw')} onClick={onResetPassword}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2"/>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="udp-quick-stats">
                  <QuickStat value={latestEvaluation ? rating : '—'} label="KPI" />
                  <QuickStat value={subordinates.length} label="В команде" />
                  <QuickStat value={penaltyRows.length} label="Штрафов" />
                </div>

                <div className="udp-contact-list">
                  <Contact icon={<EnvelopeIcon />} label="Email"          value={user.email} />
                  {user.phone && <Contact icon={<PhoneIcon />} label="Телефон" value={user.phone} />}
                  {user.employeeNumber && <Contact icon={<IdIcon />} label="Табельный №" value={user.employeeNumber} />}
                  <Contact icon={<BuildingIcon />} label="Подразделение"  value={unitName ?? (user.unitId != null ? `№${user.unitId}` : '—')} />
                  <Contact icon={<CalendarIcon />} label="В компании с"   value={`${formatRuDate(user.hireDate ?? user.createdAt)}${yearsSince(user.hireDate ?? user.createdAt)}`} />
                  {user.terminationDate && <Contact icon={<CalendarIcon />} label="Уволен" value={formatRuDate(user.terminationDate)} />}
                  {user.employmentType && <Contact icon={<IdIcon />} label="Тип занятости" value={user.employmentType} />}
                </div>

                <div>
                  <div className="udp-eyebrow">Прямой руководитель</div>
                  <div className="udp-manager">
                    <span className="udp-manager-avatar">{managerName ? initials(managerName) : '—'}</span>
                    <div className="udp-manager-info">
                      <div className="udp-manager-label">MANAGER</div>
                      <div className="udp-manager-name">
                        {managerName ?? (user.managerId != null ? `#${user.managerId}` : 'Не назначен')}
                      </div>
                    </div>
                  </div>
                </div>
              </aside>

              {/* RIGHT: content */}
              <div className="udp-content">
                {/* Rating hero */}
                <div className="udp-hero">
                  <div className="udp-hero-bg" aria-hidden />
                  <div className="udp-hero-circle">
                    <div className="udp-hero-number">{latestEvaluation ? rating : '—'}</div>
                    <div className="udp-hero-max">/ 100</div>
                  </div>
                  <div className="udp-hero-info">
                    <div className="udp-hero-title">Итоговый рейтинг</div>
                    <div className="udp-hero-headline">
                      {latestEvaluation ? ratingHeadline(rating) : 'Нет оценок'}
                    </div>
                    {latestEvaluation && (
                      <div className="udp-hero-period">
                        <CalendarIcon />
                        {periodLabel(periodById.get(latestEvaluation.periodId))}
                        {' · '}
                        {latestEvaluation.status === 'SUBMITTED' ? 'Закрыт' : 'Черновик'}
                      </div>
                    )}
                  </div>
                  {ratingTrend && (
                    <div className="udp-hero-trend">
                      <div className="udp-hero-trend-value">
                        {ratingTrend.delta >= 0 ? '↑ +' : '↓ '}{ratingTrend.delta}
                      </div>
                      <div className="udp-hero-trend-label">vs {periodLabel(ratingTrend.prevPeriod)}</div>
                    </div>
                  )}
                </div>

                {/* Tabs */}
                <div className="udp-tabs" role="tablist">
                  <TabBtn active={tab === 'criteria'} onClick={() => setTab('criteria')} icon={<ChartIcon />}>
                    Критерии оценки
                  </TabBtn>
                  <TabBtn active={tab === 'team'} onClick={() => setTab('team')} icon={<UsersIcon />}>
                    Команда ({subordinates.length})
                  </TabBtn>
                  <TabBtn active={tab === 'periods'} onClick={() => setTab('periods')} icon={<CalendarIcon />}>
                    История периодов
                  </TabBtn>
                  <TabBtn active={tab === 'info'} onClick={() => setTab('info')} icon={<DocIcon />}>
                    Информация
                  </TabBtn>
                </div>

                {tab === 'criteria' && (
                  <>
                    {!latestEvaluation && (
                      <Card title="Положительные критерии" icon={<CheckIcon />}>
                        <div className="udp-empty-ok" style={{ background: 'var(--bg-soft)', color: 'var(--ink-soft)' }}>
                          Сотрудник пока не оценивался
                        </div>
                      </Card>
                    )}
                    {latestEvaluation && (
                      <Card
                        title={`Положительные критерии (вес ${positiveWeightTotal}%)`}
                        meta={`${positiveRows.length} критерия`}
                        icon={<CheckIcon />}
                        noPad
                      >
                        {positiveRows.length === 0 && (
                          <div className="udp-empty-ok" style={{ margin: 20, background: 'var(--bg-soft)', color: 'var(--ink-soft)' }}>
                            Нет данных по положительным критериям
                          </div>
                        )}
                        {positiveRows.map(c => (
                          <div className="udp-cri-row" key={c.id}>
                            <div className="udp-cri-info">
                              <div className="udp-cri-name">{c.name}</div>
                              <div className="udp-cri-scope">{c.scope}</div>
                            </div>
                            <div className="udp-cri-barcell">
                              <div className="udp-cri-bar">
                                <div className="udp-cri-fill" style={{ width: `${Math.max(0, Math.min(100, c.value))}%` }} />
                              </div>
                            </div>
                            <div className="udp-cri-score">
                              <div className="udp-cri-points">+{c.contribution.toFixed(1)}</div>
                              <div className="udp-cri-weight">{c.value} × {c.weight}%</div>
                            </div>
                          </div>
                        ))}
                      </Card>
                    )}
                    {latestEvaluation && (
                      <Card
                        title="Антибонусы (штрафы)"
                        meta={
                          <span style={{ color: penaltyRows.length === 0 ? 'var(--accent)' : 'var(--danger)', fontWeight: 600 }}>
                            {penaltyRows.length} {penaltyRows.length === 1 ? 'нарушение' : 'нарушений'}
                          </span>
                        }
                        icon={<AlertIcon />}
                        noPad={penaltyRows.length > 0}
                      >
                        {penaltyRows.length === 0 ? (
                          <div className="udp-empty-ok">
                            ✓ За период {periodLabel(periodById.get(latestEvaluation.periodId))} нарушений не выявлено
                          </div>
                        ) : (
                          penaltyRows.map(c => (
                            <div className="udp-cri-row" key={c.id}>
                              <div className="udp-cri-info">
                                <div className="udp-cri-name">{c.name}</div>
                                <div className="udp-cri-scope">{c.scope}</div>
                              </div>
                              <div className="udp-cri-barcell" />
                              <div className="udp-cri-score">
                                <div className="udp-cri-points" style={{ color: 'var(--danger)' }}>
                                  {c.contribution.toFixed(1)}
                                </div>
                                <div className="udp-cri-weight">{c.value} × {c.weight}%</div>
                              </div>
                            </div>
                          ))
                        )}
                      </Card>
                    )}
                  </>
                )}

                {tab === 'team' && (
                  <Card title="Прямые подчинённые" meta={`${subordinates.length} сотрудников`} icon={<UsersIcon />} noPad>
                    {subordinates.length === 0 ? (
                      <div className="udp-empty-ok" style={{ margin: 20, background: 'var(--bg-soft)', color: 'var(--ink-soft)' }}>
                        Нет прямых подчинённых
                      </div>
                    ) : (
                      <div className="udp-team-grid">
                        {subordinates.map(m => (
                          <div className="udp-team-card" key={m.id}>
                            <span className="udp-team-avatar">{initials(m.fullName)}</span>
                            <div className="udp-team-info">
                              <div className="udp-team-name">{m.fullName}</div>
                              <div className="udp-team-role">{m.position ?? m.role}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                )}

                {tab === 'periods' && (
                  <Card title="История периодов оценки" icon={<CalendarIcon />} noPad>
                    {evaluations.length === 0 ? (
                      <div className="udp-empty-ok" style={{ margin: 20, background: 'var(--bg-soft)', color: 'var(--ink-soft)' }}>
                        Нет оценок за прошлые периоды
                      </div>
                    ) : (
                      <div className="udp-timeline">
                        {evaluations.map(e => {
                          const p = periodById.get(e.periodId)
                          const closed = e.status === 'SUBMITTED'
                          const score = e.finalScore != null ? Math.round(Number(e.finalScore)) : null
                          return (
                            <div className="udp-tl-item" key={e.id}>
                              <div className="udp-tl-date">{periodDate(p)}</div>
                              <div className="udp-tl-content">
                                <div className="udp-tl-title">{periodLabel(p)}</div>
                                <div className="udp-tl-detail">
                                  {closed ? 'Оценка завершена' : e.status === 'DRAFT' ? 'Черновик' : 'Отменено'}
                                  {score != null && ` · Рейтинг ${score}/100`}
                                  {e.evaluatorName && ` · ${e.evaluatorName}`}
                                </div>
                                <div className="udp-tl-pill">
                                  {closed ? 'Закрыт ✓' : e.status === 'DRAFT' ? 'В работе' : 'Отменено'}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </Card>
                )}

                {tab === 'info' && (
                  <Card title="Системная информация" icon={<GearIcon />}>
                    <div className="udp-kv">
                      <KVRow k="ID пользователя" v={`USR-${String(user.id).padStart(6, '0')}`} mono />
                      {user.employeeNumber && <KVRow k="Табельный номер" v={user.employeeNumber} mono />}
                      {(user.lastName || user.firstName || user.middleName) && (
                        <KVRow k="ФИО" v={[user.lastName, user.firstName, user.middleName].filter(Boolean).join(' ')} />
                      )}
                      {user.employmentType && <KVRow k="Тип занятости" v={user.employmentType} mono />}
                      {user.hireDate && <KVRow k="Дата приёма" v={formatRuDate(user.hireDate)} />}
                      {user.terminationDate && <KVRow k="Дата увольнения" v={formatRuDate(user.terminationDate)} />}
                      <KVRow k="Роль в системе"  v={user.role} mono />
                      <KVRow k="Статус"          v={user.isActive ? 'Активен' : 'Заблокирован'} />
                      <KVRow k="Создан"          v={formatRuDate(user.createdAt)} />
                    </div>
                  </Card>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {user && (
        <UserFormModal
          open={showEdit}
          user={user}
          allUsers={allUsers}
          onClose={() => setShowEdit(false)}
          onSave={async (data) => {
            const saved = await usersApi.update(user.id, data)
            setUser(saved)
            return saved
          }}
        />
      )}
      <ConfirmDialog {...confirmDialog} onCancel={closeConfirm} />
      {tempPw && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          }}
          onClick={() => setTempPw(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--surface, #fff)', borderRadius: 12, padding: 24,
              maxWidth: 440, width: '90%', boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
            }}
          >
            <h3 style={{ marginTop: 0, fontSize: 16, fontWeight: 600 }}>
              {t('v2.users.tempPwTitle', { defaultValue: 'Временный пароль' })}
            </h3>
            <p style={{ fontSize: 13, color: 'var(--ink-faint)' }}>
              {t('v2.users.tempPwNote', { defaultValue: 'Скопируйте сейчас — пароль больше не будет показан. Пользователь должен сменить его при первом входе.' })}
            </p>
            <div style={{
              fontFamily: 'monospace', fontSize: 16, padding: '12px 14px',
              background: 'var(--surface-2, #f5f5f7)', borderRadius: 8,
              userSelect: 'all', wordBreak: 'break-all', margin: '12px 0',
            }}>{tempPw}</div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={async () => {
                  try { await navigator.clipboard.writeText(tempPw); setCopied(true) } catch { /* noop */ }
                }}
                style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer' }}
              >{copied ? t('v2.users.copied', { defaultValue: 'Скопировано' }) : t('v2.users.copy', { defaultValue: 'Копировать' })}</button>
              <button
                type="button"
                onClick={() => setTempPw(null)}
                style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: 'var(--accent, #4f46e5)', color: '#fff', cursor: 'pointer' }}
              >{t('common.close', { defaultValue: 'Закрыть' })}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── small subcomponents ───────────────────────────────────────────────── */

function QuickStat({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="udp-qs">
      <div className="udp-qs-value">{value}</div>
      <div className="udp-qs-label">{label}</div>
    </div>
  )
}

function Contact({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="udp-contact">
      <span className="udp-contact-icon">{icon}</span>
      <div className="udp-contact-info">
        <div className="udp-contact-label">{label}</div>
        <div className="udp-contact-value">{value}</div>
      </div>
    </div>
  )
}

function Card({ title, meta, icon, noPad, children }: {
  title: string; meta?: ReactNode; icon?: ReactNode; noPad?: boolean; children: ReactNode
}) {
  return (
    <div className="udp-card">
      <div className="udp-card-head">
        <h3>{icon}{title}</h3>
        {meta != null && <span className="udp-card-meta">{meta}</span>}
      </div>
      <div className={`udp-card-body${noPad ? ' is-nopad' : ''}`}>{children}</div>
    </div>
  )
}

function TabBtn({ active, onClick, icon, children }: {
  active: boolean; onClick: () => void; icon: ReactNode; children: ReactNode
}) {
  return (
    <button type="button" role="tab" aria-selected={active} className={`udp-tab${active ? ' is-active' : ''}`} onClick={onClick}>
      {icon}{children}
    </button>
  )
}

function KVRow({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="udp-kv-row">
      <div className="udp-kv-k">{k}</div>
      <div className={`udp-kv-v${mono ? ' is-mono' : ''}`}>{v}</div>
    </div>
  )
}

/* ─── icons (inline SVG, currentColor) ──────────────────────────────────── */

const svgCommon = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
function EnvelopeIcon() { return <svg {...svgCommon}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg> }
function PhoneIcon()    { return <svg {...svgCommon}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg> }
function IdIcon()       { return <svg {...svgCommon}><rect x="2" y="4" width="20" height="16" rx="2"/><circle cx="9" cy="12" r="2.5"/><line x1="14" y1="10" x2="19" y2="10"/><line x1="14" y1="14" x2="17" y2="14"/></svg> }
function BuildingIcon() { return <svg {...svgCommon}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> }
function CalendarIcon() { return <svg {...svgCommon}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> }
function ClockIcon()    { return <svg {...svgCommon}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> }
function ChartIcon()    { return <svg {...svgCommon}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg> }
function UsersIcon()    { return <svg {...svgCommon}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> }
function DocIcon()      { return <svg {...svgCommon}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> }
function CheckIcon()    { return <svg {...svgCommon}><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg> }
function AlertIcon()    { return <svg {...svgCommon}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> }
function GearIcon()     { return <svg {...svgCommon}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6h.09A1.65 1.65 0 0 0 10 3.09V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> }

/* ─── styles ────────────────────────────────────────────────────────────── */

const PAGE_CSS = `
.udp-shell { padding: 0; background: var(--bg-soft); min-height: 100%; }

.udp-state { padding: 60px 28px; text-align: center; color: var(--ink-soft); font-size: 14px; }
.udp-state--err { color: var(--danger); }

.udp-layout {
  display: grid; grid-template-columns: 360px 1fr; min-height: calc(100% - 60px);
}
@media (max-width: 1100px) { .udp-layout { grid-template-columns: 1fr; } }

.udp-side {
  background: var(--surface);
  border-right: 1px solid var(--line);
  padding: 32px 26px;
  display: flex; flex-direction: column; gap: 24px;
}
@media (max-width: 1100px) { .udp-side { border-right: 0; border-bottom: 1px solid var(--line); } }

.udp-id {
  display: flex; flex-direction: column; align-items: center; text-align: center;
  gap: 14px; padding-bottom: 22px; border-bottom: 1px solid var(--line-soft);
}
.udp-avatar-xl {
  position: relative;
  width: 116px; height: 116px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 40px; font-weight: 700; color: #fff;
  background: linear-gradient(135deg, var(--accent) 0%, var(--success) 100%);
  box-shadow: 0 12px 28px -10px color-mix(in srgb, var(--accent) 60%, transparent);
  letter-spacing: 0.02em;
}
.udp-avatar-xl.is-off { filter: grayscale(0.7); opacity: 0.6; }
.udp-presence {
  position: absolute; bottom: 4px; right: 4px;
  width: 22px; height: 22px; border-radius: 50%;
  background: var(--success); border: 3px solid var(--surface);
}
.udp-name-block { display: flex; flex-direction: column; gap: 4px; }
.udp-name { font-size: 21px; font-weight: 700; color: var(--ink); line-height: 1.2; }
.udp-position { font-size: 13.5px; color: var(--accent); font-weight: 600; }
.udp-role-row { display: inline-flex; align-items: center; gap: 8px; }
.udp-role-badge {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 5px 12px; border-radius: 999px;
  font-size: 11px; font-family: var(--font-mono); font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.06em;
  background: var(--accent-mute); color: var(--accent-ink);
  border: 1px solid color-mix(in srgb, var(--accent) 20%, transparent);
}
.udp-action-icon {
  display: inline-flex; align-items: center; justify-content: center;
  width: 30px; height: 30px; border-radius: 8px; cursor: pointer;
  background: var(--surface); color: var(--ink-soft);
  border: 1px solid var(--line);
  transition: background .12s ease, color .12s ease, border-color .12s ease;
}
.udp-action-icon svg { width: 14px; height: 14px; }
.udp-action-icon:hover { background: var(--accent); color: #fff; border-color: var(--accent-ink); }
.udp-action-icon.is-danger:hover { background: var(--danger); color: #fff; border-color: var(--danger); }
.udp-action-icon.is-ok:hover { background: var(--success); color: #fff; border-color: var(--success); }
.udp-action-icon.is-warn:hover { background: var(--warn); color: #fff; border-color: var(--warn); }

.udp-quick-stats {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;
  padding-bottom: 22px; border-bottom: 1px solid var(--line-soft);
}
.udp-qs {
  text-align: center; padding: 12px 4px; border-radius: var(--radius-lg);
  background: var(--bg-soft); border: 1px solid var(--line);
}
.udp-qs-value {
  font-size: 22px; font-weight: 700; color: var(--accent);
  font-variant-numeric: tabular-nums; letter-spacing: -0.01em;
}
.udp-qs-label {
  font-size: 10px; color: var(--ink-faint); font-family: var(--font-mono);
  text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600; margin-top: 4px;
}

.udp-contact-list {
  display: flex; flex-direction: column; gap: 14px;
  padding-bottom: 22px; border-bottom: 1px solid var(--line-soft);
}
.udp-contact { display: flex; align-items: center; gap: 12px; }
.udp-contact-icon {
  width: 36px; height: 36px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  background: var(--accent-mute); color: var(--accent);
  flex-shrink: 0;
}
.udp-contact-icon svg { width: 16px; height: 16px; }
.udp-contact-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.udp-contact-label {
  font-size: 11px; color: var(--ink-faint); font-family: var(--font-mono);
  text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600;
}
.udp-contact-value { font-size: 13px; color: var(--ink); font-weight: 600; word-break: break-word; }

.udp-eyebrow {
  font-size: 11px; color: var(--ink-faint); font-family: var(--font-mono);
  text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600; margin-bottom: 8px;
}
.udp-manager {
  display: flex; align-items: center; gap: 10px; padding: 12px;
  border-radius: var(--radius-lg);
  background: color-mix(in srgb, var(--accent) 6%, var(--surface));
  border: 1px solid color-mix(in srgb, var(--accent) 25%, transparent);
  transition: background .12s ease, transform .12s ease;
  cursor: default;
}
.udp-manager-avatar {
  width: 36px; height: 36px; border-radius: 50%; color: #fff; font-size: 12px; font-weight: 600;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  background: linear-gradient(135deg, var(--accent) 0%, var(--success) 100%);
}
.udp-manager-info { flex: 1; min-width: 0; }
.udp-manager-label { font-size: 10px; color: var(--ink-faint); font-family: var(--font-mono); text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600; }
.udp-manager-name { font-size: 13px; color: var(--ink); font-weight: 600; }

.udp-content { padding: 26px 28px; display: flex; flex-direction: column; gap: 22px; }

.udp-hero {
  position: relative; overflow: hidden;
  background: linear-gradient(135deg, var(--accent) 0%, color-mix(in srgb, var(--accent) 75%, var(--success)) 100%);
  border-radius: var(--radius-xl); padding: 26px;
  color: #fff;
  display: grid; grid-template-columns: auto 1fr auto; gap: 26px; align-items: center;
  box-shadow: 0 18px 40px -22px color-mix(in srgb, var(--accent) 60%, transparent);
}
.udp-hero-bg {
  position: absolute; top: -50%; right: -20%; width: 420px; height: 420px; border-radius: 50%;
  background: radial-gradient(circle, rgba(255,255,255,0.14) 0%, transparent 70%);
  pointer-events: none;
}
.udp-hero-circle {
  position: relative; z-index: 1;
  width: 110px; height: 110px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center; flex-direction: column;
  background: rgba(255,255,255,0.15);
  border: 3px solid rgba(255,255,255,0.3);
  backdrop-filter: blur(6px);
}
.udp-hero-number { font-size: 38px; font-weight: 700; line-height: 1; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
.udp-hero-max    { font-size: 11px; opacity: 0.7; margin-top: 4px; font-family: var(--font-mono); }
.udp-hero-info   { position: relative; z-index: 1; min-width: 0; }
.udp-hero-title  { font-size: 12px; opacity: 0.85; font-family: var(--font-mono); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px; }
.udp-hero-headline { font-size: 22px; font-weight: 700; margin-bottom: 8px; letter-spacing: -0.01em; }
.udp-hero-period {
  display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px;
  border-radius: 999px; background: rgba(255,255,255,0.15);
  font-size: 12px; font-weight: 500;
}
.udp-hero-period svg { width: 12px; height: 12px; }
.udp-hero-trend { text-align: right; position: relative; z-index: 1; }
.udp-hero-trend-value { font-size: 28px; font-weight: 700; line-height: 1; margin-bottom: 4px; font-variant-numeric: tabular-nums; }
.udp-hero-trend-label { font-size: 12px; opacity: 0.85; }

@media (max-width: 700px) {
  .udp-hero { grid-template-columns: 1fr; text-align: center; }
  .udp-hero-trend { text-align: center; }
}

.udp-tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--line); overflow-x: auto; }
.udp-tab {
  height: 40px; padding: 0 14px;
  font-size: 13.5px; font-weight: 500; color: var(--ink-soft);
  background: transparent; border: 0;
  border-bottom: 2px solid transparent; border-radius: 8px 8px 0 0;
  margin-bottom: -1px; cursor: pointer;
  display: inline-flex; align-items: center; gap: 8px;
  font-family: inherit; white-space: nowrap;
  transition: color .1s ease, background .1s ease, border-color .1s ease;
}
.udp-tab svg { width: 15px; height: 15px; }
.udp-tab:hover { color: var(--ink); background: color-mix(in srgb, var(--accent) 6%, transparent); }
.udp-tab.is-active { color: var(--ink); background: color-mix(in srgb, var(--accent) 10%, var(--surface)); border-bottom-color: var(--accent); font-weight: 600; }

.udp-card {
  background: var(--surface); border: 1px solid var(--line);
  border-radius: var(--radius-xl); overflow: hidden;
}
.udp-card + .udp-card { margin-top: 0; }
.udp-card-head {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 14px 20px;
  background: color-mix(in srgb, var(--accent) 7%, var(--surface));
  border-bottom: 1px solid color-mix(in srgb, var(--accent) 18%, transparent);
}
.udp-card-head h3 { margin: 0; font-size: 14px; font-weight: 600; color: var(--ink); display: flex; align-items: center; gap: 10px; }
.udp-card-head h3 svg { width: 16px; height: 16px; color: var(--ink-soft); }
.udp-card-meta { font-size: 12px; color: var(--ink-soft); }
.udp-card-body { padding: 20px; }
.udp-card-body.is-nopad { padding: 0; }

.udp-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
@media (max-width: 760px) { .udp-two-col { grid-template-columns: 1fr; } }

.udp-cri-row {
  display: grid; grid-template-columns: 1fr auto auto; gap: 16px; align-items: center;
  padding: 14px 20px; border-bottom: 1px solid var(--line-soft);
}
.udp-cri-row:last-child { border-bottom: 0; }
.udp-cri-row:hover { background: var(--bg-soft); }
.udp-cri-info { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.udp-cri-name { font-size: 13.5px; font-weight: 600; color: var(--ink); }
.udp-cri-scope { font-size: 11px; color: var(--ink-faint); font-family: var(--font-mono); text-transform: uppercase; letter-spacing: 0.05em; }
.udp-cri-barcell { width: 140px; }
.udp-cri-bar { height: 6px; background: var(--line); border-radius: 999px; overflow: hidden; }
.udp-cri-fill { height: 100%; border-radius: 999px;
  background: linear-gradient(90deg, var(--accent) 0%, var(--success) 100%);
}
.udp-cri-score { display: flex; flex-direction: column; text-align: right; gap: 2px; min-width: 80px; }
.udp-cri-points { font-size: 14px; font-weight: 700; color: var(--ink); font-variant-numeric: tabular-nums; }
.udp-cri-weight { font-size: 11px; color: var(--ink-faint); font-family: var(--font-mono); }

.udp-empty-ok {
  padding: 22px;
  background: color-mix(in srgb, var(--accent) 8%, var(--surface));
  border: 1px solid color-mix(in srgb, var(--accent) 22%, transparent);
  border-radius: var(--radius-lg);
  color: var(--accent-ink); font-size: 13px; text-align: center; font-weight: 500;
}

.udp-team-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; padding: 18px; }
.udp-team-card {
  background: var(--bg-soft); border: 1px solid var(--line);
  border-radius: var(--radius-lg); padding: 12px;
  display: flex; align-items: center; gap: 12px;
  cursor: pointer; transition: border-color .12s ease, box-shadow .12s ease, transform .12s ease;
}
.udp-team-card:hover { border-color: var(--accent); box-shadow: var(--shadow-md); transform: translateY(-1px); }
.udp-team-avatar {
  width: 38px; height: 38px; border-radius: 10px;
  background: linear-gradient(135deg, var(--accent) 0%, var(--success) 100%);
  color: #fff; font-size: 12.5px; font-weight: 600;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.udp-team-info { flex: 1; min-width: 0; }
.udp-team-name { font-size: 13px; font-weight: 600; color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.udp-team-role { font-size: 11px; color: var(--ink-faint); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.udp-team-score { font-size: 16px; font-weight: 700; color: var(--accent); font-variant-numeric: tabular-nums; }

.udp-timeline { display: flex; flex-direction: column; }
.udp-tl-item { display: grid; grid-template-columns: 100px 1fr; gap: 16px; padding: 14px 20px; border-bottom: 1px solid var(--line-soft); }
.udp-tl-item:last-child { border-bottom: 0; }
.udp-tl-date { font-size: 11px; color: var(--ink-faint); font-family: var(--font-mono); text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600; }
.udp-tl-content { display: flex; flex-direction: column; gap: 4px; align-items: flex-start; }
.udp-tl-title { font-size: 13.5px; font-weight: 600; color: var(--ink); }
.udp-tl-detail { font-size: 12px; color: var(--ink-soft); }
.udp-tl-pill {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 600;
  background: var(--accent-mute); color: var(--accent-ink); margin-top: 2px;
}

.udp-kv { display: flex; flex-direction: column; }
.udp-kv-row { display: grid; grid-template-columns: 1fr 1.4fr; gap: 16px; padding: 12px 0; border-bottom: 1px dashed var(--line); font-size: 13.5px; }
.udp-kv-row:last-child { border-bottom: 0; }
.udp-kv-k { color: var(--ink-soft); font-size: 12.5px; }
.udp-kv-v { color: var(--ink); font-weight: 500; }
.udp-kv-v.is-mono { font-family: var(--font-mono); font-size: 12.5px; font-weight: 400; }

@media (max-width: 600px) {
  .udp-content { padding: 16px; }
  .udp-side { padding: 22px 18px; }
}
`
