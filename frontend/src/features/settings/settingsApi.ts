import api from '../../app/api'

export interface SystemSetting {
  key: string
  value: string
  description: string | null
  updatedAt: string
}

export const settingsApi = {
  list: () => api.get<SystemSetting[]>('/settings').then(r => r.data),
  update: (key: string, value: string) =>
    api.put<SystemSetting>(`/settings/${key}`, { value }).then(r => r.data),
}
