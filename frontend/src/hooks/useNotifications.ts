import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import { AppDispatch, RootState } from '../app/store'
import { pushNotification, fetchUnreadCount, Notification } from '../features/notifications/notificationsSlice'

// Minimal runtime shape guard — STOMP payload is untrusted JSON.
function isNotification(x: unknown): x is Notification {
  if (typeof x !== 'object' || x === null) return false
  const o = x as Record<string, unknown>
  return typeof o.id === 'number'
    && typeof o.type === 'string'
    && typeof o.titleRu === 'string'
    && typeof o.read === 'boolean'
    && typeof o.createdAt === 'string'
}

export function useNotifications() {
  const dispatch = useDispatch<AppDispatch>()
  const { isAuthenticated } = useSelector((s: RootState) => s.auth)

  useEffect(() => {
    if (!isAuthenticated) return

    dispatch(fetchUnreadCount())

    const client = new Client({
      webSocketFactory: () => new SockJS('/ws'),
      reconnectDelay: 5000,
      onConnect: () => {
        // Recover from any missed pushes during the disconnect window.
        dispatch(fetchUnreadCount())
        client.subscribe('/user/queue/notifications', (message) => {
          try {
            const parsed: unknown = JSON.parse(message.body)
            if (!isNotification(parsed)) {
              console.warn('Dropped malformed notification payload', parsed)
              return
            }
            dispatch(pushNotification(parsed))
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
