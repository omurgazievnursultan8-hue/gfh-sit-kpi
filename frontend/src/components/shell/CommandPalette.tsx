import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { Search, CornerDownLeft } from 'lucide-react'
import { NAV_SECTIONS, type Role } from './navConfig'
import { RootState } from '../../app/store'

interface PaletteItem {
  to: string
  label: string
  section: string
  icon: any
}

interface Props {
  open: boolean
  onClose: () => void
}

export function CommandPalette({ open, onClose }: Props) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { role } = useSelector((s: RootState) => s.auth)
  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const allItems: PaletteItem[] = useMemo(() => {
    const out: PaletteItem[] = []
    for (const s of NAV_SECTIONS) {
      if (!role || !s.roles.includes(role as Role)) continue
      for (const g of s.groups) {
        for (const it of g.items) {
          if (!it.roles.includes(role as Role)) continue
          out.push({ to: it.to, label: t(it.labelKey), section: t(s.labelKey), icon: it.icon })
        }
      }
    }
    return out
  }, [role, t])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return allItems
    return allItems
      .map(it => {
        const hay = (it.label + ' ' + it.section + ' ' + it.to).toLowerCase()
        const idx = hay.indexOf(q)
        if (idx >= 0) return { it, score: 1000 - idx }
        let i = 0, j = 0
        while (i < q.length && j < hay.length) { if (q[i] === hay[j]) i++; j++ }
        return i === q.length ? { it, score: 100 - j } : null
      })
      .filter((x): x is { it: PaletteItem; score: number } => !!x)
      .sort((a, b) => b.score - a.score)
      .map(x => x.it)
  }, [allItems, query])

  useEffect(() => {
    if (!open) { setQuery(''); setCursor(0); return }
    const id = window.setTimeout(() => inputRef.current?.focus(), 20)
    return () => window.clearTimeout(id)
  }, [open])

  useEffect(() => { setCursor(0) }, [query])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose() }
      else if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, filtered.length - 1)) }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor(c => Math.max(0, c - 1)) }
      else if (e.key === 'Enter') {
        e.preventDefault()
        const pick = filtered[cursor]
        if (pick) { navigate(pick.to); onClose() }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, filtered, cursor, navigate, onClose])

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${cursor}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [cursor])

  if (!open) return null

  return (
    <div className="cmdk-backdrop" onMouseDown={onClose}>
      <div className="cmdk-panel" onMouseDown={e => e.stopPropagation()}>
        <div className="cmdk-input-row">
          <Search size={16} className="cmdk-input-icon" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={t('palette.placeholder', 'Поиск разделов…')}
            className="cmdk-input"
          />
          <kbd className="cmdk-kbd">ESC</kbd>
        </div>
        <div ref={listRef} className="cmdk-list">
          {filtered.length === 0 && (
            <div className="cmdk-empty">{t('palette.empty', 'Ничего не найдено')}</div>
          )}
          {filtered.map((it, i) => {
            const Icon = it.icon
            return (
              <button
                key={it.to}
                data-idx={i}
                className={`cmdk-item${i === cursor ? ' cmdk-item--active' : ''}`}
                onMouseEnter={() => setCursor(i)}
                onClick={() => { navigate(it.to); onClose() }}
                type="button"
              >
                <Icon size={16} className="cmdk-item-icon" />
                <span className="cmdk-item-label">{it.label}</span>
                <span className="cmdk-item-section">{it.section}</span>
                {i === cursor && <CornerDownLeft size={14} className="cmdk-item-enter" />}
              </button>
            )
          })}
        </div>
        <div className="cmdk-footer">
          <span><kbd className="cmdk-kbd">↑</kbd><kbd className="cmdk-kbd">↓</kbd> {t('palette.navigate', 'выбор')}</span>
          <span><kbd className="cmdk-kbd">↵</kbd> {t('palette.open', 'открыть')}</span>
        </div>
      </div>
    </div>
  )
}
