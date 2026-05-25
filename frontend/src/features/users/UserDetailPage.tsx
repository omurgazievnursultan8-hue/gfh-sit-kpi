import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { DASHBOARD_CSS } from '../dashboard/dashboardStyles'
import { usersApi, type User } from './usersApi'
import { orgApi, type OrgUnit } from '../org/orgApi'
import { initials } from './components/usersMeta'

function flattenUnits(roots: OrgUnit[]): OrgUnit[] {
  const out: OrgUnit[] = []
  const walk = (u: OrgUnit) => { out.push(u); u.children?.forEach(walk) }
  roots.forEach(walk)
  return out
}

type TabKey = 'criteria' | 'team' | 'periods' | 'info'

interface CriterionRow { name: string; scope: 'GLOBAL' | 'DEPARTMENT' | 'UNIT'; score: number; weight: number }
interface TeamMember   { name: string; role: string; score: number }
interface PeriodRow    { date: string; title: string; detail: string; closed: boolean }

const MOCK_CRITERIA: CriterionRow[] = [
  { name: 'Качество анализа',         scope: 'GLOBAL',     score: 85, weight: 30 },
  { name: 'Надёжность работы',        scope: 'GLOBAL',     score: 80, weight: 30 },
  { name: 'Лидерство и управление',   scope: 'DEPARTMENT', score: 72, weight: 20 },
  { name: 'Профессиональное развитие', scope: 'UNIT',      score: 74, weight: 20 },
]

const MOCK_TEAM: TeamMember[] = [
  { name: 'Алена Кульбаева',          role: 'Аналитик данных',     score: 88 },
  { name: 'Нурай Исаева',             role: 'Старший аналитик',    score: 91 },
  { name: 'Темиркан Туруспекбаев',    role: 'Аналитик',            score: 79 },
  { name: 'Молдира Сулейменова',      role: 'Аналитик BI',         score: 85 },
  { name: 'Роман Аниканов',           role: 'Инженер данных',      score: 82 },
  { name: 'Дарья Литвинова',          role: 'Аналитик данных',     score: 86 },
]

const MOCK_PERIODS: PeriodRow[] = [
  { date: '31.12.2024', title: 'ANNUAL 2024',        detail: 'Годовая оценка завершена · Рейтинг 82/100',    closed: true },
  { date: '31.12.2024', title: 'QUARTERLY Q4/2024',  detail: 'Квартальная оценка · Рейтинг 85/100',           closed: true },
  { date: '30.06.2024', title: 'SEMI_ANNUAL H1/2024',detail: 'Полугодовая оценка · Рейтинг 79/100',           closed: true },
  { date: '31.12.2023', title: 'ANNUAL 2023',        detail: 'Годовая оценка · Рейтинг 74/100',               closed: true },
]

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
  const { id } = useParams<{ id: string }>()
  const [user, setUser] = useState<User | null>(null)
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [units, setUnits] = useState<OrgUnit[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [tab, setTab] = useState<TabKey>('criteria')
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadErr, setUploadErr] = useState<string | null>(null)

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
    Promise.all([usersApi.list(0, 500), orgApi.getStructure().catch(() => [])])
      .then(([r, u]) => {
        if (cancel) return
        setAllUsers(r.content)
        setUnits(flattenUnits(u as OrgUnit[]))
        setUser(r.content.find(u2 => String(u2.id) === id) ?? null)
      })
      .catch(() => { if (!cancel) setFailed(true) })
      .finally(() => { if (!cancel) setLoading(false) })
    return () => { cancel = true }
  }, [id])

  const managerName = useMemo(() => {
    if (!user?.managerId) return null
    return allUsers.find(u => u.id === user.managerId)?.fullName ?? null
  }, [user, allUsers])

  const unitName = useMemo(() => {
    if (!user?.unitId) return null
    return units.find(u => u.id === user.unitId)?.nameRu ?? null
  }, [user, units])

  const rating = useMemo(() => {
    if (!user) return 0
    return Math.round(MOCK_CRITERIA.reduce((s, c) => s + (c.score * c.weight) / 100, 0))
  }, [user])

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
                    <span className="udp-presence" aria-hidden />
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/png,image/jpeg" hidden onChange={onAvatarPick} />
                  {uploadErr && <div className="udp-state udp-state--err" style={{ marginTop: 6 }}>{uploadErr}</div>}
                  <div className="udp-name-block">
                    <div className="udp-name">{user.fullName}</div>
                    <div className="udp-position">{user.position ?? '— должность не указана —'}</div>
                  </div>
                  <div className="udp-role-row">
                    <span className="udp-role-badge">{user.role}</span>
                    <button type="button" className="udp-edit-icon" aria-label="Редактировать профиль" title="Редактировать">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="udp-quick-stats">
                  <QuickStat value={rating} label="KPI" />
                  <QuickStat value={MOCK_TEAM.length} label="В команде" />
                  <QuickStat value={0} label="Штрафов" />
                </div>

                <div className="udp-contact-list">
                  <Contact icon={<EnvelopeIcon />} label="Email"          value={user.email} />
                  {user.phone && <Contact icon={<PhoneIcon />} label="Телефон" value={user.phone} />}
                  {user.employeeNumber && <Contact icon={<IdIcon />} label="Табельный №" value={user.employeeNumber} />}
                  <Contact icon={<BuildingIcon />} label="Подразделение"  value={unitName ?? (user.unitId != null ? `№${user.unitId}` : '—')} />
                  <Contact icon={<CalendarIcon />} label="В компании с"   value={`${formatRuDate(user.hireDate ?? user.createdAt)}${yearsSince(user.hireDate ?? user.createdAt)}`} />
                  {user.terminationDate && <Contact icon={<CalendarIcon />} label="Уволен" value={formatRuDate(user.terminationDate)} />}
                  <Contact icon={<ClockIcon />}    label="Часовой пояс"   value="Asia/Bishkek (UTC+6)" />
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
                    <div className="udp-hero-number">{rating}</div>
                    <div className="udp-hero-max">/ 100</div>
                  </div>
                  <div className="udp-hero-info">
                    <div className="udp-hero-title">Итоговый рейтинг</div>
                    <div className="udp-hero-headline">{ratingHeadline(rating)}</div>
                    <div className="udp-hero-period">
                      <CalendarIcon />
                      ANNUAL 2024 · Закрыт
                    </div>
                  </div>
                  <div className="udp-hero-trend">
                    <div className="udp-hero-trend-value">↑ +8</div>
                    <div className="udp-hero-trend-label">vs ANNUAL 2023</div>
                  </div>
                </div>

                {/* Tabs */}
                <div className="udp-tabs" role="tablist">
                  <TabBtn active={tab === 'criteria'} onClick={() => setTab('criteria')} icon={<ChartIcon />}>
                    Критерии оценки
                  </TabBtn>
                  <TabBtn active={tab === 'team'} onClick={() => setTab('team')} icon={<UsersIcon />}>
                    Команда ({MOCK_TEAM.length})
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
                    <Card title="Положительные критерии (вес 100%)" meta={`${MOCK_CRITERIA.length} критерия`} icon={<CheckIcon />} noPad>
                      {MOCK_CRITERIA.map(c => (
                        <div className="udp-cri-row" key={c.name}>
                          <div className="udp-cri-info">
                            <div className="udp-cri-name">{c.name}</div>
                            <div className="udp-cri-scope">{c.scope}</div>
                          </div>
                          <div className="udp-cri-barcell">
                            <div className="udp-cri-bar">
                              <div className="udp-cri-fill" style={{ width: `${c.score}%` }} />
                            </div>
                          </div>
                          <div className="udp-cri-score">
                            <div className="udp-cri-points">+{((c.score * c.weight) / 100).toFixed(1)}</div>
                            <div className="udp-cri-weight">{c.score} × {c.weight}%</div>
                          </div>
                        </div>
                      ))}
                    </Card>
                    <Card title="Антибонусы (штрафы)" meta={<span style={{ color: 'var(--accent)', fontWeight: 600 }}>0 нарушений</span>} icon={<AlertIcon />}>
                      <div className="udp-empty-ok">
                        ✓ За весь период ANNUAL 2024 нарушений не выявлено
                      </div>
                    </Card>
                  </>
                )}

                {tab === 'team' && (
                  <Card title="Прямые подчинённые" meta={`${MOCK_TEAM.length} сотрудников`} icon={<UsersIcon />} noPad>
                    <div className="udp-team-grid">
                      {MOCK_TEAM.map(m => (
                        <div className="udp-team-card" key={m.name}>
                          <span className="udp-team-avatar">{initials(m.name)}</span>
                          <div className="udp-team-info">
                            <div className="udp-team-name">{m.name}</div>
                            <div className="udp-team-role">{m.role}</div>
                          </div>
                          <div className="udp-team-score">{m.score}</div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {tab === 'periods' && (
                  <Card title="История периодов оценки" icon={<CalendarIcon />} noPad>
                    <div className="udp-timeline">
                      {MOCK_PERIODS.map(p => (
                        <div className="udp-tl-item" key={p.title}>
                          <div className="udp-tl-date">{p.date}</div>
                          <div className="udp-tl-content">
                            <div className="udp-tl-title">{p.title}</div>
                            <div className="udp-tl-detail">{p.detail}</div>
                            <div className="udp-tl-pill">Закрыт ✓</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {tab === 'info' && (
                  <div className="udp-two-col">
                    <Card title="Документы" icon={<DocIcon />}>
                      <div className="udp-kv">
                        <KVRow k="Трудовой договор"        v="contract.pdf" mono />
                        <KVRow k="Должностная инструкция"  v="ji.pdf"       mono />
                        <KVRow k="Соглашение о НДА"        v="nda.pdf"      mono />
                      </div>
                    </Card>
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
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
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
.udp-edit-icon {
  display: inline-flex; align-items: center; justify-content: center;
  width: 30px; height: 30px; border-radius: 8px; cursor: pointer;
  background: var(--surface); color: var(--ink-soft);
  border: 1px solid var(--line);
  transition: background .12s ease, color .12s ease, border-color .12s ease;
}
.udp-edit-icon svg { width: 14px; height: 14px; }
.udp-edit-icon:hover { background: var(--accent); color: #fff; border-color: var(--accent-ink); }

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
