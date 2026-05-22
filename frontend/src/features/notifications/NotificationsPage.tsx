import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { Bell } from 'lucide-react'
import { AppDispatch, RootState } from '../../app/store'
import { fetchNotifications, markAllRead, type Notification } from './notificationsSlice'
import { usePageTitle } from '../../context/PageContext'
import { DASHBOARD_CSS } from '../dashboard/dashboardStyles'
import { StatCard, STAT_CARD_CSS } from '../../components/StatCard'

const PLACEHOLDER = '··'

export function NotificationsPage() {
  const dispatch = useDispatch<AppDispatch>()
  const { t, i18n } = useTranslation()
  const { items, unreadCount, loading } = useSelector((s: RootState) => s.notifications)

  usePageTitle('notification.title')
  useEffect(() => { dispatch(fetchNotifications()) }, [dispatch])

  const [loadedAt, setLoadedAt] = useState<Date | null>(null)
  const [now, setNow] = useState(new Date())

  useEffect(() => { if (!loading) setLoadedAt(new Date()) }, [loading])

  // Live tick — refresh clock + relative time each minute.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  /* ── time / clock ──────────────────────────────────────────────────────── */
  const hours = now.getHours()
  const timeGreeting = hours < 12 ? 'Доброе утро' : hours < 18 ? 'Добрый день' : 'Добрый вечер'
  const datePart = now.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  const todayLine = `${datePart} · ${hh}:${mm}`
  const clockKgt = `${hh}:${mm}`

  let updatedLabel = ''
  if (loadedAt) {
    const mins = Math.floor((now.getTime() - loadedAt.getTime()) / 60_000)
    updatedLabel = mins < 1 ? 'обновлено только что' : `обновлено ${mins} мин назад`
  }

  const isKg = i18n.language.startsWith('kg')
  const locale = isKg ? 'ky-KG' : 'ru-RU'
  const pickTitle = (n: Notification) => (isKg ? n.titleKg : n.titleRu) || n.titleRu
  const pickBody = (n: Notification) => (isKg ? n.bodyKg : n.bodyRu) || n.bodyRu

  /* ── derived stats ─────────────────────────────────────────────────────── */
  const total = items.length
  const readCount = total - unreadCount
  const typeCount = useMemo(() => new Set(items.map(n => n.type)).size, [items])

  return (
    <>
      <div className="dv3-root">
        <style>{DASHBOARD_CSS}</style>
        <style>{STAT_CARD_CSS}</style>

        <div className="dv3-terminal">
          {/* HERO */}
          <div className="dv3-hero">
            <div className="dv3-hero-meta">
              <span className="dv3-hero-meta-l">NOTIFY.INBOX</span>
              <span className="dv3-hero-meta-r">KGT {clockKgt}</span>
            </div>
            <div className="dv3-hero-main">
              <div>
                <h1 className="dv3-hero-title">
                  {timeGreeting}. <span className="dv3-accent">{t('notification.title')}</span>
                </h1>
                <p className="dv3-hero-sub">{todayLine}</p>
              </div>
              <div className="dv3-hero-metrics">
                <div className="dv3-hero-metric">
                  <span className={`dv3-hero-metric-num${loading ? ' dv3-loading' : ''}`}>
                    {loading ? PLACEHOLDER : total}
                  </span>
                  <span className="dv3-hero-metric-lab">всего</span>
                </div>
                <div className="dv3-hero-metric">
                  <span className={`dv3-hero-metric-num${loading ? ' dv3-loading' : ''}`}>
                    {loading ? PLACEHOLDER : unreadCount}
                  </span>
                  <span className="dv3-hero-metric-lab">непрочитано</span>
                </div>
              </div>
            </div>
            <div className="dv3-hero-foot">
              <span className="dv3-hero-foot-ok">
                STATUS · ок
              </span>
              <span>{updatedLabel}</span>
            </div>
          </div>

          {/* STAT GRID */}
          <div className="dv3-grid">
            <StatCard
              className="dv3-col-3"
              title="NOTIFY.TOTAL" id="N01" loading={loading}
              value={total} label="уведомлений"
            />
            <StatCard
              className="dv3-col-3"
              title="UNREAD" id="U01" loading={loading}
              value={unreadCount} label="непрочитано"
              gauge={{
                pct: total > 0 ? unreadCount / total : 0, variant: 'meta',
                left: '0',
                center: <><strong>{total > 0 ? Math.round((unreadCount / total) * 100) : 0}%</strong> всех</>,
                right: total,
              }}
            />
            <StatCard
              className="dv3-col-3"
              title="READ" id="R01" loading={loading}
              value={readCount} label="прочитано"
              gauge={{
                pct: total > 0 ? readCount / total : 0, variant: 'meta',
                left: '0',
                center: <><strong>{total > 0 ? Math.round((readCount / total) * 100) : 0}%</strong> всех</>,
                right: total,
              }}
            />
            <StatCard
              className="dv3-col-3"
              title="TYPES" id="T01" loading={loading}
              value={typeCount} label="типов"
            />
          </div>
        </div>
      </div>

      {/* LIST */}
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 32px 48px' }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
          <span
            id="notif-page-title"
            className="font-mono"
            style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--dv3-text3)' }}
          >
            {t('notification.title')}
          </span>
          {unreadCount > 0 && (
            <button
              onClick={() => dispatch(markAllRead())}
              className="font-mono"
              style={{
                fontSize: 11, letterSpacing: '0.04em', textTransform: 'uppercase',
                color: 'var(--dv3-accent)', background: 'none',
                border: 'none', cursor: 'pointer', padding: 0,
              }}
            >
              {t('notification.markAllRead')} ({unreadCount})
            </button>
          )}
        </div>

        {loading ? (
          <div
            className="font-mono"
            style={{ textAlign: 'center', padding: '48px 0', color: 'var(--dv3-text3)' }}
            role="status"
          >
            {t('common.loading', 'Загрузка...')}
          </div>
        ) : items.length === 0 ? (
          <div
            style={{ textAlign: 'center', padding: '48px 0' }}
            role="status"
          >
            <Bell size={48} style={{ margin: '0 auto 16px', color: 'var(--dv3-border)' }} aria-hidden="true" />
            <p className="font-mono" style={{ color: 'var(--dv3-text3)' }}>
              {t('notification.noNotifications')}
            </p>
          </div>
        ) : (
          <ul
            style={{
              background: 'var(--dv3-bg2)', border: '1px solid var(--dv3-border)',
              listStyle: 'none', margin: 0, padding: 0,
            }}
            role="list"
            aria-labelledby="notif-page-title"
          >
            {items.map((n, idx) => {
              const body = pickBody(n)
              const unreadSrLabel = !n.read
                ? `${t('notification.unread', 'Не прочитано')} — ${pickTitle(n)}`
                : undefined
              return (
                <li
                  key={n.id}
                  style={{
                    padding: '16px',
                    borderTop: idx === 0 ? 'none' : '1px solid var(--dv3-border)',
                    background: !n.read ? 'var(--dv3-bg3)' : 'transparent',
                  }}
                  aria-label={unreadSrLabel}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {!n.read && (
                          <span
                            style={{
                              width: 8, height: 8, flexShrink: 0,
                              background: 'var(--dv3-accent)',
                            }}
                            aria-hidden="true"
                          />
                        )}
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--dv3-text)' }}>
                          {pickTitle(n)}
                        </span>
                      </div>
                      {body && (
                        <p style={{ fontSize: 13, color: 'var(--dv3-text3)', marginTop: 4 }}>
                          {body}
                        </p>
                      )}
                    </div>
                    <span
                      className="font-mono"
                      style={{ fontSize: 11, color: 'var(--dv3-text3)', marginLeft: 16, flexShrink: 0 }}
                    >
                      <time dateTime={n.createdAt}>
                        {new Date(n.createdAt).toLocaleString(locale)}
                      </time>
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </>
  )
}
