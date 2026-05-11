import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { Search, CornerDownLeft, Star, RotateCcw, Hash } from 'lucide-react'
import { NAV_SECTIONS, type Role } from './navConfig'
import { RootState } from '../../app/store'
import { getRecents, getFavs, toggleFav, pushRecent } from './navMemory'

interface PaletteItem {
  to: string
  label: string
  section: string
  icon: any
  chord?: string
}

interface Props {
  open: boolean
  onClose: () => void
}

type Group = 'fav' | 'recent' | 'all'
interface Row { kind: Group; item: PaletteItem }

export function CommandPalette({ open, onClose }: Props) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { role, userId } = useSelector((s: RootState) => s.auth)
  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)
  const [favs, setFavs] = useState<string[]>(() => getFavs(userId))
  const [recents, setRecents] = useState<string[]>(() => getRecents(userId))
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const allItems: PaletteItem[] = useMemo(() => {
    const out: PaletteItem[] = []
    for (const s of NAV_SECTIONS) {
      if (!role || !s.roles.includes(role as Role)) continue
      for (const g of s.groups) {
        for (const it of g.items) {
          if (!it.roles.includes(role as Role)) continue
          out.push({ to: it.to, label: t(it.labelKey), section: t(s.labelKey), icon: it.icon, chord: it.chord })
        }
      }
    }
    return out
  }, [role, t])

  const byTo = useMemo(() => {
    const m = new Map<string, PaletteItem>()
    allItems.forEach(i => m.set(i.to, i))
    return m
  }, [allItems])

  // Empty query → sectioned (favs, recents, all). Non-empty → flat ranked filter.
  const rows: Row[] = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) {
      const out: Row[] = []
      const seen = new Set<string>()
      favs.forEach(to => {
        const it = byTo.get(to); if (!it || seen.has(to)) return
        seen.add(to); out.push({ kind: 'fav', item: it })
      })
      recents.forEach(to => {
        if (seen.has(to)) return
        const it = byTo.get(to); if (!it) return
        seen.add(to); out.push({ kind: 'recent', item: it })
      })
      allItems.forEach(it => {
        if (seen.has(it.to)) return
        seen.add(it.to); out.push({ kind: 'all', item: it })
      })
      return out
    }
    return allItems
      .map(it => {
        const hay = (it.label + ' ' + it.section + ' ' + it.to).toLowerCase()
        const idx = hay.indexOf(q)
        if (idx >= 0) return { item: it, score: 1000 - idx }
        let i = 0, j = 0
        while (i < q.length && j < hay.length) { if (q[i] === hay[j]) i++; j++ }
        return i === q.length ? { item: it, score: 100 - j } : null
      })
      .filter((x): x is { item: PaletteItem; score: number } => !!x)
      .sort((a, b) => b.score - a.score)
      .map(x => ({ kind: 'all' as Group, item: x.item }))
  }, [query, allItems, byTo, favs, recents])

  useEffect(() => {
    if (!open) { setQuery(''); setCursor(0); return }
    setFavs(getFavs(userId))
    setRecents(getRecents(userId))
    const id = window.setTimeout(() => inputRef.current?.focus(), 20)
    return () => window.clearTimeout(id)
  }, [open, userId])

  useEffect(() => { setCursor(0) }, [query])

  const choose = (to: string) => { pushRecent(userId, to); navigate(to); onClose() }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose() }
      else if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, rows.length - 1)) }
      else if (e.key === 'ArrowUp')   { e.preventDefault(); setCursor(c => Math.max(0, c - 1)) }
      else if (e.key === 'Enter') {
        e.preventDefault()
        const pick = rows[cursor]
        if (pick) choose(pick.item.to)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, rows, cursor, userId])

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${cursor}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [cursor])

  const handleStar = (e: React.MouseEvent, to: string) => {
    e.stopPropagation()
    e.preventDefault()
    setFavs(toggleFav(userId, to))
  }

  if (!open) return null

  // Compute section markers (which row index starts a new group, only when query empty).
  const showSections = query.trim() === ''
  let lastKind: Group | null = null

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
          {rows.length === 0 && (
            <div className="cmdk-empty">{t('palette.empty', 'Ничего не найдено')}</div>
          )}
          {rows.map((row, i) => {
            const it = row.item
            const Icon = it.icon
            const isFav = favs.includes(it.to)
            const header = showSections && row.kind !== lastKind ? row.kind : null
            lastKind = row.kind
            return (
              <div key={it.to}>
                {header && (
                  <div className="cmdk-section">
                    <span className="cmdk-section-label">
                      {header === 'fav' && t('palette.favs', 'Закреплённые')}
                      {header === 'recent' && t('palette.recent', 'Недавнее')}
                      {header === 'all' && t('palette.all', 'Все разделы')}
                    </span>
                    <span className="cmdk-section-rule" aria-hidden="true" />
                  </div>
                )}
                <button
                  data-idx={i}
                  className={`cmdk-item${i === cursor ? ' cmdk-item--active' : ''}`}
                  onMouseEnter={() => setCursor(i)}
                  onClick={() => choose(it.to)}
                  type="button"
                >
                  <span className="cmdk-item-glyph" aria-hidden="true">
                    {row.kind === 'fav' && <Star size={13} className="cmdk-item-fav-on" fill="currentColor" />}
                    {row.kind === 'recent' && <RotateCcw size={13} className="cmdk-item-recent" />}
                    {row.kind === 'all' && <Hash size={13} className="cmdk-item-hash" />}
                  </span>
                  <Icon size={16} className="cmdk-item-icon" />
                  <span className="cmdk-item-label">{it.label}</span>
                  <span className="cmdk-item-section">{it.section}</span>
                  {it.chord && (
                    <span className="cmdk-item-chord" title="Keyboard shortcut">
                      <kbd>g</kbd><kbd>{it.chord}</kbd>
                    </span>
                  )}
                  <button
                    type="button"
                    className={`cmdk-fav-btn${isFav ? ' active' : ''}`}
                    onClick={e => handleStar(e, it.to)}
                    title={isFav ? t('palette.unpin', 'Открепить') : t('palette.pin', 'Закрепить')}
                    aria-label={isFav ? 'unpin' : 'pin'}
                  >
                    <Star size={14} fill={isFav ? 'currentColor' : 'none'} />
                  </button>
                  {i === cursor && <CornerDownLeft size={14} className="cmdk-item-enter" />}
                </button>
              </div>
            )
          })}
        </div>
        <div className="cmdk-footer">
          <span><kbd className="cmdk-kbd">↑</kbd><kbd className="cmdk-kbd">↓</kbd> {t('palette.navigate', 'выбор')}</span>
          <span><kbd className="cmdk-kbd">↵</kbd> {t('palette.open', 'открыть')}</span>
          <span><Star size={11} /> {t('palette.pinHint', 'закрепить')}</span>
        </div>
      </div>
    </div>
  )
}
