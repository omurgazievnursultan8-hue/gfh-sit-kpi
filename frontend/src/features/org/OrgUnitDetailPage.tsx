import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { DASHBOARD_CSS } from '../dashboard/dashboardStyles'
import { orgApi, type OrgUnit } from './orgApi'
import { usersApi, type User } from '../users/usersApi'
import { positionsApi, type Position } from '../positions/positionsApi'
import { initials } from '../users/components/usersMeta'
import type { RootState } from '../../app/store'

type TabKey = 'members' | 'children' | 'positions' | 'info'

const TYPE_LABEL: Record<OrgUnit['type'], string> = {
  BLOCK: 'Блок',
  DEPARTMENT: 'Департамент',
  SLUZHBA: 'Служба',
  OTDEL: 'Отдел',
  SEKTOR: 'Сектор',
}

const TYPE_VISUAL: Record<OrgUnit['type'], { fg: string; bg: string; border: string }> = {
  BLOCK:      { fg: '#9c7416', bg: 'rgba(200,150,40,0.14)',  border: 'rgba(200,150,40,0.32)' },
  DEPARTMENT: { fg: '#2c6ea4', bg: 'rgba(80,140,200,0.14)',  border: 'rgba(80,140,200,0.32)' },
  SLUZHBA:    { fg: '#5e4ec2', bg: 'rgba(120,100,220,0.14)', border: 'rgba(120,100,220,0.32)' },
  OTDEL:      { fg: '#2f9e6d', bg: 'rgba(120,200,150,0.14)', border: 'rgba(120,200,150,0.32)' },
  SEKTOR:     { fg: '#a04ea0', bg: 'rgba(180,100,180,0.14)', border: 'rgba(180,100,180,0.32)' },
}

function findById(nodes: OrgUnit[], id: number): OrgUnit | null {
  for (const n of nodes) {
    if (n.id === id) return n
    if (n.children?.length) {
      const f = findById(n.children, id)
      if (f) return f
    }
  }
  return null
}

function findPath(nodes: OrgUnit[], id: number, path: OrgUnit[] = []): OrgUnit[] | null {
  for (const n of nodes) {
    const next = [...path, n]
    if (n.id === id) return next
    if (n.children?.length) {
      const sub = findPath(n.children, id, next)
      if (sub) return sub
    }
  }
  return null
}

function formatRuDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function OrgUnitDetailPage() {
  const { id } = useParams<{ id: string }>()
  const role = useSelector((s: RootState) => s.auth.role)
  const isAdmin = role === 'ADMIN'

  const [tree, setTree] = useState<OrgUnit[]>([])
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [tab, setTab] = useState<TabKey>('members')

  const [positions, setPositions] = useState<Position[]>([])
  const [newPosRu, setNewPosRu] = useState('')
  const [newPosKg, setNewPosKg] = useState('')
  const [posBusy, setPosBusy] = useState(false)
  const [posErr, setPosErr] = useState('')

  useEffect(() => {
    let cancel = false
    setLoading(true); setFailed(false)
    Promise.all([orgApi.getStructure(), usersApi.list(0, 500)])
      .then(([t, u]) => {
        if (cancel) return
        setTree(t)
        setAllUsers(u.content)
      })
      .catch(() => { if (!cancel) setFailed(true) })
      .finally(() => { if (!cancel) setLoading(false) })
    return () => { cancel = true }
  }, [id])

  const unitId = Number(id)
  const unit = useMemo(() => Number.isFinite(unitId) ? findById(tree, unitId) : null, [tree, unitId])

  useEffect(() => {
    if (!unit) { setPositions([]); return }
    positionsApi.listByUnit(unit.id, false)
      .then(setPositions)
      .catch(() => setPositions([]))
  }, [unit])

  const reloadPositions = async () => {
    if (!unit) return
    try { setPositions(await positionsApi.listByUnit(unit.id, false)) } catch { /* ignore */ }
  }

  const addPosition = async () => {
    if (!unit) return
    if (!newPosRu.trim() || !newPosKg.trim()) { setPosErr('Укажите название на двух языках'); return }
    setPosBusy(true); setPosErr('')
    try {
      await positionsApi.create({
        nameRu: newPosRu.trim(),
        nameKg: newPosKg.trim(),
        unitId: unit.id,
        displayOrder: positions.length * 10,
        isActive: true,
      })
      setNewPosRu(''); setNewPosKg('')
      await reloadPositions()
    } catch (e: any) {
      setPosErr(e?.response?.data?.message_ru ?? 'Ошибка при создании')
    } finally { setPosBusy(false) }
  }

  const removePosition = async (pid: number) => {
    setPosErr('')
    try { await positionsApi.remove(pid); await reloadPositions() }
    catch (e: any) { setPosErr(e?.response?.data?.message_ru ?? 'Ошибка при удалении') }
  }

  const togglePosition = async (p: Position) => {
    setPosErr('')
    try {
      await positionsApi.update(p.id, {
        nameRu: p.nameRu, nameKg: p.nameKg, unitId: p.unitId,
        code: p.code, displayOrder: p.displayOrder, isActive: !p.isActive,
      })
      await reloadPositions()
    } catch (e: any) { setPosErr(e?.response?.data?.message_ru ?? 'Ошибка') }
  }
  const path = useMemo(() => unit ? (findPath(tree, unit.id) ?? []) : [], [tree, unit])
  const parent = path.length > 1 ? path[path.length - 2] : null

  const head = useMemo(
    () => unit?.headUserId ? allUsers.find(u => u.id === unit.headUserId) ?? null : null,
    [unit, allUsers]
  )

  const members = useMemo(
    () => unit ? allUsers.filter(u => u.unitId === unit.id && u.isActive) : [],
    [unit, allUsers]
  )

  return (
    <div className="dv3-root">
      <style>{DASHBOARD_CSS}</style>
      <style>{PAGE_CSS}</style>
      <div className="dv3-terminal">
        <div className="oud-shell">
          {loading && <div className="oud-state">Загрузка…</div>}
          {failed && !loading && <div className="oud-state oud-state--err">Не удалось загрузить подразделение</div>}
          {!loading && !failed && !unit && <div className="oud-state">Подразделение не найдено</div>}

          {unit && !loading && (
            <div className="oud-layout">
              {/* LEFT */}
              <aside className="oud-side">
                <div className="oud-id">
                  <div
                    className={`oud-mark ${unit.archivedAt ? 'is-off' : ''}`}
                    style={{
                      background: TYPE_VISUAL[unit.type].bg,
                      color: TYPE_VISUAL[unit.type].fg,
                      border: `2px solid ${TYPE_VISUAL[unit.type].border}`,
                    }}
                  >
                    {(unit.code ?? unit.nameRu).slice(0, 3).toUpperCase()}
                  </div>
                  <div className="oud-name-block">
                    <div className="oud-name">{unit.nameRu}</div>
                    {unit.nameKg && unit.nameKg !== unit.nameRu && (
                      <div className="oud-name-kg">{unit.nameKg}</div>
                    )}
                  </div>
                  <div className="oud-role-row">
                    <span
                      className="oud-type-badge"
                      style={{
                        background: TYPE_VISUAL[unit.type].bg,
                        color: TYPE_VISUAL[unit.type].fg,
                        borderColor: TYPE_VISUAL[unit.type].border,
                      }}
                    >
                      {TYPE_LABEL[unit.type]}
                    </span>
                    {unit.archivedAt && <span className="oud-arch-badge">архив</span>}
                  </div>
                </div>

                <div className="oud-quick-stats">
                  <QuickStat value={unit.headcountDirect} label="Прямо" />
                  <QuickStat value={unit.headcountTotal}  label="Всего" />
                  <QuickStat value={unit.children?.length ?? 0} label="Дочерних" />
                </div>

                <div className="oud-contact-list">
                  {unit.code && <Contact icon={<IdIcon />} label="Код" value={unit.code} />}
                  {unit.nameRuShort && <Contact icon={<TagIcon />} label="Сокр. (рус)" value={unit.nameRuShort} />}
                  {unit.nameKgShort && <Contact icon={<TagIcon />} label="Сокр. (кыр)" value={unit.nameKgShort} />}
                  <Contact icon={<HashIcon />} label="Порядок"  value={String(unit.displayOrder ?? 0)} />
                  <Contact icon={<BuildingIcon />} label="Родитель" value={parent?.nameRu ?? 'корневой узел'} />
                  {unit.archivedAt && (
                    <Contact icon={<ArchiveIcon />} label="Архивирован" value={formatRuDate(unit.archivedAt)} />
                  )}
                </div>

                <div>
                  <div className="oud-eyebrow">Руководитель</div>
                  {head ? (
                    <Link to={`/admin/users/${head.id}`} className="oud-manager">
                      <span className="oud-manager-avatar">{initials(head.fullName)}</span>
                      <div className="oud-manager-info">
                        <div className="oud-manager-label">HEAD</div>
                        <div className="oud-manager-name">{head.fullName}</div>
                        {head.position && <div className="oud-manager-pos">{head.position}</div>}
                      </div>
                    </Link>
                  ) : (
                    <div className="oud-manager oud-manager--vacant">
                      <span className="oud-manager-avatar oud-manager-avatar--vacant">—</span>
                      <div className="oud-manager-info">
                        <div className="oud-manager-label">HEAD</div>
                        <div className="oud-manager-name">Не назначен</div>
                      </div>
                    </div>
                  )}
                </div>
              </aside>

              {/* RIGHT */}
              <div className="oud-content">
                {/* Hero */}
                <div className="oud-hero">
                  <div className="oud-hero-bg" aria-hidden />
                  <div className="oud-hero-circle">
                    <div className="oud-hero-number">{unit.headcountTotal}</div>
                    <div className="oud-hero-max">человек</div>
                  </div>
                  <div className="oud-hero-info">
                    <div className="oud-hero-title">{TYPE_LABEL[unit.type]} · {unit.code ?? `#${unit.id}`}</div>
                    <div className="oud-hero-headline">{unit.nameRu}</div>
                    {path.length > 1 && (
                      <div className="oud-crumbs">
                        {path.slice(0, -1).map((p, i) => (
                          <span key={p.id} className="oud-crumb">
                            <Link to={`/admin/org/${p.id}`} className="oud-crumb-link">{p.nameRu}</Link>
                            {i < path.length - 2 && <span className="oud-crumb-sep">/</span>}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="oud-hero-trend">
                    <div className="oud-hero-trend-value">{unit.headcountDirect}</div>
                    <div className="oud-hero-trend-label">прямо</div>
                  </div>
                </div>

                {/* Tabs */}
                <div className="oud-tabs" role="tablist">
                  <TabBtn active={tab === 'members'} onClick={() => setTab('members')} icon={<UsersIcon />}>
                    Сотрудники ({members.length})
                  </TabBtn>
                  <TabBtn active={tab === 'children'} onClick={() => setTab('children')} icon={<NetworkIcon />}>
                    Дочерние ({unit.children?.length ?? 0})
                  </TabBtn>
                  <TabBtn active={tab === 'positions'} onClick={() => setTab('positions')} icon={<BriefcaseIcon />}>
                    Должности ({positions.length})
                  </TabBtn>
                  <TabBtn active={tab === 'info'} onClick={() => setTab('info')} icon={<DocIcon />}>
                    Информация
                  </TabBtn>
                </div>

                {tab === 'members' && (
                  <Card title="Сотрудники подразделения" meta={`${members.length} активных`} icon={<UsersIcon />} noPad>
                    {members.length === 0 ? (
                      <div className="oud-empty">— В подразделении нет активных сотрудников —</div>
                    ) : (
                      <div className="oud-team-grid">
                        {members.map(m => (
                          <Link to={`/admin/users/${m.id}`} key={m.id} className="oud-team-card">
                            <span
                              className="oud-team-avatar"
                              style={m.avatarUrl ? {
                                backgroundImage: `url(${m.avatarUrl})`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                color: 'transparent',
                              } : undefined}
                            >
                              {m.avatarUrl ? '' : initials(m.fullName)}
                            </span>
                            <div className="oud-team-info">
                              <div className="oud-team-name">{m.fullName}</div>
                              <div className="oud-team-role">{m.position ?? m.role}</div>
                            </div>
                            {head?.id === m.id && <span className="oud-team-tag">HEAD</span>}
                          </Link>
                        ))}
                      </div>
                    )}
                  </Card>
                )}

                {tab === 'children' && (
                  <Card title="Дочерние подразделения" meta={`${unit.children?.length ?? 0} ед.`} icon={<NetworkIcon />} noPad>
                    {(unit.children?.length ?? 0) === 0 ? (
                      <div className="oud-empty">— Нет дочерних подразделений —</div>
                    ) : (
                      <div className="oud-children">
                        {[...unit.children]
                          .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0) || a.nameRu.localeCompare(b.nameRu))
                          .map(c => (
                            <Link to={`/admin/org/${c.id}`} key={c.id} className="oud-child-row">
                              <span
                                className="oud-child-rail"
                                style={{ background: TYPE_VISUAL[c.type].border }}
                              />
                              <div className="oud-child-main">
                                <div className="oud-child-name">{c.nameRu}</div>
                                <div className="oud-child-meta">
                                  <span
                                    className="oud-type-badge oud-type-badge--sm"
                                    style={{
                                      background: TYPE_VISUAL[c.type].bg,
                                      color: TYPE_VISUAL[c.type].fg,
                                      borderColor: TYPE_VISUAL[c.type].border,
                                    }}
                                  >
                                    {TYPE_LABEL[c.type]}
                                  </span>
                                  {c.code && <span className="oud-child-code">{c.code}</span>}
                                </div>
                              </div>
                              <div className="oud-child-counts">
                                <div className="oud-child-count">
                                  <span className="oud-child-count-v">{c.headcountTotal}</span>
                                  <span className="oud-child-count-l">чел.</span>
                                </div>
                                <div className="oud-child-count">
                                  <span className="oud-child-count-v">{c.children?.length ?? 0}</span>
                                  <span className="oud-child-count-l">подразд.</span>
                                </div>
                              </div>
                            </Link>
                          ))}
                      </div>
                    )}
                  </Card>
                )}

                {tab === 'positions' && (
                  <Card title="Должности подразделения" meta={`${positions.length} ед.`} icon={<BriefcaseIcon />} noPad>
                    <div className="oud-pos-body">
                      {positions.length === 0 ? (
                        <div className="oud-empty">— Должности не добавлены —</div>
                      ) : (
                        <div className="oud-pos-list">
                          {positions.map(p => (
                            <div key={p.id} className={`oud-pos-row ${!p.isActive ? 'is-off' : ''}`}>
                              <div className="oud-pos-names">
                                <div className="oud-pos-name">{p.nameRu}</div>
                                {p.nameKg && p.nameKg !== p.nameRu && (
                                  <div className="oud-pos-name-kg">{p.nameKg}</div>
                                )}
                              </div>
                              <div className="oud-pos-status">
                                <span className={`oud-pos-pill ${p.isActive ? 'is-on' : 'is-off'}`}>
                                  {p.isActive ? 'активна' : 'неактивна'}
                                </span>
                              </div>
                              {isAdmin && (
                                <div className="oud-pos-actions">
                                  <button type="button" className="oud-pos-btn" onClick={() => togglePosition(p)}>
                                    {p.isActive ? 'Выкл.' : 'Вкл.'}
                                  </button>
                                  <button type="button" className="oud-pos-btn oud-pos-btn--del" onClick={() => removePosition(p.id)}>
                                    Удалить
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {isAdmin && (
                        <div className="oud-pos-add">
                          <input
                            className="oud-pos-input"
                            placeholder="Название (рус)"
                            value={newPosRu}
                            onChange={e => setNewPosRu(e.target.value)}
                          />
                          <input
                            className="oud-pos-input"
                            placeholder="Название (кыр)"
                            value={newPosKg}
                            onChange={e => setNewPosKg(e.target.value)}
                          />
                          <button
                            type="button"
                            className="oud-pos-add-btn"
                            onClick={addPosition}
                            disabled={posBusy}
                          >
                            + Добавить
                          </button>
                        </div>
                      )}
                      {posErr && <div className="oud-pos-error">{posErr}</div>}
                    </div>
                  </Card>
                )}

                {tab === 'info' && (
                  <div className="oud-two-col">
                    <Card title="Системная информация" icon={<GearIcon />}>
                      <div className="oud-kv">
                        <KVRow k="ID"             v={`ORG-${String(unit.id).padStart(5, '0')}`} mono />
                        <KVRow k="Тип"            v={TYPE_LABEL[unit.type]} />
                        <KVRow k="Код"            v={unit.code ?? '—'} mono />
                        <KVRow k="Порядок"        v={String(unit.displayOrder ?? 0)} mono />
                        <KVRow k="Родитель ID"    v={unit.parentId == null ? '—' : String(unit.parentId)} mono />
                        <KVRow k="Состояние"      v={unit.archivedAt ? 'Архив' : 'Активно'} />
                        {unit.archivedAt && <KVRow k="Архивирован"  v={formatRuDate(unit.archivedAt)} />}
                      </div>
                    </Card>
                    <Card title="Названия" icon={<DocIcon />}>
                      <div className="oud-kv">
                        <KVRow k="Название (рус)" v={unit.nameRu} />
                        <KVRow k="Название (кыр)" v={unit.nameKg ?? '—'} />
                        <KVRow k="Сокр. (рус)"    v={unit.nameRuShort ?? '—'} />
                        <KVRow k="Сокр. (кыр)"    v={unit.nameKgShort ?? '—'} />
                      </div>
                    </Card>
                  </div>
                )}

                {isAdmin && (
                  <div className="oud-actions">
                    <Link to="/admin/org" className="oud-act-btn">← К структуре</Link>
                    <Link to={`/admin/org?unit=${unit.id}&view=canvas`} className="oud-act-btn">Граф</Link>
                    <Link to={`/admin/audit?entityType=ORG_UNIT&entityId=${unit.id}`} className="oud-act-btn">История</Link>
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

/* ─── subcomponents ─────────────────────────────────────────────────────── */

function QuickStat({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="oud-qs">
      <div className="oud-qs-value">{value}</div>
      <div className="oud-qs-label">{label}</div>
    </div>
  )
}

function Contact({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="oud-contact">
      <span className="oud-contact-icon">{icon}</span>
      <div className="oud-contact-info">
        <div className="oud-contact-label">{label}</div>
        <div className="oud-contact-value">{value}</div>
      </div>
    </div>
  )
}

function Card({ title, meta, icon, noPad, children }: {
  title: string; meta?: ReactNode; icon?: ReactNode; noPad?: boolean; children: ReactNode
}) {
  return (
    <div className="oud-card">
      <div className="oud-card-head">
        <h3>{icon}{title}</h3>
        {meta != null && <span className="oud-card-meta">{meta}</span>}
      </div>
      <div className={`oud-card-body${noPad ? ' is-nopad' : ''}`}>{children}</div>
    </div>
  )
}

function TabBtn({ active, onClick, icon, children }: {
  active: boolean; onClick: () => void; icon: ReactNode; children: ReactNode
}) {
  return (
    <button type="button" role="tab" aria-selected={active} className={`oud-tab${active ? ' is-active' : ''}`} onClick={onClick}>
      {icon}{children}
    </button>
  )
}

function KVRow({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="oud-kv-row">
      <div className="oud-kv-k">{k}</div>
      <div className={`oud-kv-v${mono ? ' is-mono' : ''}`}>{v}</div>
    </div>
  )
}

/* ─── icons ─────────────────────────────────────────────────────────────── */

const svgCommon = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
function BuildingIcon() { return <svg {...svgCommon}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> }
function IdIcon()       { return <svg {...svgCommon}><rect x="2" y="4" width="20" height="16" rx="2"/><circle cx="9" cy="12" r="2.5"/><line x1="14" y1="10" x2="19" y2="10"/><line x1="14" y1="14" x2="17" y2="14"/></svg> }
function TagIcon()      { return <svg {...svgCommon}><path d="M20.59 13.41 13.42 20.59a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg> }
function HashIcon()     { return <svg {...svgCommon}><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg> }
function ArchiveIcon()  { return <svg {...svgCommon}><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg> }
function UsersIcon()    { return <svg {...svgCommon}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> }
function NetworkIcon()  { return <svg {...svgCommon}><circle cx="12" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/><path d="M12 7v4M12 11l-7 6M12 11l7 6"/></svg> }
function DocIcon()      { return <svg {...svgCommon}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> }
function GearIcon()     { return <svg {...svgCommon}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6h.09A1.65 1.65 0 0 0 10 3.09V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> }
function BriefcaseIcon(){ return <svg {...svgCommon}><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg> }

/* ─── styles ────────────────────────────────────────────────────────────── */

const PAGE_CSS = `
.oud-shell { padding: 0; background: var(--bg-soft); min-height: 100%; }
.oud-state { padding: 60px 28px; text-align: center; color: var(--ink-soft); font-size: 14px; }
.oud-state--err { color: var(--danger); }

.oud-layout { display: grid; grid-template-columns: 360px 1fr; min-height: calc(100% - 60px); }
@media (max-width: 1100px) { .oud-layout { grid-template-columns: 1fr; } }

.oud-side {
  background: var(--surface);
  border-right: 1px solid var(--line);
  padding: 32px 26px;
  display: flex; flex-direction: column; gap: 24px;
}
@media (max-width: 1100px) { .oud-side { border-right: 0; border-bottom: 1px solid var(--line); } }

.oud-id {
  display: flex; flex-direction: column; align-items: center; text-align: center;
  gap: 14px; padding-bottom: 22px; border-bottom: 1px solid var(--line-soft);
}
.oud-mark {
  width: 116px; height: 116px; border-radius: 24px;
  display: flex; align-items: center; justify-content: center;
  font-size: 30px; font-weight: 700; font-family: var(--font-mono);
  letter-spacing: 0.06em;
}
.oud-mark.is-off { filter: grayscale(0.7); opacity: 0.6; }
.oud-name-block { display: flex; flex-direction: column; gap: 4px; }
.oud-name { font-size: 21px; font-weight: 700; color: var(--ink); line-height: 1.2; }
.oud-name-kg { font-size: 13px; color: var(--ink-soft); }
.oud-role-row { display: inline-flex; align-items: center; gap: 8px; flex-wrap: wrap; justify-content: center; }
.oud-type-badge {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 5px 12px; border-radius: 999px;
  font-size: 11px; font-family: var(--font-mono); font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.06em;
  border: 1px solid transparent;
}
.oud-type-badge--sm { padding: 2px 8px; font-size: 10px; }
.oud-arch-badge {
  padding: 4px 10px; border-radius: 999px; font-size: 10.5px;
  font-family: var(--font-mono); text-transform: uppercase; letter-spacing: 0.06em;
  background: var(--warn-mute, rgba(200,150,40,0.14));
  color: var(--warn, #9c7416);
  border: 1px solid rgba(200,150,40,0.32);
  font-weight: 600;
}

.oud-quick-stats {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;
  padding-bottom: 22px; border-bottom: 1px solid var(--line-soft);
}
.oud-qs { text-align: center; padding: 12px 4px; border-radius: var(--radius-lg); background: var(--bg-soft); border: 1px solid var(--line); }
.oud-qs-value { font-size: 22px; font-weight: 700; color: var(--accent); font-variant-numeric: tabular-nums; letter-spacing: -0.01em; }
.oud-qs-label { font-size: 10px; color: var(--ink-faint); font-family: var(--font-mono); text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600; margin-top: 4px; }

.oud-contact-list { display: flex; flex-direction: column; gap: 14px; padding-bottom: 22px; border-bottom: 1px solid var(--line-soft); }
.oud-contact { display: flex; align-items: center; gap: 12px; }
.oud-contact-icon { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; background: var(--accent-mute); color: var(--accent); flex-shrink: 0; }
.oud-contact-icon svg { width: 16px; height: 16px; }
.oud-contact-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.oud-contact-label { font-size: 11px; color: var(--ink-faint); font-family: var(--font-mono); text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600; }
.oud-contact-value { font-size: 13px; color: var(--ink); font-weight: 600; word-break: break-word; }

.oud-eyebrow { font-size: 11px; color: var(--ink-faint); font-family: var(--font-mono); text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600; margin-bottom: 8px; }
.oud-manager {
  display: flex; align-items: center; gap: 10px; padding: 12px;
  border-radius: var(--radius-lg);
  background: color-mix(in srgb, var(--accent) 6%, var(--surface));
  border: 1px solid color-mix(in srgb, var(--accent) 25%, transparent);
  text-decoration: none; color: inherit;
  transition: background .12s ease, transform .12s ease;
}
.oud-manager:hover { background: color-mix(in srgb, var(--accent) 12%, var(--surface)); transform: translateY(-1px); }
.oud-manager--vacant { background: var(--bg-soft); border-color: var(--line); cursor: default; }
.oud-manager--vacant:hover { background: var(--bg-soft); transform: none; }
.oud-manager-avatar {
  width: 36px; height: 36px; border-radius: 50%; color: #fff; font-size: 12px; font-weight: 600;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  background: linear-gradient(135deg, var(--accent) 0%, var(--success) 100%);
}
.oud-manager-avatar--vacant { background: var(--line); color: var(--ink-faint); }
.oud-manager-info { flex: 1; min-width: 0; }
.oud-manager-label { font-size: 10px; color: var(--ink-faint); font-family: var(--font-mono); text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600; }
.oud-manager-name { font-size: 13px; color: var(--ink); font-weight: 600; }
.oud-manager-pos { font-size: 11.5px; color: var(--ink-soft); }

.oud-content { padding: 26px 28px; display: flex; flex-direction: column; gap: 22px; }

.oud-hero {
  position: relative; overflow: hidden;
  background: linear-gradient(135deg, var(--accent) 0%, color-mix(in srgb, var(--accent) 75%, var(--success)) 100%);
  border-radius: var(--radius-xl); padding: 26px; color: #fff;
  display: grid; grid-template-columns: auto 1fr auto; gap: 26px; align-items: center;
  box-shadow: 0 18px 40px -22px color-mix(in srgb, var(--accent) 60%, transparent);
}
.oud-hero-bg { position: absolute; top: -50%; right: -20%; width: 420px; height: 420px; border-radius: 50%; background: radial-gradient(circle, rgba(255,255,255,0.14) 0%, transparent 70%); pointer-events: none; }
.oud-hero-circle { position: relative; z-index: 1; width: 110px; height: 110px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-direction: column; background: rgba(255,255,255,0.15); border: 3px solid rgba(255,255,255,0.3); backdrop-filter: blur(6px); }
.oud-hero-number { font-size: 38px; font-weight: 700; line-height: 1; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
.oud-hero-max { font-size: 11px; opacity: 0.8; margin-top: 4px; font-family: var(--font-mono); text-transform: uppercase; letter-spacing: 0.05em; }
.oud-hero-info { position: relative; z-index: 1; min-width: 0; }
.oud-hero-title { font-size: 12px; opacity: 0.85; font-family: var(--font-mono); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px; }
.oud-hero-headline { font-size: 22px; font-weight: 700; margin-bottom: 8px; letter-spacing: -0.01em; }
.oud-crumbs { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; font-size: 12px; opacity: 0.9; }
.oud-crumb { display: inline-flex; align-items: center; gap: 6px; }
.oud-crumb-link { color: inherit; text-decoration: none; border-bottom: 1px dashed rgba(255,255,255,0.5); }
.oud-crumb-link:hover { border-bottom-color: #fff; }
.oud-crumb-sep { opacity: 0.6; }
.oud-hero-trend { text-align: right; position: relative; z-index: 1; }
.oud-hero-trend-value { font-size: 28px; font-weight: 700; line-height: 1; margin-bottom: 4px; font-variant-numeric: tabular-nums; }
.oud-hero-trend-label { font-size: 12px; opacity: 0.85; }
@media (max-width: 700px) {
  .oud-hero { grid-template-columns: 1fr; text-align: center; }
  .oud-hero-trend { text-align: center; }
}

.oud-tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--line); overflow-x: auto; }
.oud-tab { height: 40px; padding: 0 14px; font-size: 13.5px; font-weight: 500; color: var(--ink-soft); background: transparent; border: 0; border-bottom: 2px solid transparent; border-radius: 8px 8px 0 0; margin-bottom: -1px; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; font-family: inherit; white-space: nowrap; transition: color .1s ease, background .1s ease, border-color .1s ease; }
.oud-tab svg { width: 15px; height: 15px; }
.oud-tab:hover { color: var(--ink); background: color-mix(in srgb, var(--accent) 6%, transparent); }
.oud-tab.is-active { color: var(--ink); background: color-mix(in srgb, var(--accent) 10%, var(--surface)); border-bottom-color: var(--accent); font-weight: 600; }

.oud-card { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius-xl); overflow: hidden; }
.oud-card-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 20px; background: color-mix(in srgb, var(--accent) 7%, var(--surface)); border-bottom: 1px solid color-mix(in srgb, var(--accent) 18%, transparent); }
.oud-card-head h3 { margin: 0; font-size: 14px; font-weight: 600; color: var(--ink); display: flex; align-items: center; gap: 10px; }
.oud-card-head h3 svg { width: 16px; height: 16px; color: var(--ink-soft); }
.oud-card-meta { font-size: 12px; color: var(--ink-soft); }
.oud-card-body { padding: 20px; }
.oud-card-body.is-nopad { padding: 0; }

.oud-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
@media (max-width: 760px) { .oud-two-col { grid-template-columns: 1fr; } }

.oud-empty { padding: 32px; text-align: center; color: var(--ink-faint); font-size: 13px; font-style: italic; }

.oud-team-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; padding: 18px; }
.oud-team-card { position: relative; background: var(--bg-soft); border: 1px solid var(--line); border-radius: var(--radius-lg); padding: 12px; display: flex; align-items: center; gap: 12px; cursor: pointer; text-decoration: none; color: inherit; transition: border-color .12s ease, box-shadow .12s ease, transform .12s ease; }
.oud-team-card:hover { border-color: var(--accent); box-shadow: var(--shadow-md); transform: translateY(-1px); }
.oud-team-avatar { width: 38px; height: 38px; border-radius: 10px; background: linear-gradient(135deg, var(--accent) 0%, var(--success) 100%); color: #fff; font-size: 12.5px; font-weight: 600; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.oud-team-info { flex: 1; min-width: 0; }
.oud-team-name { font-size: 13px; font-weight: 600; color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.oud-team-role { font-size: 11px; color: var(--ink-faint); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.oud-team-tag {
  position: absolute; top: 6px; right: 6px;
  font-size: 9px; font-family: var(--font-mono); font-weight: 700; letter-spacing: 0.08em;
  padding: 2px 6px; border-radius: 4px;
  background: var(--accent-mute); color: var(--accent-ink);
}

.oud-children { display: flex; flex-direction: column; }
.oud-child-row {
  display: grid; grid-template-columns: 4px 1fr auto; gap: 16px; align-items: center;
  padding: 14px 20px; border-bottom: 1px solid var(--line-soft);
  text-decoration: none; color: inherit; transition: background .12s ease;
}
.oud-child-row:last-child { border-bottom: 0; }
.oud-child-row:hover { background: var(--bg-soft); }
.oud-child-rail { height: 32px; border-radius: 2px; }
.oud-child-main { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.oud-child-name { font-size: 13.5px; font-weight: 600; color: var(--ink); }
.oud-child-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.oud-child-code { font-size: 11px; color: var(--ink-faint); font-family: var(--font-mono); }
.oud-child-counts { display: flex; gap: 18px; }
.oud-child-count { text-align: right; }
.oud-child-count-v { display: block; font-size: 15px; font-weight: 700; color: var(--ink); font-variant-numeric: tabular-nums; }
.oud-child-count-l { display: block; font-size: 10px; color: var(--ink-faint); font-family: var(--font-mono); text-transform: uppercase; letter-spacing: 0.06em; }

.oud-kv { display: flex; flex-direction: column; }
.oud-kv-row { display: grid; grid-template-columns: 1fr 1.4fr; gap: 16px; padding: 12px 0; border-bottom: 1px dashed var(--line); font-size: 13.5px; }
.oud-kv-row:last-child { border-bottom: 0; }
.oud-kv-k { color: var(--ink-soft); font-size: 12.5px; }
.oud-kv-v { color: var(--ink); font-weight: 500; }
.oud-kv-v.is-mono { font-family: var(--font-mono); font-size: 12.5px; font-weight: 400; }

.oud-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.oud-act-btn {
  display: inline-flex; align-items: center; gap: 6px;
  height: 36px; padding: 0 14px; border-radius: 10px;
  font-size: 13px; font-weight: 500;
  background: var(--surface); color: var(--ink-soft);
  border: 1px solid var(--line); text-decoration: none;
  transition: border-color .12s ease, color .12s ease;
}
.oud-act-btn:hover { color: var(--accent); border-color: var(--accent); }

.oud-pos-body { padding: 0; display: flex; flex-direction: column; }
.oud-pos-list { display: flex; flex-direction: column; }
.oud-pos-row {
  display: grid; grid-template-columns: 1fr auto auto; gap: 14px; align-items: center;
  padding: 14px 20px;
  border-bottom: 1px solid var(--line-soft);
}
.oud-pos-row:last-child { border-bottom: 0; }
.oud-pos-row.is-off { opacity: 0.55; }
.oud-pos-names { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.oud-pos-name { font-size: 14px; font-weight: 600; color: var(--ink); }
.oud-pos-name-kg { font-size: 12px; color: var(--ink-soft); }
.oud-pos-pill {
  display: inline-flex; align-items: center;
  padding: 3px 10px; border-radius: 999px;
  font-size: 10.5px; font-family: var(--font-mono); font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.06em;
  border: 1px solid transparent;
}
.oud-pos-pill.is-on  { background: var(--accent-mute); color: var(--accent); border-color: color-mix(in srgb, var(--accent) 30%, transparent); }
.oud-pos-pill.is-off { background: var(--bg-soft); color: var(--ink-faint); border-color: var(--line); }
.oud-pos-actions { display: flex; gap: 6px; }
.oud-pos-btn {
  height: 28px; padding: 0 10px; border-radius: 8px;
  font-size: 11.5px; font-family: inherit;
  background: var(--surface); color: var(--ink-soft);
  border: 1px solid var(--line); cursor: pointer;
  transition: border-color .12s ease, color .12s ease;
}
.oud-pos-btn:hover { color: var(--accent); border-color: var(--accent); }
.oud-pos-btn--del:hover { color: var(--danger); border-color: var(--danger); }
.oud-pos-add {
  display: grid; grid-template-columns: 1fr 1fr auto; gap: 8px;
  padding: 14px 20px; background: var(--bg-soft);
  border-top: 1px solid var(--line);
}
.oud-pos-input {
  height: 34px; padding: 0 12px;
  background: var(--surface); border: 1px solid var(--line); border-radius: 8px;
  font-family: inherit; font-size: 13px; color: var(--ink);
}
.oud-pos-input:focus { outline: none; border-color: var(--accent); }
.oud-pos-add-btn {
  height: 34px; padding: 0 14px; border-radius: 8px;
  font-size: 12.5px; font-weight: 600; font-family: inherit;
  background: var(--accent); color: #fff; border: 0; cursor: pointer;
  transition: opacity .12s ease;
}
.oud-pos-add-btn:disabled { opacity: 0.55; cursor: not-allowed; }
.oud-pos-error { padding: 10px 20px; color: var(--danger); font-size: 12.5px; background: color-mix(in srgb, var(--danger) 8%, transparent); }
@media (max-width: 600px) {
  .oud-pos-row { grid-template-columns: 1fr; }
  .oud-pos-add { grid-template-columns: 1fr; }
}

@media (max-width: 600px) {
  .oud-content { padding: 16px; }
  .oud-side { padding: 22px 18px; }
}
`
