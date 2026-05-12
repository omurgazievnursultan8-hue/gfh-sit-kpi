import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit'
import api from '../../app/api'
import { logout, logoutAction } from '../auth/authSlice'

export interface Notification {
  id: number
  type: string
  titleRu: string
  titleKg: string
  bodyRu: string | null
  bodyKg: string | null
  entityType: string | null
  entityId: number | null
  read: boolean
  createdAt: string
}

interface NotificationsState {
  items: Notification[]
  unreadCount: number
  loading: boolean
}

const initialState: NotificationsState = {
  items: [],
  unreadCount: 0,
  loading: false,
}

export const fetchUnreadCount = createAsyncThunk('notifications/fetchUnreadCount', async () => {
  const { data } = await api.get<{ count: number }>('/notifications/unread-count')
  return data.count
})

export const fetchNotifications = createAsyncThunk('notifications/fetch', async () => {
  const { data } = await api.get<{ content: Notification[] }>('/notifications?size=20')
  return data.content
})

export const markAllRead = createAsyncThunk('notifications/markAllRead', async () => {
  await api.post('/notifications/mark-all-read')
})

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    pushNotification(state, action: PayloadAction<Notification>) {
      // Dedupe by id — WS may double-deliver across reconnect.
      const exists = state.items.some(n => n.id === action.payload.id)
      if (exists) return
      state.items.unshift(action.payload)
      // Cap in-memory list — bell shows top 10, /notifications page paginates.
      // Prevents unbounded growth on long-running WS sessions.
      if (state.items.length > 50) state.items.length = 50
      if (!action.payload.read) state.unreadCount += 1
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUnreadCount.fulfilled, (state, action) => {
        state.unreadCount = action.payload
      })
      .addCase(fetchNotifications.pending, (state) => { state.loading = true })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.items = action.payload
        state.loading = false
      })
      .addCase(fetchNotifications.rejected, (state) => { state.loading = false })
      .addCase(markAllRead.fulfilled, (state) => {
        state.unreadCount = 0
        state.items = state.items.map(n => ({ ...n, read: true }))
      })
      // Cross-slice clear on logout — prevents next session showing previous user's items.
      .addCase(logout, () => initialState)
      .addCase(logoutAction.fulfilled, () => initialState)
  },
})

export const { pushNotification } = notificationsSlice.actions
export default notificationsSlice.reducer
