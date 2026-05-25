import { useState, useEffect, FormEvent, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import axios from 'axios'
import { User, UserCreateRequest, EmploymentType, usersApi } from '../usersApi'
import { orgApi, OrgUnit } from '../../org/orgApi'

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
  const [unitId, setUnitId] = useState<number | ''>('')
  const [managerId, setManagerId] = useState<number | ''>('')
  const [units, setUnits] = useState<OrgUnit[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    orgApi.getStructure().then(setUnits).catch(() => setUnits([]))
  }, [open])

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
      setUnitId(user.unitId ?? '')
      setManagerId(user.managerId ?? '')
    } else {
      setFullName(''); setLastName(''); setFirstName(''); setMiddleName('')
      setEmployeeNumber(''); setEmail(''); setPhone('')
      setHireDate(''); setTerminationDate(''); setEmploymentType('')
      setRole('EMPLOYEE'); setPosition('')
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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">{user ? t('v2.users.formEditTitle') : t('v2.users.formCreateTitle')}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center text-gray-500 text-xs">
              {avatarPreview ? (
                <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
              ) : user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span>—</span>
              )}
            </div>
            <button type="button" onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
              {t('v2.users.avatarPick', 'Выбрать аватар')}
            </button>
            <input ref={fileInputRef} type="file" accept="image/png,image/jpeg" hidden onChange={onAvatarPick} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('v2.users.formName')} *</label>
            <input value={fullName} onChange={e => setFullName(e.target.value)} required
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('v2.users.formLastName', 'Фамилия')}</label>
              <input value={lastName} onChange={e => setLastName(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('v2.users.formFirstName', 'Имя')}</label>
              <input value={firstName} onChange={e => setFirstName(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('v2.users.formMiddleName', 'Отчество')}</label>
              <input value={middleName} onChange={e => setMiddleName(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('v2.users.formEmployeeNumber', 'Табельный номер')}</label>
            <input value={employeeNumber} onChange={e => setEmployeeNumber(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary" />
          </div>
          {!user && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('v2.users.formEmail')} *</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary" />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('v2.users.formPhone', 'Телефон')}</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+996..."
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('v2.users.formHireDate', 'Дата приёма')}</label>
              <input type="date" value={hireDate} onChange={e => setHireDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('v2.users.formTerminationDate', 'Дата увольнения')}</label>
              <input type="date" value={terminationDate} onChange={e => setTerminationDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('v2.users.formEmploymentType', 'Тип занятости')}</label>
            <select value={employmentType} onChange={e => setEmploymentType((e.target.value || '') as EmploymentType | '')}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary">
              <option value="">—</option>
              {EMPLOYMENT_TYPES.map(et => (
                <option key={et} value={et}>{t(`v2.users.employmentType.${et}`, et)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('v2.users.formRole')} *</label>
            <select value={role} onChange={e => setRole(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary">
              {ROLE_VALUES.map(r => <option key={r} value={r}>{t(`v2.rolesShort.${r}`)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('v2.users.formPosition')}</label>
            <input value={position} onChange={e => setPosition(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('v2.users.formUnit')}</label>
            <select value={unitId} onChange={e => setUnitId(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary">
              <option value="">{t('v2.users.formUnitNone')}</option>
              {flatUnits.map(u => (
                <option key={u.id} value={u.id}>{'  '.repeat(u.depth) + u.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('v2.users.formManager')}</label>
            <select value={managerId} onChange={e => setManagerId(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary">
              <option value="">{t('v2.users.formManagerNone')}</option>
              {managerOptions.map(u => (
                <option key={u.id} value={u.id}>{u.fullName} — {t(`v2.rolesShort.${u.role}`)}</option>
              ))}
            </select>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
              {t('v2.users.formCancel')}
            </button>
            <button type="submit" disabled={loading}
              className="px-4 py-2 text-sm bg-primary text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
              {loading ? t('v2.users.formSaving') : t('v2.users.formSave')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
