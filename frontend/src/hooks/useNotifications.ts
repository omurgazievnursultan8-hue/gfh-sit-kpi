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
