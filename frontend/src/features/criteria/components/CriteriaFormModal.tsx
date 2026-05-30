import { useState, useEffect, FormEvent, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { Criteria, CriteriaRequest, CriteriaType } from '../criteriaApi'
import { OrgUnit } from '../../org/orgApi'
import { DASHBOARD_CSS } from '../../dashboard/dashboardStyles'
import { DV3_FORM_CSS } from '../../dashboard/dv3FormStyles'

interface Props {
  open: boolean
  editing: Criteria | null
  prefill?: Partial<CriteriaRequest> | null
  orgUnits: OrgUnit[]
  onSave: (data: CriteriaRequest) => Promise<void>
  onClose: () => void
}

interface FlatUnit { id: number; label: string; depth: number }

function flattenUnits(units: OrgUnit[], depth = 0, acc: FlatUnit[] = []): FlatUnit[] {
  for (const u of units) {
    acc.push({ id: u.id, label: u.nameRu, depth })
    if (u.children?.length) flattenUnits(u.children, depth + 1, acc)
  }
  return acc
}

export function CriteriaFormModal({ open, editing, prefill, orgUnits, onSave, onClose }: Props) {
  const { t } = useTranslation()
  const [nameRu, setNameRu] = useState('')
  const [nameKg, setNameKg] = useState('')
  const [descriptionRu, setDescriptionRu] = useState('')
  const [descriptionKg, setDescriptionKg] = useState('')
  const [type, setType] = useState<CriteriaType>('POSITIVE')
  const [weight, setWeight] = useState('')
  const [orgUnitId, setOrgUnitId] = useState<string>('')
  const [autoCalculated, setAutoCalculated] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  type TabKey = 'basic' | 'details' | 'scope'
  const [activeTab, setActiveTab] = useState<TabKey>('basic')
  const [attempted, setAttempted] = useState(false)

  useEffect(() => { if (open) { setActiveTab('basic'); setAttempted(false) } }, [open, editing, prefill])

  useEffect(() => {
    if (!open) return
    if (editing) {
      setNameRu(editing.nameRu)
      setNameKg(editing.nameKg)
      setDescriptionRu(editing.descriptionRu ?? '')
      setDescriptionKg(editing.descriptionKg ?? '')
      setType(editing.type)
      setWeight(editing.weight.toString())
      setOrgUnitId(editing.orgUnitId?.toString() ?? '')
      setAutoCalculated(editing.autoCalculated)
    } else if (prefill) {
      setNameRu(prefill.nameRu ?? '')
      setNameKg(prefill.nameKg ?? '')
      setDescriptionRu(prefill.descriptionRu ?? '')
      setDescriptionKg(prefill.descriptionKg ?? '')
      setType(prefill.type ?? 'POSITIVE')
      setWeight(prefill.weight != null ? prefill.weight.toString() : '')
      setOrgUnitId(prefill.orgUnitId != null ? prefill.orgUnitId.toString() : '')
      setAutoCalculated(prefill.autoCalculated ?? false)
    } else {
      setNameRu(''); setNameKg(''); setDescriptionRu(''); setDescriptionKg('')
      setType('POSITIVE')
      setWeight(''); setOrgUnitId(''); setAutoCalculated(false)
    }
    setError('')
  }, [open, editing, prefill])

  const flatUnits = useMemo(() => flattenUnits(orgUnits), [orgUnits])

  const basicErrors = useMemo(() => {
    const errs: string[] = []
    if (!nameRu.trim()) errs.push('nameRu')
    if (!nameKg.trim()) errs.push('nameKg')
    return errs
  }, [nameRu, nameKg])

  const detailsErrors = useMemo(() => {
    const errs: string[] = []
    const w = parseFloat(weight)
    if (isNaN(w) || w <= 0 || w > 100) errs.push('weight')
    return errs
  }, [weight])

  const scopeErrors: string[] = []
  const tabErrorCount: Record<TabKey, number> = {
    basic: basicErrors.length,
    details: detailsErrors.length,
    scope: scopeErrors.length,
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setAttempted(true)
    if (basicErrors.length) { setActiveTab('basic'); return }
    if (detailsErrors.length) { setActiveTab('details'); setError(t('v2.criteria.formWeightError')); return }
    setLoading(true); setError('')
    try {
      await onSave({
        nameRu, nameKg,
        descriptionRu: descriptionRu.trim() || null,
        descriptionKg: descriptionKg.trim() || null,
        type,
        weight: parseFloat(weight),
        orgUnitId: orgUnitId ? Number(orgUnitId) : null,
        autoCalculated,
      })
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.message_ru || t('v2.criteria.formSaveError'))
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  const titleKicker = editing
    ? t('v2.criteria.formEditTitle')
    : prefill
      ? t('v2.criteria.formDuplicateTitle')
      : t('v2.criteria.formCreateTitle')
  const titleMain = editing ? editing.nameRu : titleKicker

  return (
    <div className="dv3-root">
      <style>{DASHBOARD_CSS}</style>
      <style>{DV3_FORM_CSS}</style>
      <style>{CRIT_MODAL_CSS}</style>

      <div className="crit-modal-scrim" onClick={onClose}>
        <div
          className="crit-modal"
          role="dialog"
          aria-modal="true"
          aria-label={titleKicker}
          onClick={e => e.stopPropagation()}
        >
          <div className="crit-modal-head">
            <div className="crit-modal-head-meta">
              <span className="crit-modal-kicker">{titleKicker}</span>
              <h3>{titleMain}</h3>
            </div>
            <button className="crit-modal-x" onClick={onClose} aria-label="Закрыть" type="button">
              <X size={16} strokeWidth={2.2} aria-hidden="true" />
            </button>
          </div>

          <div className="crit-modal-tabs" role="tablist">
            {([
              { key: 'basic' as const,   label: t('v2.criteria.tabBasic', 'Основное') },
              { key: 'details' as const, label: t('v2.criteria.tabDetails', 'Описание') },
              { key: 'scope' as const,   label: t('v2.criteria.tabScope', 'Область') },
            ]).map(tab => {
              const showErr = attempted && tabErrorCount[tab.key] > 0
              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.key}
                  className={`crit-modal-tab ${activeTab === tab.key ? 'crit-modal-tab--on' : ''}`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  <span>{tab.label}</span>
                  {showErr && <span className="crit-modal-tab-dot" aria-label="ошибки на вкладке" />}
                </button>
              )
            })}
          </div>

          <form onSubmit={handleSubmit} className="crit-modal-body dv3-form">
            <div className="crit-modal-tabpanels">

              <div className={`crit-modal-tabpanel ${activeTab === 'basic' ? '' : 'crit-modal-tabpanel--off'}`}>
                <div className="crit-modal-section">
                  <div className="crit-modal-section-title">{t('v2.criteria.sectionNames', 'Наименование')}</div>
                  <label className="dv3-field">
                    <span className="dv3-label">{t('v2.criteria.formNameRu')} <span className="dv3-req">*</span></span>
                    <input
                      className={`dv3-input ${attempted && !nameRu.trim() ? 'dv3-input--err' : ''}`}
                      value={nameRu}
                      onChange={e => setNameRu(e.target.value)}
                    />
                  </label>
                  <label className="dv3-field">
                    <span className="dv3-label">{t('v2.criteria.formNameKg')} <span className="dv3-req">*</span></span>
                    <input
                      className={`dv3-input ${attempted && !nameKg.trim() ? 'dv3-input--err' : ''}`}
                      value={nameKg}
                      onChange={e => setNameKg(e.target.value)}
                    />
                  </label>
                </div>
              </div>

              <div className={`crit-modal-tabpanel ${activeTab === 'details' ? '' : 'crit-modal-tabpanel--off'}`}>
                <div className="crit-modal-section">
                  <div className="crit-modal-section-title">{t('v2.criteria.sectionRubric', 'Рубрика')}</div>
                  <label className="dv3-field">
                    <span className="dv3-label">{t('v2.criteria.formDescriptionRu', 'Описание (RU)')}</span>
                    <textarea
                      className="dv3-input"
                      value={descriptionRu}
                      onChange={e => setDescriptionRu(e.target.value)}
                      maxLength={4000}
                      rows={3}
                      placeholder="Рубрика оценки — что считается 0, что считается максимум…"
                      style={{ resize: 'vertical', minHeight: 72 }}
                    />
                  </label>
                  <label className="dv3-field">
                    <span className="dv3-label">{t('v2.criteria.formDescriptionKg', 'Сүрөттөмө (KG)')}</span>
                    <textarea
                      className="dv3-input"
                      value={descriptionKg}
                      onChange={e => setDescriptionKg(e.target.value)}
                      maxLength={4000}
                      rows={3}
                      placeholder="Баалоо рубрикасы…"
                      style={{ resize: 'vertical', minHeight: 72 }}
                    />
                  </label>
                </div>

                <div className="crit-modal-section">
                  <div className="crit-modal-section-title">{t('v2.criteria.sectionScoring', 'Оценка')}</div>
                  <div className="crit-modal-grid-2">
                    <label className="dv3-field">
                      <span className="dv3-label">{t('v2.criteria.formType')}</span>
                      <select
                        className="dv3-select"
                        value={type}
                        onChange={e => setType(e.target.value as CriteriaType)}
                        disabled={!!editing}
                      >
                        <option value="POSITIVE">{t('v2.criteria.formTypePositive')}</option>
                        <option value="ANTI_BONUS">{t('v2.criteria.formTypeAntiBonus')}</option>
                      </select>
                      {editing && <span className="dv3-help">{t('v2.criteria.formTypeLocked')}</span>}
                    </label>
                    <label className="dv3-field">
                      <span className="dv3-label">
                        {t('v2.criteria.formWeight')} <span className="dv3-req">*</span>
                        {editing?.frozen && (
                          <span className="crit-modal-chip">{t('v2.criteria.formFrozen')}</span>
                        )}
                      </span>
                      <input
                        className={`dv3-input ${attempted && detailsErrors.includes('weight') ? 'dv3-input--err' : ''}`}
                        type="number"
                        step="0.01"
                        min="0.01"
                        max="100"
                        value={weight}
                        onChange={e => setWeight(e.target.value)}
                        disabled={editing?.frozen}
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className={`crit-modal-tabpanel ${activeTab === 'scope' ? '' : 'crit-modal-tabpanel--off'}`}>
                <div className="crit-modal-section">
                  <div className="crit-modal-section-title">{t('v2.criteria.sectionScope', 'Область применения')}</div>
                  <label className="dv3-field">
                    <span className="dv3-label">{t('v2.criteria.formScope')}</span>
                    <select
                      className="dv3-select"
                      value={orgUnitId}
                      onChange={e => setOrgUnitId(e.target.value)}
                    >
                      <option value="">{t('v2.criteria.formScopeGlobal')}</option>
                      {flatUnits.map(u => (
                        <option key={u.id} value={u.id}>{'  '.repeat(u.depth) + u.label}</option>
                      ))}
                    </select>
                  </label>
                  {type === 'ANTI_BONUS' && (
                    <label className="crit-modal-check">
                      <input
                        type="checkbox"
                        checked={autoCalculated}
                        onChange={e => setAutoCalculated(e.target.checked)}
                      />
                      <span>{t('v2.criteria.formAuto')}</span>
                    </label>
                  )}
                </div>
              </div>

            </div>

            {error && <div className="dv3-banner dv3-banner--error" role="alert">{error}</div>}

            <div className="crit-modal-foot">
              <button type="button" className="dv3-btn" onClick={onClose} disabled={loading}>
                {t('v2.criteria.formCancel')}
              </button>
              <button type="submit" className="dv3-btn dv3-btn--primary" disabled={loading}>
                {loading ? t('v2.criteria.formSaving') : t('v2.criteria.formSave')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

const CRIT_MODAL_CSS = `
.crit-modal-scrim {
  position: fixed; inset: 0; z-index: 60;
  background: rgba(0,0,0,.55);
  backdrop-filter: blur(4px);
  display: grid; place-items: center; padding: 20px;
  animation: crit-modal-fade .18s ease;
}
@keyframes crit-modal-fade { from { opacity: 0; } }
.crit-modal {
  width: 100%; max-width: 720px;
  max-height: calc(100vh - 40px);
  display: flex; flex-direction: column;
  background: var(--dv3-bg2);
  border: 1px solid var(--dv3-border);
  border-top: 2px solid var(--dv3-zone-info);
  color: var(--dv3-text);
  box-shadow: 0 24px 48px -16px rgba(0,0,0,0.35);
  animation: crit-modal-pop .18s cubic-bezier(.2,.7,.3,1.2);
  overflow: hidden;
}
@keyframes crit-modal-pop { from { transform: translateY(8px) scale(.97); opacity: 0; } }
.crit-modal-head {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;
  padding: 18px 22px 14px;
  border-bottom: 1px solid var(--dv3-border);
}
.crit-modal-head-meta { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.crit-modal-kicker {
  font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase;
  color: var(--dv3-text3); font-weight: 600;
}
.crit-modal-head h3 {
  font-size: 16px; font-weight: 600; margin: 0;
  letter-spacing: -0.005em; color: var(--dv3-text);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.crit-modal-x {
  display: grid; place-items: center;
  width: 30px; height: 30px; flex-shrink: 0;
  border: 1px solid var(--dv3-border2);
  background: var(--dv3-bg3);
  color: var(--dv3-text3);
  cursor: pointer;
  transition: background .14s, color .14s, border-color .14s;
}
.crit-modal-x:hover { background: var(--dv3-bg2); color: var(--dv3-text); border-color: var(--dv3-border-hi); }
.crit-modal-tabs {
  display: flex; gap: 2px;
  padding: 0 22px;
  background: var(--dv3-bg);
  border-bottom: 1px solid var(--dv3-border);
}
.crit-modal-tab {
  position: relative;
  display: inline-flex; align-items: center; gap: 8px;
  background: transparent; border: none;
  padding: 12px 16px;
  font-family: inherit;
  font-size: 11px; font-weight: 600;
  letter-spacing: 0.12em; text-transform: uppercase;
  color: var(--dv3-text3);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: color .14s, border-color .14s;
}
.crit-modal-tab:hover { color: var(--dv3-text2); }
.crit-modal-tab--on {
  color: var(--dv3-text);
  border-bottom-color: var(--dv3-accent);
}
.crit-modal-tab-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--dv3-zone-down);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--dv3-zone-down) 22%, transparent);
}
.crit-modal-body {
  padding: 18px 22px 20px;
  display: flex; flex-direction: column;
  gap: 16px;
  overflow-y: auto;
}
.crit-modal-tabpanels {
  position: relative;
  display: grid; grid-template-columns: 1fr;
}
.crit-modal-tabpanel {
  grid-column: 1; grid-row: 1;
  display: flex; flex-direction: column; gap: 16px;
  min-width: 0;
}
.crit-modal-tabpanel--off {
  visibility: hidden;
  pointer-events: none;
}
.dv3-input--err, .dv3-select--err {
  border-color: var(--dv3-zone-down) !important;
  outline: 1px solid color-mix(in srgb, var(--dv3-zone-down) 30%, transparent);
}
.crit-modal-section {
  display: flex; flex-direction: column; gap: 12px;
  padding-top: 14px;
  border-top: 1px solid var(--dv3-border);
}
.crit-modal-section:first-of-type { border-top: none; padding-top: 0; }
.crit-modal-section-title {
  font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase;
  color: var(--dv3-text3); font-weight: 600;
}
.crit-modal-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.crit-modal-chip {
  margin-left: 8px;
  display: inline-block;
  font-size: 9.5px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase;
  padding: 2px 6px;
  background: color-mix(in srgb, var(--dv3-zone-warn, #b27b14) 14%, transparent);
  color: var(--dv3-zone-warn, #b27b14);
  border: 1px solid color-mix(in srgb, var(--dv3-zone-warn, #b27b14) 30%, transparent);
}
.crit-modal-check {
  display: flex; align-items: center; gap: 8px;
  font-size: 13px; color: var(--dv3-text2);
  cursor: pointer;
  user-select: none;
}
.crit-modal-check input { accent-color: var(--dv3-accent); }
.crit-modal-foot {
  display: flex; gap: 10px; justify-content: flex-end;
  padding-top: 14px;
  border-top: 1px solid var(--dv3-border);
}
@media (max-width: 640px) {
  .crit-modal-grid-2 { grid-template-columns: 1fr; }
  .crit-modal-foot { flex-direction: column-reverse; }
  .crit-modal-foot .dv3-btn { width: 100%; }
}
`
