import { User } from '../usersApi'

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Администратор',
  CHAIRMAN: 'Председатель',
  DEPUTY_CHAIRMAN: 'Зам. председателя',
  HEAD_OF_DEPARTMENT: 'Нач. департамента',
  HEAD_OF_DEPARTMENT_UNIT: 'Нач. отдела',
  EMPLOYEE: 'Сотрудник',
}

interface Props {
  users: User[]
  onEdit: (user: User) => void
  onDeactivate: (user: User) => void
  onReactivate: (user: User) => void
  onResetPassword: (user: User) => void
}

export function UserTable({ users, onEdit, onDeactivate, onReactivate, onResetPassword }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="text-left px-4 py-3 font-medium text-gray-600">ФИО</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Роль</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Должность</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Статус</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Действия</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="px-4 py-3 font-medium text-gray-900">{user.fullName}</td>
              <td className="px-4 py-3 text-gray-600">{user.email}</td>
              <td className="px-4 py-3 text-gray-600">{ROLE_LABELS[user.role] ?? user.role}</td>
              <td className="px-4 py-3 text-gray-600">{user.position ?? '—'}</td>
              <td className="px-4 py-3">
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                  user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {user.isActive ? 'Активен' : 'Неактивен'}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => onEdit(user)} className="text-xs text-primary hover:underline">
                    Изменить
                  </button>
                  {user.isActive ? (
                    <button onClick={() => onDeactivate(user)} className="text-xs text-red-600 hover:underline">
                      Деактивировать
                    </button>
                  ) : (
                    <button onClick={() => onReactivate(user)} className="text-xs text-green-600 hover:underline">
                      Активировать
                    </button>
                  )}
                  <button onClick={() => onResetPassword(user)} className="text-xs text-amber-600 hover:underline">
                    Сбросить пароль
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
