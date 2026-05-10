# M3-FE-03: Notification Center — WebSocket Real-Time, Unread Counter in Header

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the notification center: a bell icon in the header showing unread count badge, a dropdown panel showing recent notifications, and real-time delivery via WebSocket STOMP. Clicking a notification marks it read and navigates to the related entity.

**Architecture:** `useNotifications` hook connects to WebSocket on mount, subscribes to `/user/queue/notifications`, and appends incoming messages to Redux state. The header bell icon reads unread count from state. Clicking the bell opens a dropdown listing the last 10 notifications. "Mark all read" calls `POST /api/v1/notifications/mark-all-read`. Full list is at `/notifications` page.

**Tech Stack:** React 18, Redux Toolkit, @stomp/stompjs, SockJS-client.

**Depends on:** m3-workflow/fe-01-evaluation-form.md

---

### Task 1: Notifications Redux slice + WebSocket hook

**Files:**
- Create: `frontend/src/features/notifications/notificationsSlice.ts`
- Create: `frontend/src/hooks/useNotifications.ts`

- [ ] **Step 1: Add @stomp/stompjs and sockjs-client packages**

```bash
cd frontend && npm install @stomp/stompjs sockjs-client
npm install --save-dev @types/sockjs-client
```

- [ ] **Step 2: Create notifications Redux slice**

`frontend/src/features/notifications/notificationsSlice.ts`:
```ts
import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit'
import api from '../../app/api'

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
      state.items.unshift(action.payload)
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
      .addCase(markAllRead.fulfilled, (state) => {
        state.unreadCount = 0
        state.items = state.items.map(n => ({ ...n, read: true }))
      })
  },
})

export const { pushNotification } = notificationsSlice.actions
export default notificationsSlice.reducer
```

Add to store:
```ts
// In frontend/src/app/store.ts, add:
import notificationsReducer from '../features/notifications/notificationsSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    notifications: notificationsReducer,
  },
})
```

- [ ] **Step 3: Create useNotifications hook**

`frontend/src/hooks/useNotifications.ts`:
```ts
import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import { AppDispatch, RootState } from '../app/store'
import { pushNotification, fetchUnreadCount, Notification } from '../features/notifications/notificationsSlice'

export function useNotifications() {
  const dispatch = useDispatch<AppDispatch>()
  const { isAuthenticated } = useSelector((s: RootState) => s.auth)

  useEffect(() => {
    if (!isAuthenticated) return

    // Fetch initial unread count
    dispatch(fetchUnreadCount())

    const client = new Client({
      webSocketFactory: () => new SockJS('/ws'),
      reconnectDelay: 5000,
      onConnect: () => {
        client.subscribe('/user/queue/notifications', (message) => {
          try {
            const notification: Notification = JSON.parse(message.body)
            dispatch(pushNotification(notification))
          } catch (e) {
            console.warn('Failed to parse notification', e)
          }
        })
      },
      onStompError: (frame) => {
        console.warn('STOMP error:', frame)
      },
    })

    client.activate()
    return () => { client.deactivate() }
  }, [isAuthenticated, dispatch])
}
```

Add to `App.tsx`:
```tsx
import { useNotifications } from './hooks/useNotifications'

export default function App() {
  useIdleTimeout()
  useNotifications()
  // ... rest unchanged
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/notifications/ \
        frontend/src/hooks/useNotifications.ts \
        frontend/src/app/store.ts \
        frontend/src/App.tsx
git commit -m "feat(fe/notifications): add notifications Redux slice and WebSocket STOMP hook for real-time delivery"
```

---

### Task 2: Notification bell + dropdown in Header + NotificationsPage

**Files:**
- Modify: `frontend/src/components/Header.tsx`
- Create: `frontend/src/features/notifications/NotificationsPage.tsx`

- [ ] **Step 1: Add bell icon with unread badge to Header**

In `frontend/src/components/Header.tsx`, add notifications bell:
```tsx
import { useSelector, useDispatch } from 'react-redux'
import { Bell } from 'lucide-react'
import { useState } from 'react'
import { RootState, AppDispatch } from '../app/store'
import { markAllRead, fetchNotifications } from '../features/notifications/notificationsSlice'

// Inside Header component:
const dispatch = useDispatch<AppDispatch>()
const { items, unreadCount } = useSelector((s: RootState) => s.notifications)
const [dropdownOpen, setDropdownOpen] = useState(false)

const handleBellClick = () => {
  if (!dropdownOpen) dispatch(fetchNotifications())
  setDropdownOpen(!dropdownOpen)
}

// In JSX, before the logout button:
<div className="relative">
  <button
    onClick={handleBellClick}
    className="relative p-2 text-gray-500 hover:text-gray-800"
    aria-label="Notifications"
  >
    <Bell size={20} />
    {unreadCount > 0 && (
      <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
        {unreadCount > 99 ? '99+' : unreadCount}
      </span>
    )}
  </button>

  {dropdownOpen && (
    <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <span className="font-semibold text-gray-900 text-sm">Уведомления</span>
        {unreadCount > 0 && (
          <button
            onClick={() => dispatch(markAllRead())}
            className="text-xs text-primary hover:underline"
          >
            Отметить все как прочитанные
          </button>
        )}
      </div>

      <div className="max-h-96 overflow-y-auto">
        {items.length === 0 ? (
          <div className="py-6 text-center text-sm text-gray-400">
            Нет уведомлений
          </div>
        ) : (
          items.slice(0, 10).map(n => (
            <div
              key={n.id}
              className={`px-4 py-3 border-b border-gray-50 hover:bg-gray-50 cursor-pointer ${
                !n.read ? 'bg-blue-50' : ''
              }`}
            >
              <div className="font-medium text-gray-900 text-sm">{n.titleRu}</div>
              {n.bodyRu && (
                <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.bodyRu}</div>
              )}
              <div className="text-xs text-gray-400 mt-1">
                {new Date(n.createdAt).toLocaleString('ru-RU')}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="px-4 py-2 border-t border-gray-100">
        <a href="/notifications" className="text-xs text-primary hover:underline"
          onClick={() => setDropdownOpen(false)}>
          Все уведомления →
        </a>
      </div>
    </div>
  )}
</div>
```

- [ ] **Step 2: Create NotificationsPage**

`frontend/src/features/notifications/NotificationsPage.tsx`:
```tsx
import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Bell } from 'lucide-react'
import { AppDispatch, RootState } from '../../app/store'
import { fetchNotifications, markAllRead } from './notificationsSlice'

export function NotificationsPage() {
  const dispatch = useDispatch<AppDispatch>()
  const { items, unreadCount, loading } = useSelector((s: RootState) => s.notifications)

  useEffect(() => { dispatch(fetchNotifications()) }, [dispatch])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Уведомления</h1>
        {unreadCount > 0 && (
          <button
            onClick={() => dispatch(markAllRead())}
            className="text-sm text-primary hover:underline"
          >
            Отметить все как прочитанные ({unreadCount})
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Загрузка...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-12">
          <Bell size={48} className="mx-auto text-gray-200 mb-4" />
          <p className="text-gray-400">Уведомлений нет</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
          {items.map(n => (
            <div key={n.id} className={`px-4 py-4 hover:bg-gray-50 ${!n.read ? 'bg-blue-50' : ''}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {!n.read && (
                      <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                    )}
                    <span className="font-medium text-gray-900 text-sm">{n.titleRu}</span>
                  </div>
                  {n.bodyRu && (
                    <p className="text-sm text-gray-600 mt-1">{n.bodyRu}</p>
                  )}
                </div>
                <span className="text-xs text-gray-400 ml-4 flex-shrink-0">
                  {new Date(n.createdAt).toLocaleString('ru-RU')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Wire routes in App.tsx**

```tsx
import { NotificationsPage } from './features/notifications/NotificationsPage'
<Route path="notifications" element={<NotificationsPage />} />
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/Header.tsx \
        frontend/src/features/notifications/NotificationsPage.tsx \
        frontend/src/App.tsx
git commit -m "feat(fe/notifications): add bell icon with unread badge, dropdown, and notifications list page"
```
