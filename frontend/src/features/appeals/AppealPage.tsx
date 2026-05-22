import { useEffect, useState, FormEvent } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import api from '../../app/api'
import { DASHBOARD_CSS } from '../dashboard/dashboardStyles'
import { DV3_FORM_CSS } from '../dashboard/dv3FormStyles'

export function AppealPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const evaluationId = searchParams.get('evaluationId')

  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [now, setNow] = useState(new Date())

  // Live tick — refresh clock each minute.
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!reason.trim()) { setError('Укажите причину апелляции'); return }
    if (!evaluationId) { setError('Не указан ID оценки'); return }

    setLoading(true); setError('')
    try {
      await api.post('/appeals', { evaluationId: Number(evaluationId), reason })
      navigate('/my-evaluations', { state: { message: 'Апелляция успешно подана' } })
    } catch (err: any) {
      setError(err.response?.data?.message_ru || 'Ошибка при подаче апелляции')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="dv3-root">
        <style>{DASHBOARD_CSS}</style>
        <style>{DV3_FORM_CSS}</style>

        <div className="dv3-terminal">
          {/* HERO */}
          <div className="dv3-hero">
            <div className="dv3-hero-meta">
              <span className="dv3-hero-meta-l">APPEAL.FILE</span>
              <span className="dv3-hero-meta-r">KGT {clockKgt}</span>
            </div>
            <div className="dv3-hero-main">
              <div>
                <h1 className="dv3-hero-title">
                  {timeGreeting}. <span className="dv3-accent">Подать апелляцию</span>
                </h1>
                <p className="dv3-hero-sub">{todayLine}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FORM */}
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 32px 48px' }}>
        <div className="dv3-banner dv3-banner--warn">
          <AlertTriangle size={18} />
          <span>
            Вы не согласны с результатами оценки. Укажите причину — оценщик получит уведомление
            и должен ответить в установленные сроки.
          </span>
        </div>

        <div className="dv3-panel">
          <form onSubmit={handleSubmit} className="dv3-form">
            <div className="dv3-field">
              <label className="dv3-label">
                Причина апелляции <span className="dv3-req">*</span>
              </label>
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                required
                rows={6}
                placeholder="Опишите, с чем именно вы не согласны и почему..."
                className="dv3-textarea"
              />
              <p className="dv3-help">{reason.length} символов</p>
            </div>

            {error && (
              <div className="dv3-banner dv3-banner--error">{error}</div>
            )}

            <div className="dv3-btn-row">
              <button type="button" onClick={() => navigate(-1)} className="dv3-btn">
                Отмена
              </button>
              <button type="submit" disabled={loading || !reason.trim()} className="dv3-btn dv3-btn--primary">
                {loading ? 'Отправка...' : 'Подать апелляцию'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
