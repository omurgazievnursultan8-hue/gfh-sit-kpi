import axios from 'axios'
import { store } from './store'
import { logout } from '@/features/auth/slice'

const api = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
})

api.interceptors.request.use((config) => {
  // Method may arrive uppercase or lowercase from callers; normalise before check.
  if (['post', 'put', 'delete', 'patch'].includes((config.method || '').toLowerCase())) {
    const csrfToken = document.cookie
      .split('; ')
      .find((row) => row.startsWith('XSRF-TOKEN='))
      ?.split('=')[1]
    if (csrfToken) {
      try {
        config.headers['X-XSRF-TOKEN'] = decodeURIComponent(csrfToken)
      } catch {
        config.headers['X-XSRF-TOKEN'] = csrfToken
      }
    }
  }
  return config
})

let isRefreshing = false
let failedQueue: Array<{ resolve: (v: unknown) => void; reject: (e: unknown) => void }> = []

const processQueue = (error: Error | null) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(undefined)))
  failedQueue = []
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config
    const skipRedirect = !!originalRequest?.headers?.['X-Skip-Auth-Redirect']
    // Network failures (CORS, DNS, offline) reject before a config is attached.
    // Guard so `_retry` assignment + recursion below don't crash on undefined.
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then(() => api(originalRequest))
      }
      originalRequest._retry = true
      isRefreshing = true
      try {
        await axios.post('/api/v1/auth/refresh', {}, { withCredentials: true })
        processQueue(null)
        return api(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError instanceof Error ? refreshError : new Error(String(refreshError)))
        if (!skipRedirect) {
          store.dispatch(logout())
          window.location.href = '/login'
        }
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }
    return Promise.reject(error)
  }
)

export default api
