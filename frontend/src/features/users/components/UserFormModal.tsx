import { useState, useEffect, FormEvent, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Upload, User as UserIcon, AlertCircle } from 'lucide-react'
import axios from 'axios'
import { User, UserCreateRequest, EmploymentType, usersApi } from '../api'
import { orgApi, OrgUnit, positionsApi, Position } from '@/features/org'
import { DASHBOARD_CSS } from '../../dashboard/styles'
import { DV3_FORM_CSS } from '../../dashboard/styles'

const ROLE_VALUES = [
  'EMPLOYEE',
  'ORG_HEAD',
  'DEPUTY_CHAIRMAN',
  'CHAIRMAN',
  'ADMIN',
]

const EMPLOYMENT_TYPES: EmploymentType[] = ['PERMANENT', 'CONTRACT', 'INTERN', 'ACTING']

interface FlatUnit {
  id: number
  label: string
  depth: number
}

function flattenUnits(units: OrgUnit[], depth = 0, acc: FlatUnit[] = []): FlatUnit[] {
  for (const u of units) {
    acc.push({ id: u.id, label: u.nameRu, depth })
    if (u.children?.length) flattenUnits(u.children, depth + 1, acc)
  }
  return acc
}

interface Props {
  open: boolean
  user: User | null
  allUsers: User[]
  onSave: (data: UserCreateRequest) => Promise<User>
  onClose: () => void
}

const MAX_AVATAR_BYTES = 2 * 1024 * 1024

export function UserFormModal({ open, user, allUsers, onSave, onClose }: Props) {
  const { t } = useTranslation()
  const [fullName, setFullName] = useState('')
  const [lastName, setLastName] = useState('')
  const [firstName, setFirstName] = useState('')
  const [middleName, setMiddleName] = useState('')
  const [employeeNumber, setEmployeeNumber] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [hireDate, setHireDate] = useState('')
  const [terminationDate, setTerminationDate] = useState('')
  const [employmentType, setEmploymentType] = useState<EmploymentType | ''>('')
  const [role, setRole] = useState('EMPLOYEE')
  const [position, setPosition] = useState('')
  const [positionId, setPositionId] = useState<number | ''>('')
  const [positions, setPositions] = useState<Position[]>([])
  const [unitId, setUnitId] = useState<number | ''>('')
  const [managerId, setManagerId] = useState<number | ''>('')
  const [units, setUnits] = useState<OrgUnit[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  type TabKey = 'profile' | 'job' | 'structure'
  const [activeTab, setActiveTab] = useState<TabKey>('profile')
  const [attempted, setAttempted] = useState(false)

  useEffect(() => { if (open) { setActiveTab('profile'); setAttempted(false) } }, [open, user])

  const profileErrors = useMemo(() => {
    const errs: string[] = []
    if (!fullName.trim()) errs.push('fullName')
    if (!user && !email.trim()) errs.push('email')
    return errs
  }, [fullName, email, user])
  const jobErrors: string[] = []
  const structureErrors: string[] = []
  const tabErrorCount: Record<TabKey, number> = {
    profile: profileErrors.length,
    job: jobErrors.length,
    structure: structureErrors.length,
  }

  useEffect(() => {
    if (!open) return
    orgApi.getStructure().then(setUnits).catch(() => setUnits([]))
  }, [open])

  useEffect(() => {
    if (!open) return
    if (unitId === '') { setPositions([]); return }
    positionsApi.listByUnit(Number(unitId), false)
      .then(setPositions)
      .catch(() => setPositions([]))
  }, [open, unitId])

  useEffect(() => {
    if (positions.length === 0) return
    if (positionId !== '' && !positions.some(p => p.id === positionId)) {
      setPositionId('')
    }
  }, [positions, positionId])

  useEffect(() => {
    if (user) {
      setFullName(user.fullName)
      setLastName(user.lastName ?? '')
      setFirstName(user.firstName ?? '')
      setMiddleName(user.middleName ?? '')
      setEmployeeNumber(user.employeeNumber ?? '')
      setEmail(user.email)
      setPhone(user.phone ?? '')
      setHireDate(user.hireDate ?? '')
      setTerminationDate(user.terminationDate ?? '')
      setEmploymentType(user.employmentType ?? '')
      setRole(user.role)
      setPosition(user.position ?? '')
      setPositionId(user.positionId ?? '')
      setUnitId(user.unitId ?? '')
      setManagerId(user.managerId ?? '')
    } else {
      setFullName(''); setLastName(''); setFirstName(''); setMiddleName('')
      setEmployeeNumber(''); setEmail(''); setPhone('')
      setHireDate(''); setTerminationDate(''); setEmploymentType('')
      setRole('EMPLOYEE'); setPosition(''); setPositionId('')
      setUnitId(''); setManagerId('')
    }
    setError('')
    setAvatarFile(null)
    setAvatarPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [user, open])

  const onAvatarPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > MAX_AVATAR_BYTES) { setError(t('v2.users.avatarTooLarge', 'Аватар превышает 2 МБ')); return }
    if (!['image/png', 'image/jpeg'].includes(f.type)) { setError(t('v2.users.avatarBadType', 'Только PNG или JPEG')); return }
    setError('')
    setAvatarFile(f)
    setAvatarPreview(URL.createObjectURL(f))
  }

  const flatUnits = useMemo(() => flattenUnits(units), [units])

  const managerOptions = useMemo(() => {
    const managerRoles = new Set([
      'ORG_HEAD',
      'DEPUTY_CHAIRMAN',
      'CHAIRMAN',
    ])
    return allUsers
      .filter(u => u.isActive && managerRoles.has(u.role) && u.id !== user?.id)
      .sort((a, b) => a.fullName.localeCompare(b.fullName, 'ru'))
  }, [allUsers, user])

  if (!open) return null

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setAttempted(true)
    if (profileErrors.length) { setActiveTab('profile'); return }
    if (jobErrors.length) { setActiveTab('job'); return }
    if (structureErrors.length) { setActiveTab('structure'); return }
    setLoading(true)
    setError('')
    try {
      const saved = await onSave({
        fullName,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        middleName: middleName || undefined,
        employeeNumber: employeeNumber || undefined,
        email,
        phone: phone || undefined,
        hireDate: hireDate || undefined,
        terminationDate: terminationDate || undefined,
        employmentType: employmentType || undefined,
        role,
        position: position || undefined,
        positionId: positionId === '' ? null : Number(positionId),
        unitId: unitId === '' ? undefined : Number(unitId),
        managerId: managerId === '' ? undefined : Number(managerId),
      })
      if (avatarFile && saved?.id) {
        await usersApi.uploadAvatar(saved.id, avatarFile)
      }
      onClose()
    } catch (err) {
      const msg = axios.isAxiosError(err) ? (err.response?.data as { message_ru?: string })?.message_ru : undefined
      setError(msg ?? t('v2.users.formError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="dv3-root">
      <style>{DASHBOARD_CSS}</style>
      <style>{DV3_FORM_CSS}</style>
      <style>{USER_MODAL_CSS}</style>

      <div className="user-modal-scrim" onClick={onClose}>
        <div
          className="user-modal"
          role="dialog"
          aria-modal="true"
          aria-label={user ? t('v2.users.formEditTitle') : t('v2.users.formCreateTitle')}
          onClick={e => e.stopPropagation()}
        >
          <div className="user-modal-head">
            <div className="user-modal-head-meta">
              <span className="user-modal-kicker">
                {user ? t('v2.users.formEditTitle') : t('v2.users.formCreateTitle')}
              </span>
              <h3>{user ? user.fullName : t('v2.users.formCreateTitle')}</h3>
            </div>
            <button className="user-modal-x" onClick={onClose} aria-label="Закрыть" type="button">
              <X size={16} strokeWidth={2.2} aria-hidden="true" />
            </button>
          </div>

          <div className="user-modal-tabs" role="tablist">
            {([
              { key: 'profile' as const,   label: 'Профиль' },
              { key: 'job' as const,       label: 'Должность' },
              { key: 'structure' as const, label: 'Структура' },
            ]).map(tab => {
              const showErr = attempted && tabErrorCount[tab.key] > 0
              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.key}
                  className={`user-modal-tab ${activeTab === tab.key ? 'user-modal-tab--on' : ''}`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  <span>{tab.label}</span>
                  {showErr && <span className="user-modal-tab-dot" aria-label="ошибки на вкладке" />}
                </button>
              )
            })}
          </div>

          <form onSubmit={handleSubmit} className="user-modal-body dv3-form">
            <div className="user-modal-tabpanels">
            <div className={`user-modal-tabpanel ${activeTab === 'profile' ? '' : 'user-modal-tabpanel--off'}`}>
            <div className="user-modal-avatar-row">
              <div className="user-modal-avatar">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="" />
                ) : user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" />
                ) : (
                  <UserIcon size={26} strokeWidth={1.5} aria-hidden="true" />
                )}
              </div>
              <div className="user-modal-avatar-meta">
                <span className="dv3-label">{t('v2.users.avatarPick', 'Аватар')}</span>
                <button
                  type="button"
                  className="dv3-btn"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={13} strokeWidth={2} aria-hidden="true" />
                  {t('v2.users.avatarPick', 'Выбрать аватар')}
                </button>
                <span className="dv3-help">PNG / JPEG · max 2 МБ</span>
              </div>
              <input ref={fileInputRef} type="file" accept="image/png,image/jpeg" hidden onChange={onAvatarPick} />
            </div>

            <div className="user-modal-section">
              <div className="user-modal-section-title">Идентификация</div>
              <div className="dv3-field">
                <span className="dv3-label">{t('v2.users.formName')} <span className="dv3-req">*</span></span>
                <input
                  className={`dv3-input ${attempted && !fullName.trim() ? 'dv3-input--err' : ''}`}
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                />
              </div>
              <div className="user-modal-grid-3">
                <label className="dv3-field">
                  <span className="dv3-label">{t('v2.users.formLastName', 'Фамилия')}</span>
                  <input className="dv3-input" value={lastName} onChange={e => setLastName(e.target.value)} />
                </label>
                <label className="dv3-field">
                  <span className="dv3-label">{t('v2.users.formFirstName', 'Имя')}</span>
                  <input className="dv3-input" value={firstName} onChange={e => setFirstName(e.target.value)} />
                </label>
                <label className="dv3-field">
                  <span className="dv3-label">{t('v2.users.formMiddleName', 'Отчество')}</span>
                  <input className="dv3-input" value={middleName} onChange={e => setMiddleName(e.target.value)} />
                </label>
              </div>
              <div className="user-modal-grid-2">
                <label className="dv3-field">
                  <span className="dv3-label">{t('v2.users.formEmployeeNumber', 'Табельный номер')}</span>
                  <input className="dv3-input" value={employeeNumber} onChange={e => setEmployeeNumber(e.target.value)} />
                </label>
                {!user ? (
                  <label className="dv3-field">
                    <span className="dv3-label">{t('v2.users.formEmail')} <span className="dv3-req">*</span></span>
                    <input
                      className={`dv3-input ${attempted && !email.trim() ? 'dv3-input--err' : ''}`}
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                    />
                  </label>
                ) : (
                  <label className="dv3-field">
                    <span className="dv3-label">{t('v2.users.formPhone', 'Телефон')}</span>
                    <input className="dv3-input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+996…" />
                  </label>
                )}
              </div>
              {!user && (
                <label className="dv3-field">
                  <span className="dv3-label">{t('v2.users.formPhone', 'Телефон')}</span>
                  <input className="dv3-input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+996…" />
                </label>
              )}
            </div>

            </div>

            <div className={`user-modal-tabpanel ${activeTab === 'job' ? '' : 'user-modal-tabpanel--off'}`}>
            <div className="user-modal-section">
              <div className="user-modal-section-title">Трудоустройство</div>
              <div className="user-modal-grid-2">
                <label className="dv3-field">
                  <span className="dv3-label">{t('v2.users.formHireDate', 'Дата приёма')}</span>
                  <input className="dv3-input" type="date" value={hireDate} onChange={e => setHireDate(e.target.value)} />
                </label>
                <label className="dv3-field">
                  <span className="dv3-label">{t('v2.users.formTerminationDate', 'Дата увольнения')}</span>
                  <input className="dv3-input" type="date" value={terminationDate} onChange={e => setTerminationDate(e.target.value)} />
                </label>
              </div>
              <div className="user-modal-grid-2">
                <label className="dv3-field">
                  <span className="dv3-label">{t('v2.users.formEmploymentType', 'Тип занятости')}</span>
                  <select
                    className="dv3-select"
                    value={employmentType}
                    onChange={e => setEmploymentType((e.target.value || '') as EmploymentType | '')}
                  >
                    <option value="">—</option>
                    {EMPLOYMENT_TYPES.map(et => (
                      <option key={et} value={et}>{t(`v2.users.employmentType.${et}`, et)}</option>
                    ))}
                  </select>
                </label>
                <label className="dv3-field">
                  <span className="dv3-label">{t('v2.users.formRole')} <span className="dv3-req">*</span></span>
                  <select className="dv3-select" value={role} onChange={e => setRole(e.target.value)}>
                    {ROLE_VALUES.map(r => <option key={r} value={r}>{t(`v2.rolesShort.${r}`)}</option>)}
                  </select>
                </label>
              </div>
              <label className="dv3-field">
                <span className="dv3-label">{t('v2.users.formPosition')}</span>
                <select
                  className="dv3-select"
                  value={positionId}
                  onChange={e => setPositionId(e.target.value === '' ? '' : Number(e.target.value))}
                  disabled={unitId === ''}
                >
                  <option value="">
                    {unitId === ''
                      ? 'Сначала выберите подразделение'
                      : positions.length === 0
                        ? '— нет должностей —'
                        : '— не выбрана —'}
                  </option>
                  {positions.map(p => (
                    <option key={p.id} value={p.id}>{p.nameRu}</option>
                  ))}
                </select>
                {position && positionId === '' && (
                  <span className="dv3-help">Предыдущее значение: {position}</span>
                )}
              </label>
            </div>

            </div>

            <div className={`user-modal-tabpanel ${activeTab === 'structure' ? '' : 'user-modal-tabpanel--off'}`}>
            <div className="user-modal-section">
              <div className="user-modal-section-title">Структура</div>
              <div className="user-modal-grid-2">
                <label className="dv3-field">
                  <span className="dv3-label">{t('v2.users.formUnit')}</span>
                  <select
                    className="dv3-select"
                    value={unitId}
                    onChange={e => setUnitId(e.target.value === '' ? '' : Number(e.target.value))}
                  >
                    <option value="">{t('v2.users.formUnitNone')}</option>
                    {flatUnits.map(u => (
                      <option key={u.id} value={u.id}>{'  '.repeat(u.depth) + u.label}</option>
                    ))}
                  </select>
                </label>
                <label className="dv3-field">
                  <span className="dv3-label">{t('v2.users.formManager')}</span>
                  <select
                    className="dv3-select"
                    value={managerId}
                    onChange={e => setManagerId(e.target.value === '' ? '' : Number(e.target.value))}
                  >
                    <option value="">{t('v2.users.formManagerNone')}</option>
                    {managerOptions.map(u => (
                      <option key={u.id} value={u.id}>{u.fullName} — {t(`v2.rolesShort.${u.role}`)}</option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
            </div>
            </div>

            {error && (
              <div className="dv3-banner dv3-banner--error" role="alert">{error}</div>
            )}

            <div className="user-modal-foot">
              <button type="button" className="dv3-btn" onClick={onClose} disabled={loading}>
                {t('v2.users.formCancel')}
              </button>
              <button type="submit" className="dv3-btn dv3-btn--primary" disabled={loading}>
                {loading ? t('v2.users.formSaving') : t('v2.users.formSave')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

const USER_MODAL_CSS = `
.user-modal-scrim {
  position: fixed; inset: 0; z-index: 60;
  background: rgba(0,0,0,.55);
  backdrop-filter: blur(4px);
  display: grid; place-items: center; padding: 20px;
  animation: user-modal-fade .18s ease;
}
@keyframes user-modal-fade { from { opacity: 0; } }
.user-modal {
  width: 100%; max-width: 960px;
  max-height: calc(100vh - 40px);
  display: flex; flex-direction: column;
  background: var(--dv3-bg2);
  border: 1px solid var(--dv3-border);
  border-top: 2px solid var(--dv3-zone-info);
  color: var(--dv3-text);
  box-shadow: 0 24px 48px -16px rgba(0,0,0,0.35);
  animation: user-modal-pop .18s cubic-bezier(.2,.7,.3,1.2);
  overflow: hidden;
}
@keyframes user-modal-pop { from { transform: translateY(8px) scale(.97); opacity: 0; } }
.user-modal-head {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;
  padding: 18px 22px 14px;
  border-bottom: 1px solid var(--dv3-border);
}
.user-modal-head-meta { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.user-modal-kicker {
  font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase;
  color: var(--dv3-text3); font-weight: 600;
}
.user-modal-head h3 {
  font-size: 16px; font-weight: 600; margin: 0;
  letter-spacing: -0.005em; color: var(--dv3-text);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.user-modal-x {
  display: grid; place-items: center;
  width: 30px; height: 30px; flex-shrink: 0;
  border: 1px solid var(--dv3-border2);
  background: var(--dv3-bg3);
  color: var(--dv3-text3);
  cursor: pointer;
  transition: background .14s, color .14s, border-color .14s;
}
.user-modal-x:hover { background: var(--dv3-bg2); color: var(--dv3-text); border-color: var(--dv3-border-hi); }
.user-modal-tabs {
  display: flex; gap: 2px;
  padding: 0 22px;
  background: var(--dv3-bg);
  border-bottom: 1px solid var(--dv3-border);
}
.user-modal-tab {
  position: relative;
  display: inline-flex; align-items: center; gap: 8px;
  background: transparent; border: none;
  padding: 12px 16px;
  font-family: inherit;
  font-size: 11px; font-weight: 600;
  letter-spacing: 0.12em; text-transform: uppercase;
  color: var(--dv3-text3);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: color .14s, border-color .14s;
}
.user-modal-tab:hover { color: var(--dv3-text2); }
.user-modal-tab--on {
  color: var(--dv3-text);
  border-bottom-color: var(--dv3-accent);
}
.user-modal-tab-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--dv3-zone-down);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--dv3-zone-down) 22%, transparent);
}
.user-modal-body {
  padding: 18px 22px 20px;
  display: flex; flex-direction: column;
  gap: 16px;
}
.user-modal-tabpanels {
  position: relative;
  display: grid; grid-template-columns: 1fr;
}
.user-modal-tabpanel {
  grid-column: 1; grid-row: 1;
  display: flex; flex-direction: column; gap: 16px;
  min-width: 0;
}
.user-modal-tabpanel--off {
  visibility: hidden;
  pointer-events: none;
}
.dv3-input--err, .dv3-select--err {
  border-color: var(--dv3-zone-down) !important;
  outline: 1px solid color-mix(in srgb, var(--dv3-zone-down) 30%, transparent);
}

.user-modal-avatar-row {
  display: flex; align-items: center; gap: 16px;
  padding: 12px 14px;
  background: var(--dv3-bg3);
  border: 1px solid var(--dv3-border);
}
.user-modal-avatar {
  width: 64px; height: 64px; flex: none;
  display: grid; place-items: center;
  background: var(--dv3-bg2);
  border: 1px solid var(--dv3-border2);
  color: var(--dv3-text3);
  overflow: hidden;
}
.user-modal-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
.user-modal-avatar-meta { display: flex; flex-direction: column; gap: 6px; align-items: flex-start; }

.user-modal-section {
  display: flex; flex-direction: column; gap: 12px;
  padding-top: 14px;
  border-top: 1px solid var(--dv3-border);
}
.user-modal-section:first-of-type { border-top: none; padding-top: 0; }
.user-modal-section-title {
  font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase;
  color: var(--dv3-text3); font-weight: 600;
}

.user-modal-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.user-modal-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }

.user-modal-foot {
  display: flex; gap: 10px; justify-content: flex-end;
  padding-top: 14px;
  border-top: 1px solid var(--dv3-border);
}

@media (max-width: 640px) {
  .user-modal-grid-2, .user-modal-grid-3 { grid-template-columns: 1fr; }
  .user-modal-foot { flex-direction: column-reverse; }
  .user-modal-foot .dv3-btn { width: 100%; }
}
`
