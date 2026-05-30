import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ThumbsUp, ThumbsDown, ArrowLeft, Check, Clock3, FileText,
  TrendingUp, TrendingDown, Hash, ChevronRight, Sparkles,
} from 'lucide-react'
import { evaluationsApi, Evaluation } from './evaluationsApi'
import api from '../../app/api'

interface ScoreHistory {
  criteriaId: number
  nameRu: string
  nameKg: string
  type: 'POSITIVE' | 'ANTI_BONUS'
  rawValue: number
  weightedValue: number
  weightSnapshot: number
}

const EVD4_CSS = `
.evd4-root {
  --bg: #f6f8fb;
  --surface: #ffffff;
  --surface-2: #f1f4f8;
  --line: #e4e8ee;
  --line-strong: #cdd4dc;
  --ink: #0f172a;
  --ink-mid: #475569;
  --ink-soft: #94a3b8;
  --lime: #2563eb;
  --lime-deep: #1d4ed8;
  --lime-soft: #eff4ff;
  --coral: #dc2626;
  --coral-soft: #fef2f2;
  --amber: #d97706;
  --amber-soft: #fffbeb;
  --on-accent: #ffffff;
  --display: 'Inter', 'Helvetica Neue', system-ui, sans-serif;
  --text: 'Inter', system-ui, -apple-system, sans-serif;
  --mono: 'JetBrains Mono', 'SF Mono', ui-monospace, monospace;

  font-family: var(--text);
  color: var(--ink);
  background: var(--bg);
  min-height: 100vh;
  position: relative;
}
.evd4-root::before { content: none; }
.evd4-root *, .evd4-root *::before, .evd4-root *::after { box-sizing: border-box; }

.evd4-wrap { max-width: 1320px; margin: 0 auto; padding: 28px 36px 160px; position: relative; z-index: 1; }
@media (max-width: 640px) { .evd4-wrap { padding: 16px 16px 180px; } }

/* ── Top nav ─────────────────────────────────────────────── */
.evd4-top {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 36px;
}
.evd4-crumb {
  display: inline-flex; align-items: center; gap: 10px;
  font-family: var(--mono); font-size: 11px;
  letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--ink-soft);
}
.evd4-crumb button {
  background: 0; border: 0; padding: 0; cursor: pointer;
  color: var(--ink-soft); font: inherit; letter-spacing: inherit; text-transform: inherit;
  display: inline-flex; align-items: center; gap: 8px;
  transition: color 140ms ease;
}
.evd4-crumb button:hover { color: var(--lime); }
.evd4-crumb .sep { color: var(--line-strong); }
.evd4-crumb .here { color: var(--ink); }
.evd4-stamp {
  font-family: var(--mono); font-size: 10px; letter-spacing: 0.16em;
  text-transform: uppercase; color: var(--ink-soft);
  border: 1px solid var(--line); padding: 6px 12px; border-radius: 999px;
  display: inline-flex; align-items: center; gap: 8px;
}
.evd4-stamp i { display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: var(--amber); box-shadow: 0 0 0 3px rgba(255,200,87,0.18); }
.evd4-stamp.is-done i { background: var(--lime); box-shadow: 0 0 0 3px rgba(198,255,61,0.18); }
.evd4-stamp.is-warn i { background: var(--coral); box-shadow: 0 0 0 3px rgba(255,106,91,0.18); }

/* ── Hero ────────────────────────────────────────────────── */
.evd4-hero { display: grid; grid-template-columns: 1.4fr 1fr; gap: 56px; align-items: end; padding-bottom: 28px; border-bottom: 1px solid var(--line); }
@media (max-width: 900px) { .evd4-hero { grid-template-columns: 1fr; gap: 28px; } }

.evd4-hero-l { min-width: 0; }
.evd4-eyebrow {
  font-family: var(--mono); font-size: 11px; font-weight: 600;
  letter-spacing: 0.18em; text-transform: uppercase;
  color: var(--ink-mid); margin-bottom: 18px;
  display: inline-flex; align-items: center; gap: 10px;
}
.evd4-eyebrow .dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: var(--lime); }
.evd4-title {
  font-family: var(--display); font-weight: 600;
  font-size: clamp(34px, 4.4vw, 48px); line-height: 1.08;
  letter-spacing: -0.025em; color: var(--ink); margin: 0;
}
.evd4-title em { font-style: normal; color: var(--lime); font-weight: 600; }
.evd4-sub {
  margin-top: 18px; font-size: 15px; line-height: 1.6;
  color: var(--ink-mid); max-width: 58ch;
}
.evd4-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 22px; }
.evd4-chip {
  display: inline-flex; align-items: center; gap: 8px;
  font-family: var(--mono); font-size: 10.5px;
  letter-spacing: 0.12em; text-transform: uppercase;
  padding: 7px 12px; background: var(--surface);
  border: 1px solid var(--line); border-radius: 999px;
  color: var(--ink-mid);
}
.evd4-chip svg { color: var(--ink-soft); }
.evd4-chip strong { color: var(--ink); font-weight: 600; letter-spacing: 0.06em; }

/* Score block */
.evd4-hero-r { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; }
.evd4-score-label {
  font-family: var(--mono); font-size: 10.5px;
  letter-spacing: 0.22em; text-transform: uppercase; color: var(--ink-soft);
}
.evd4-score-n {
  font-family: var(--display); font-weight: 700;
  font-size: clamp(120px, 16vw, 184px); line-height: 0.92;
  letter-spacing: -0.045em;
  font-feature-settings: 'tnum' 1;
  color: var(--lime);
  margin: -4px 0 0;
}
.evd4-score-n.is-warn { color: var(--amber); }
.evd4-score-n.is-down { color: var(--coral); }
.evd4-score-n.is-empty { color: var(--ink-soft); opacity: 0.45; font-size: clamp(84px, 11vw, 120px); }
.evd4-score-meta {
  display: flex; align-items: center; gap: 18px; margin-top: 8px;
  font-family: var(--mono); font-size: 11px; letter-spacing: 0.16em;
  text-transform: uppercase; color: var(--ink-soft);
}
.evd4-score-meta b {
  color: var(--lime); font-weight: 700;
  padding: 4px 10px; background: var(--lime-soft); border-radius: 999px;
  letter-spacing: 0.12em;
}
.evd4-score-meta b.is-warn { color: var(--amber); background: var(--amber-soft); }
.evd4-score-meta b.is-down { color: var(--coral); background: var(--coral-soft); }
.evd4-score-meta .div { width: 1px; height: 10px; background: var(--line-strong); }

/* ── Composition bar ──────────────────────────────────────── */
.evd4-comp { margin: 48px 0 36px; }
.evd4-comp-head {
  display: flex; align-items: end; justify-content: space-between;
  margin-bottom: 18px;
}
.evd4-comp-head h2 {
  font-family: var(--display); font-weight: 600;
  font-size: 20px; letter-spacing: -0.015em; margin: 0;
  color: var(--ink);
}
.evd4-comp-head h2 em { font-style: normal; color: var(--ink-soft); font-weight: 500; }
.evd4-comp-legend { display: flex; gap: 18px; }
.evd4-comp-legend span {
  font-family: var(--mono); font-size: 10px;
  letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--ink-mid); display: inline-flex; align-items: center; gap: 8px;
}
.evd4-comp-legend i { display: inline-block; width: 10px; height: 10px; border-radius: 2px; }
.evd4-comp-legend .pos i { background: var(--lime); }
.evd4-comp-legend .neg i { background: var(--coral); }
.evd4-comp-legend .empty i { background: var(--line-strong); }

.evd4-comp-bar {
  position: relative; height: 88px;
  background: var(--surface);
  border: 1px solid var(--line); border-radius: 12px;
  display: flex; overflow: hidden;
  isolation: isolate;
  box-shadow: 0 1px 2px rgba(15,23,42,0.04);
}
.evd4-comp-seg {
  position: relative; height: 100%;
  background: var(--lime);
  border-right: 1px solid rgba(255,255,255,0.25);
  cursor: pointer;
  transition: opacity 200ms ease, filter 200ms ease, transform 200ms ease;
  display: flex; flex-direction: column; justify-content: flex-end;
  padding: 10px 12px; min-width: 0;
  animation: evd4-seg-in 700ms cubic-bezier(.22,.7,.2,1) backwards;
}
.evd4-comp-seg.neg { background: var(--coral); }
.evd4-comp-seg.gap { background: repeating-linear-gradient(135deg, var(--surface) 0 6px, var(--surface-2) 6px 12px); cursor: default; }
.evd4-comp-seg.dim:not(.gap) { opacity: 0.22; filter: saturate(0.4); }
.evd4-comp-seg.active { box-shadow: inset 0 0 0 2px var(--ink); z-index: 2; transform: scaleY(1.02); }
.evd4-comp-seg-w {
  font-family: var(--mono); font-size: 10px; font-weight: 600;
  color: rgba(255,255,255,0.85); letter-spacing: 0.06em;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.evd4-comp-seg.gap .evd4-comp-seg-w { color: var(--ink-soft); }
.evd4-comp-seg-n {
  font-family: var(--display); font-size: 22px; font-weight: 600;
  color: var(--on-accent); line-height: 1; margin-top: 2px;
  font-feature-settings: 'tnum' 1;
}
.evd4-comp-seg.narrow .evd4-comp-seg-n,
.evd4-comp-seg.narrow .evd4-comp-seg-w { display: none; }
@keyframes evd4-seg-in {
  from { transform: scaleX(0); transform-origin: left; opacity: 0; }
  to { transform: scaleX(1); opacity: 1; }
}

.evd4-comp-axis {
  display: flex; justify-content: space-between;
  margin-top: 10px; padding: 0 2px;
  font-family: var(--mono); font-size: 10px;
  letter-spacing: 0.14em; color: var(--ink-soft);
}
.evd4-comp-anti {
  margin-top: 14px; display: flex; align-items: center; gap: 12px;
  padding: 14px 18px; border: 1px solid color-mix(in srgb, var(--coral) 24%, transparent);
  border-radius: 10px; background: var(--coral-soft);
}
.evd4-comp-anti-k {
  font-family: var(--mono); font-size: 10px; font-weight: 600;
  letter-spacing: 0.18em; text-transform: uppercase; color: var(--coral);
}
.evd4-comp-anti-v {
  font-family: var(--text); font-size: 18px; font-weight: 700;
  color: var(--coral); font-feature-settings: 'tnum' 1;
  margin-left: auto; letter-spacing: -0.01em;
}

/* ── Two pane: list + detail ─────────────────────────────── */
.evd4-pane { display: grid; grid-template-columns: 1fr 420px; gap: 24px; margin-top: 8px; align-items: start; }
@media (max-width: 1100px) { .evd4-pane { grid-template-columns: 1fr; } }

.evd4-list {
  border: 1px solid var(--line); border-radius: 12px;
  background: var(--surface); overflow: hidden;
  box-shadow: 0 1px 2px rgba(15,23,42,0.04);
}
.evd4-list-head {
  display: grid; grid-template-columns: 30px 1fr 70px 90px 90px;
  gap: 14px; align-items: center;
  padding: 14px 22px;
  border-bottom: 1px solid var(--line);
  background: var(--surface-2);
  font-family: var(--mono); font-size: 9.5px;
  letter-spacing: 0.16em; text-transform: uppercase;
  color: var(--ink-soft);
}
.evd4-list-head span:nth-child(3),
.evd4-list-head span:nth-child(4),
.evd4-list-head span:nth-child(5) { text-align: right; }
.evd4-row {
  display: grid; grid-template-columns: 30px 1fr 70px 90px 90px;
  gap: 14px; align-items: center;
  padding: 18px 22px;
  border-top: 1px solid color-mix(in srgb, var(--line) 70%, transparent);
  cursor: pointer; position: relative;
  transition: background 140ms ease;
}
.evd4-row:first-of-type { border-top: 0; }
.evd4-row:hover { background: var(--surface-2); }
.evd4-row.active { background: var(--surface-2); }
.evd4-row.active::before {
  content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px;
  background: var(--lime);
}
.evd4-row.neg.active::before { background: var(--coral); }
.evd4-row-idx {
  font-family: var(--mono); font-size: 11px;
  color: var(--ink-soft); letter-spacing: 0.06em;
  font-feature-settings: 'tnum' 1;
}
.evd4-row-name {
  display: flex; flex-direction: column; gap: 4px; min-width: 0;
}
.evd4-row-name b {
  font-family: var(--text); font-weight: 600; font-size: 14.5px;
  color: var(--ink); letter-spacing: -0.005em; line-height: 1.3;
}
.evd4-row-name small {
  font-family: var(--mono); font-size: 10px;
  letter-spacing: 0.12em; text-transform: uppercase;
  color: var(--ink-soft);
}
.evd4-row-name small .badge {
  color: var(--coral); margin-left: 8px;
}
.evd4-row-w, .evd4-row-raw, .evd4-row-wt {
  font-family: var(--mono); font-size: 12px; text-align: right;
  font-feature-settings: 'tnum' 1; color: var(--ink-mid);
}
.evd4-row-raw {
  font-family: var(--text); font-size: 18px; font-weight: 600;
  color: var(--ink); line-height: 1; font-feature-settings: 'tnum' 1;
}
.evd4-row-wt {
  font-family: var(--text); font-size: 16px; font-weight: 700;
  color: var(--lime); line-height: 1; font-feature-settings: 'tnum' 1;
}
.evd4-row.neg .evd4-row-wt { color: var(--coral); }

@media (max-width: 720px) {
  .evd4-list-head { display: none; }
  .evd4-row {
    grid-template-columns: 30px 1fr auto; gap: 12px;
    padding: 14px 16px;
  }
  .evd4-row-w, .evd4-row-raw { display: none; }
}

/* Detail card */
.evd4-detail {
  border: 1px solid var(--line); border-radius: 12px;
  background: var(--surface); padding: 24px;
  position: sticky; top: 24px;
  display: flex; flex-direction: column; gap: 18px;
  min-height: 320px;
  box-shadow: 0 1px 2px rgba(15,23,42,0.04);
}
@media (max-width: 1100px) { .evd4-detail { position: static; } }
.evd4-detail-head {
  display: flex; align-items: center; gap: 10px;
  padding-bottom: 14px; border-bottom: 1px solid var(--line);
}
.evd4-detail-tag {
  font-family: var(--mono); font-size: 10px;
  letter-spacing: 0.18em; text-transform: uppercase;
  color: var(--lime); display: inline-flex; align-items: center; gap: 6px;
}
.evd4-detail.neg .evd4-detail-tag { color: var(--coral); }
.evd4-detail h3 {
  margin: 0; font-family: var(--display);
  font-weight: 600; font-size: 18px; line-height: 1.3;
  letter-spacing: -0.01em; color: var(--ink);
}
.evd4-detail-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 14px;
}
.evd4-stat {
  border: 1px solid var(--line); border-radius: 10px;
  padding: 12px 14px; background: var(--bg);
}
.evd4-stat-k {
  font-family: var(--mono); font-size: 9.5px;
  letter-spacing: 0.16em; text-transform: uppercase;
  color: var(--ink-soft); margin-bottom: 6px;
}
.evd4-stat-v {
  font-family: var(--text); font-size: 24px; font-weight: 700;
  color: var(--ink); line-height: 1; font-feature-settings: 'tnum' 1;
  letter-spacing: -0.02em;
}
.evd4-stat-v.pos { color: var(--lime); }
.evd4-stat-v.neg { color: var(--coral); }
.evd4-detail-note {
  font-size: 13px; line-height: 1.6; color: var(--ink-mid);
  padding: 12px 14px;
  background: var(--surface-2);
  border-radius: 8px;
  border-left: 3px solid var(--lime);
  font-family: var(--text);
}
.evd4-detail-placeholder {
  color: var(--ink-soft); font-family: var(--mono); font-size: 11px;
  letter-spacing: 0.14em; text-transform: uppercase; text-align: center;
  padding: 60px 12px;
}

/* ── Timeline ─────────────────────────────────────────────── */
.evd4-timeline { margin-top: 64px; padding-top: 36px; border-top: 1px solid var(--line); }
.evd4-timeline-head {
  font-family: var(--display); font-weight: 600; font-size: 20px;
  letter-spacing: -0.015em; margin: 0 0 24px;
  color: var(--ink);
}
.evd4-timeline-head em { font-style: normal; color: var(--ink-soft); font-weight: 500; }
.evd4-tl { position: relative; padding-left: 28px; }
.evd4-tl::before {
  content: ''; position: absolute; left: 7px; top: 6px; bottom: 6px;
  width: 1px; background: var(--line-strong);
}
.evd4-tl-step {
  display: grid; grid-template-columns: 1fr auto; gap: 16px; align-items: baseline;
  padding: 16px 0; position: relative;
  border-bottom: 1px solid color-mix(in srgb, var(--line) 70%, transparent);
}
.evd4-tl-step:last-child { border-bottom: 0; }
.evd4-tl-dot {
  position: absolute; left: -28px; top: 22px;
  width: 14px; height: 14px; border-radius: 50%;
  background: var(--bg); border: 1px solid var(--line-strong);
}
.evd4-tl-step.done .evd4-tl-dot { background: var(--lime); border-color: var(--lime); }
.evd4-tl-step.current .evd4-tl-dot {
  background: var(--amber); border-color: var(--amber);
  box-shadow: 0 0 0 5px rgba(255,200,87,0.15);
  animation: evd4-pulse 2.2s ease-in-out infinite;
}
@keyframes evd4-pulse {
  0%, 100% { box-shadow: 0 0 0 5px rgba(255,200,87,0.15); }
  50% { box-shadow: 0 0 0 10px rgba(255,200,87,0.05); }
}
.evd4-tl-body { display: flex; flex-direction: column; gap: 4px; }
.evd4-tl-name {
  font-family: var(--text); font-size: 15px; font-weight: 600; color: var(--ink);
  letter-spacing: -0.005em;
}
.evd4-tl-step.current .evd4-tl-name { color: var(--amber); }
.evd4-tl-meta {
  font-family: var(--mono); font-size: 10.5px;
  letter-spacing: 0.14em; text-transform: uppercase; color: var(--ink-soft);
}
.evd4-tl-time {
  font-family: var(--mono); font-size: 11px;
  letter-spacing: 0.08em; color: var(--ink-mid);
  font-feature-settings: 'tnum' 1;
}

/* ── Action dock (sticky bottom) ──────────────────────────── */
.evd4-dock {
  position: fixed; left: 0; right: 0; bottom: 0; z-index: 50;
  padding: 18px 36px;
  background: rgba(255,255,255,0.92);
  backdrop-filter: blur(18px) saturate(140%);
  -webkit-backdrop-filter: blur(18px) saturate(140%);
  border-top: 1px solid var(--line);
  box-shadow: 0 -8px 24px -12px rgba(15,23,42,0.08);
}
.evd4-dock::before {
  content: ''; position: absolute; left: 0; right: 0; top: 0;
  height: 2px; background: var(--lime);
}
@keyframes evd4-shimmer {
  from { background-position: 0% 0; }
  to { background-position: 200% 0; }
}
.evd4-dock-inner {
  max-width: 1320px; margin: 0 auto;
  display: grid; grid-template-columns: 1fr auto auto;
  gap: 14px; align-items: center;
}
@media (max-width: 760px) {
  .evd4-dock { padding: 14px 16px; }
  .evd4-dock-inner { grid-template-columns: 1fr; }
}
.evd4-dock-input {
  width: 100%;
  padding: 13px 16px;
  background: var(--surface); border: 1px solid var(--line); border-radius: 10px;
  color: var(--ink); font: 13px/1.4 var(--text); outline: none;
  transition: border-color 140ms ease, box-shadow 140ms ease;
}
.evd4-dock-input::placeholder { color: var(--ink-soft); }
.evd4-dock-input:focus { border-color: var(--lime); box-shadow: 0 0 0 3px rgba(198,255,61,0.15); }

.evd4-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 9px;
  padding: 13px 22px;
  font-family: var(--mono); font-size: 11px; font-weight: 600;
  letter-spacing: 0.16em; text-transform: uppercase;
  border-radius: 10px; cursor: pointer;
  transition: transform 80ms ease, background 140ms ease, color 140ms ease, border-color 140ms ease;
  border: 1px solid transparent;
}
.evd4-btn:active { transform: translateY(1px); }
.evd4-btn:focus-visible { outline: 2px solid var(--lime); outline-offset: 2px; }
.evd4-btn--agree { background: var(--lime); color: var(--on-accent); box-shadow: 0 1px 2px rgba(37,99,235,0.25); }
.evd4-btn--agree:hover { background: var(--lime-deep); }
.evd4-btn--disagree {
  background: var(--surface); color: var(--coral);
  border-color: color-mix(in srgb, var(--coral) 40%, transparent);
}
.evd4-btn--disagree:hover { background: var(--coral); color: var(--on-accent); border-color: var(--coral); }
.evd4-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

.evd4-done {
  border: 1px solid var(--line); border-radius: 14px;
  background: var(--surface); padding: 28px;
  display: flex; align-items: center; gap: 18px;
  margin-top: 36px;
}
.evd4-done-icon {
  width: 48px; height: 48px; border-radius: 12px;
  background: rgba(198,255,61,0.1); color: var(--lime);
  display: grid; place-items: center; flex: none;
}
.evd4-done h3 { margin: 0 0 4px; font-family: var(--display); font-weight: 500; font-size: 18px; color: var(--ink); }
.evd4-done p { margin: 0; color: var(--ink-soft); font-size: 13px; }

.evd4-empty {
  padding: 80px 20px; text-align: center;
  font-family: var(--mono); font-size: 11px;
  letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--ink-soft);
}

@media (prefers-reduced-motion: reduce) {
  .evd4-comp-seg, .evd4-tl-step.current .evd4-tl-dot, .evd4-dock::before { animation: none; }
}
`

const formatDate = (iso: string | null) => {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}
const formatDateTime = (iso: string | null) => {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const zoneClass = (score: number | null): '' | 'is-warn' | 'is-down' => {
  if (score === null) return ''
  if (score >= 80) return ''
  if (score >= 50) return 'is-warn'
  return 'is-down'
}
const zoneLabel = (score: number | null) => {
  if (score === null) return 'Нет данных'
  if (score >= 80) return 'Высокая зона'
  if (score >= 50) return 'Средняя зона'
  return 'Низкая зона'
}
const statusLabel: Record<string, string> = {
  DRAFT: 'Черновик', SUBMITTED: 'На рассмотрении',
  ACKNOWLEDGED: 'Принято', APPEALED: 'Апелляция', CLOSED: 'Закрыто',
}

export function EvaluationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const evaluationId = Number(id)

  const [evaluation, setEvaluation] = useState<Evaluation | null>(null)
  const [scores, setScores] = useState<ScoreHistory[]>([])
  const [reacting, setReacting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [comment, setComment] = useState('')
  const [selected, setSelected] = useState<number | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    Promise.all([
      evaluationsApi.get(evaluationId),
      api.get<ScoreHistory[]>(`/evaluations/${evaluationId}/score-history`).catch(() => ({ data: [] })),
    ]).then(([eval_, hist]) => {
      setEvaluation(eval_)
      setScores(hist.data)
      if (hist.data.length) setSelected(hist.data[0].criteriaId)
    }).finally(() => setLoading(false))
  }, [evaluationId])

  const react = async (reaction: 'AGREE' | 'DISAGREE') => {
    setReacting(true)
    try {
      await api.post(`/evaluations/${evaluationId}/reaction`, { reaction, comment })
      if (reaction === 'AGREE') navigate('/my-evaluations')
      else navigate(`/appeals/new?evaluationId=${evaluationId}`)
    } catch (err: any) {
      alert(err.response?.data?.message_ru || 'Ошибка')
    } finally {
      setReacting(false)
    }
  }

  const derived = useMemo(() => {
    const positive = scores.filter(s => s.type === 'POSITIVE')
    const negative = scores.filter(s => s.type === 'ANTI_BONUS')
    const positiveSum = positive.reduce((a, s) => a + s.weightedValue, 0)
    const negativeSum = negative.reduce((a, s) => a + Math.abs(s.weightedValue), 0)
    return { positive, negative, positiveSum, negativeSum }
  }, [scores])

  if (loading) {
    return (
      <div className="evd4-root">
        <style>{EVD4_CSS}</style>
        <div className="evd4-wrap"><div className="evd4-empty">Загрузка…</div></div>
      </div>
    )
  }
  if (!evaluation) {
    return (
      <div className="evd4-root">
        <style>{EVD4_CSS}</style>
        <div className="evd4-wrap">
          <div className="evd4-empty" style={{ color: 'var(--coral)' }}>Оценка не найдена</div>
        </div>
      </div>
    )
  }

  const finalScore = evaluation.finalScore
  const scoreWhole = finalScore !== null ? Math.round(finalScore) : null
  const scoreClamped = Math.max(0, Math.min(100, scoreWhole ?? 0))
  const zone = zoneClass(scoreWhole)
  const idCode = `EV-${String(evaluation.id).padStart(6, '0')}`
  const isActionable = evaluation.status === 'SUBMITTED'
  const isDone = evaluation.status === 'ACKNOWLEDGED' || evaluation.status === 'CLOSED'

  const stampClass = isDone ? 'is-done' : evaluation.status === 'APPEALED' ? 'is-warn' : ''

  const stepDefs = [
    { key: 'DRAFT', name: 'Создание черновика', who: 'Оценщик', time: evaluation.createdAt },
    { key: 'SUBMITTED', name: 'Отправлено сотруднику', who: evaluation.evaluatorName, time: evaluation.submittedAt },
    { key: 'ACKNOWLEDGED', name: 'Принято сотрудником', who: evaluation.evaluateeName, time: null },
    { key: 'CLOSED', name: 'Закрытие периода', who: 'Система', time: null },
  ]
  const stateOrder = ['DRAFT', 'SUBMITTED', 'ACKNOWLEDGED', 'CLOSED']
  const currentIdx = evaluation.status === 'APPEALED' ? 2 : Math.max(0, stateOrder.indexOf(evaluation.status))

  const selectedScore = scores.find(s => s.criteriaId === selected)

  return (
    <div className="evd4-root">
      <style>{EVD4_CSS}</style>

      <div className="evd4-wrap">
        {/* TOP */}
        <div className="evd4-top">
          <nav className="evd4-crumb">
            <button onClick={() => navigate('/my-evaluations')}>
              <ArrowLeft size={13} /> Мои оценки
            </button>
            <ChevronRight size={13} className="sep" />
            <span className="here">{idCode}</span>
          </nav>
          <span className={`evd4-stamp ${stampClass}`}>
            <i />{statusLabel[evaluation.status] ?? evaluation.status}
          </span>
        </div>

        {/* HERO */}
        <section className="evd4-hero">
          <div className="evd4-hero-l">
            <div className="evd4-eyebrow">
              <span className="dot" />Досье {idCode} · Период {evaluation.periodType}
            </div>
            <h1 className="evd4-title">
              Оценка <em>эффективности</em><br />за {evaluation.periodType === 'MONTHLY' ? 'месяц' : evaluation.periodType === 'QUARTERLY' ? 'квартал' : 'год'}.
            </h1>
            <p className="evd4-sub">
              Декомпозиция итогового балла по {scores.length} критериям. Положительные взносы сформировали{' '}
              <strong style={{ color: 'var(--lime)' }}>+{derived.positiveSum.toFixed(1)}</strong>
              {derived.negativeSum > 0 && <>, антибонусы вычли <strong style={{ color: 'var(--coral)' }}>−{derived.negativeSum.toFixed(1)}</strong></>}.
            </p>
            <div className="evd4-chips">
              <span className="evd4-chip"><Hash size={12} />Период<strong>#{evaluation.periodId}</strong></span>
              <span className="evd4-chip"><FileText size={12} />Оценщик<strong>{evaluation.evaluatorName}</strong></span>
              <span className="evd4-chip"><Clock3 size={12} />Отправлено<strong>{formatDate(evaluation.submittedAt)}</strong></span>
            </div>
          </div>

          <div className="evd4-hero-r">
            <span className="evd4-score-label">Итоговый балл</span>
            <span className={`evd4-score-n ${scoreWhole === null ? 'is-empty' : zone}`}>
              {scoreWhole !== null ? scoreWhole : '—'}
            </span>
            <div className="evd4-score-meta">
              <span>из 100</span>
              <span className="div" />
              <b className={zone}>{zoneLabel(scoreWhole)}</b>
            </div>
          </div>
        </section>

        {/* COMPOSITION */}
        <section className="evd4-comp">
          <div className="evd4-comp-head">
            <h2>Композиция <em>балла</em></h2>
            <div className="evd4-comp-legend">
              <span className="pos"><i />Положительные</span>
              {derived.negative.length > 0 && <span className="neg"><i />Антибонусы</span>}
              <span className="empty"><i />Свободно</span>
            </div>
          </div>

          <CompositionBar
            positive={derived.positive}
            total={100}
            selected={selected}
            onSelect={setSelected}
          />

          <div className="evd4-comp-axis">
            <span>0</span><span>25</span><span>50</span><span>75</span><span>100</span>
          </div>

          {derived.negative.length > 0 && (
            <div className="evd4-comp-anti">
              <span className="evd4-comp-anti-k">Антибонусы (вычеты)</span>
              <span style={{ flex: 1, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {derived.negative.map(n => (
                  <button
                    key={n.criteriaId}
                    onClick={() => setSelected(n.criteriaId)}
                    style={{
                      background: selected === n.criteriaId ? 'var(--coral)' : 'transparent',
                      color: selected === n.criteriaId ? '#0a0d10' : 'var(--coral)',
                      border: '1px solid color-mix(in srgb, var(--coral) 50%, transparent)',
                      padding: '5px 11px', borderRadius: 999,
                      fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.12em',
                      textTransform: 'uppercase', cursor: 'pointer',
                    }}
                  >
                    {n.nameRu} −{Math.abs(n.weightedValue).toFixed(1)}
                  </button>
                ))}
              </span>
              <span className="evd4-comp-anti-v">−{derived.negativeSum.toFixed(2)}</span>
            </div>
          )}
        </section>

        {/* PANE */}
        <div className="evd4-pane">
          <div className="evd4-list" ref={listRef}>
            <div className="evd4-list-head">
              <span>№</span><span>Критерий</span><span>Вес</span><span>Сырой</span><span>Взвеш.</span>
            </div>
            {scores.length === 0 && <div className="evd4-empty">Критерии не загружены</div>}
            {scores.map((s, i) => {
              const isNeg = s.type === 'ANTI_BONUS'
              const active = selected === s.criteriaId
              return (
                <div
                  key={s.criteriaId}
                  className={`evd4-row ${isNeg ? 'neg' : ''} ${active ? 'active' : ''}`}
                  onClick={() => setSelected(s.criteriaId)}
                >
                  <span className="evd4-row-idx">{String(i + 1).padStart(2, '0')}</span>
                  <div className="evd4-row-name">
                    <b>{s.nameRu}</b>
                    <small>
                      {s.nameKg}
                      {isNeg && <span className="badge">· антибонус</span>}
                    </small>
                  </div>
                  <span className="evd4-row-w">{s.weightSnapshot}%</span>
                  <span className="evd4-row-raw">{s.rawValue.toFixed(2)}</span>
                  <span className="evd4-row-wt">{isNeg ? '−' : '+'}{Math.abs(s.weightedValue).toFixed(2)}</span>
                </div>
              )
            })}
          </div>

          <aside className={`evd4-detail ${selectedScore?.type === 'ANTI_BONUS' ? 'neg' : ''}`}>
            {selectedScore ? (
              <>
                <div className="evd4-detail-head">
                  <span className="evd4-detail-tag">
                    {selectedScore.type === 'ANTI_BONUS' ? <><TrendingDown size={12} />Антибонус</> : <><TrendingUp size={12} />Положительный</>}
                  </span>
                </div>
                <h3>{selectedScore.nameRu}</h3>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-soft)', letterSpacing: '0.1em', marginTop: -8 }}>
                  {selectedScore.nameKg}
                </div>
                <div className="evd4-detail-grid">
                  <div className="evd4-stat">
                    <div className="evd4-stat-k">Сырой балл</div>
                    <div className="evd4-stat-v">{selectedScore.rawValue.toFixed(2)}</div>
                  </div>
                  <div className="evd4-stat">
                    <div className="evd4-stat-k">Вес</div>
                    <div className="evd4-stat-v">{selectedScore.weightSnapshot}<span style={{ fontSize: 14, color: 'var(--ink-soft)' }}>%</span></div>
                  </div>
                  <div className="evd4-stat" style={{ gridColumn: '1 / -1' }}>
                    <div className="evd4-stat-k">Взвешенный вклад</div>
                    <div className={`evd4-stat-v ${selectedScore.type === 'ANTI_BONUS' ? 'neg' : 'pos'}`}>
                      {selectedScore.type === 'ANTI_BONUS' ? '−' : '+'}{Math.abs(selectedScore.weightedValue).toFixed(2)}
                    </div>
                  </div>
                </div>
                <div className="evd4-detail-note">
                  <Sparkles size={14} style={{ display: 'inline', verticalAlign: -2, marginRight: 6, color: 'var(--ink-soft)' }} />
                  Формула: сырой балл × {selectedScore.weightSnapshot}% = {selectedScore.weightedValue.toFixed(2)}. Итоговый балл — сумма всех вкладов с нижней границей нуля.
                </div>
              </>
            ) : (
              <div className="evd4-detail-placeholder">Выберите критерий ↑</div>
            )}
          </aside>
        </div>

        {/* TIMELINE */}
        <section className="evd4-timeline">
          <h2 className="evd4-timeline-head">Жизненный <em>цикл</em></h2>
          <div className="evd4-tl">
            {stepDefs.map((s, i) => {
              const state = i < currentIdx ? 'done' : i === currentIdx ? 'current' : ''
              return (
                <div key={s.key} className={`evd4-tl-step ${state}`}>
                  <span className="evd4-tl-dot">
                    {i < currentIdx && <Check size={10} style={{ display: 'block', margin: '1px auto', color: '#ffffff' }} strokeWidth={3} />}
                  </span>
                  <div className="evd4-tl-body">
                    <span className="evd4-tl-name">{s.name}</span>
                    <span className="evd4-tl-meta">{s.who}</span>
                  </div>
                  <span className="evd4-tl-time">{formatDateTime(s.time)}</span>
                </div>
              )
            })}
          </div>
        </section>

        {/* DONE STATE */}
        {isDone && (
          <div className="evd4-done">
            <div className="evd4-done-icon"><Check size={22} /></div>
            <div>
              <h3>Оценка подписана</h3>
              <p>Запись передана в архив. Изменения недоступны.</p>
            </div>
          </div>
        )}
      </div>

      {/* ACTION DOCK */}
      {isActionable && (
        <div className="evd4-dock">
          <div className="evd4-dock-inner">
            <input
              className="evd4-dock-input"
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Комментарий к решению (необязательно)…"
            />
            <button onClick={() => react('DISAGREE')} disabled={reacting} className="evd4-btn evd4-btn--disagree">
              <ThumbsDown size={14} /> Апелляция
            </button>
            <button onClick={() => react('AGREE')} disabled={reacting} className="evd4-btn evd4-btn--agree">
              <ThumbsUp size={14} /> Согласен
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

interface CompositionBarProps {
  positive: ScoreHistory[]
  total: number
  selected: number | null
  onSelect: (id: number) => void
}

function CompositionBar({ positive, total, selected, onSelect }: CompositionBarProps) {
  const positiveSum = positive.reduce((a, s) => a + s.weightedValue, 0)
  const filledPct = Math.min(100, (positiveSum / total) * 100)
  const gapPct = Math.max(0, 100 - filledPct)
  const anyActive = selected !== null && positive.some(p => p.criteriaId === selected)

  return (
    <div className="evd4-comp-bar" role="list">
      {positive.map((s, i) => {
        const pct = (s.weightedValue / total) * 100
        const narrow = pct < 7
        const active = selected === s.criteriaId
        const dim = anyActive && !active
        return (
          <div
            key={s.criteriaId}
            role="listitem"
            className={`evd4-comp-seg ${narrow ? 'narrow' : ''} ${active ? 'active' : ''} ${dim ? 'dim' : ''}`}
            style={{ width: `${pct}%`, animationDelay: `${i * 60}ms` }}
            onClick={() => onSelect(s.criteriaId)}
            title={`${s.nameRu} · ${s.weightedValue.toFixed(2)}`}
          >
            <span className="evd4-comp-seg-w">{s.weightSnapshot}%</span>
            <span className="evd4-comp-seg-n">{s.weightedValue.toFixed(1)}</span>
          </div>
        )
      })}
      {gapPct > 0.5 && (
        <div className={`evd4-comp-seg gap ${anyActive ? 'dim' : ''}`} style={{ width: `${gapPct}%` }}>
          <span className="evd4-comp-seg-w">{gapPct.toFixed(0)}%</span>
          <span className="evd4-comp-seg-n" style={{ color: 'var(--ink-soft)' }}>—</span>
        </div>
      )}
    </div>
  )
}
