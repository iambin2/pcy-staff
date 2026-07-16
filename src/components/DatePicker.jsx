import { useEffect, useRef, useState } from 'react'

const WD = ['일', '월', '화', '수', '목', '금', '토']
const pad2 = (n) => String(n).padStart(2, '0')
const fmt = (y, m, d) => `${y}-${pad2(m + 1)}-${pad2(d)}`
function parse(v) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || '')
  return m ? { y: +m[1], mo: +m[2] - 1, d: +m[3] } : null
}

export default function DatePicker({ value, onChange, ariaLabel, allowClear }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const today = new Date()
  const sel = parse(value)
  const [view, setView] = useState(sel ? { y: sel.y, m: sel.mo } : { y: today.getFullYear(), m: today.getMonth() })

  useEffect(() => { if (open) { const s = parse(value); if (s) setView({ y: s.y, m: s.mo }) } }, [open])

  useEffect(() => {
    if (!open) return
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false) } }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey, true)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey, true) }
  }, [open])

  const first = new Date(view.y, view.m, 1)
  const cells = []
  for (let i = 0; i < first.getDay(); i++) cells.push(null)
  const days = new Date(view.y, view.m + 1, 0).getDate()
  for (let d = 1; d <= days; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  const todayKey = fmt(today.getFullYear(), today.getMonth(), today.getDate())
  const shift = (delta) => { const nd = new Date(view.y, view.m + delta, 1); setView({ y: nd.getFullYear(), m: nd.getMonth() }) }
  const pick = (d) => { onChange(fmt(view.y, view.m, d)); setOpen(false) }

  return (
    <div className={'dp' + (open ? ' dp-open' : '')} ref={ref}>
      <button type="button" className="dp-trigger" onClick={() => setOpen((o) => !o)} aria-label={ariaLabel}>
        <span className={value ? '' : 'dp-ph'}>{value || '날짜 선택'}</span>
        <svg className="dp-ic" width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="3" y="4.5" width="18" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.7" />
          <path d="M3 9h18M8 2.5v4M16 2.5v4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      </button>
      {open && (
        <div className="dp-pop">
          <div className="dp-head">
            <button type="button" onClick={() => shift(-1)} aria-label="이전 달">‹</button>
            <span className="dp-title">{view.y}년 {view.m + 1}월</span>
            <button type="button" onClick={() => shift(1)} aria-label="다음 달">›</button>
          </div>
          <div className="dp-grid dp-wd">
            {WD.map((w, i) => <span key={w} className={'dp-wdc' + (i === 0 ? ' dp-sun' : i === 6 ? ' dp-sat' : '')}>{w}</span>)}
          </div>
          <div className="dp-grid">
            {cells.map((d, i) => {
              if (!d) return <span key={i} className="dp-empty" />
              const k = fmt(view.y, view.m, d)
              const dow = new Date(view.y, view.m, d).getDay()
              const cls = 'dp-day' + (dow === 0 ? ' dp-sun' : dow === 6 ? ' dp-sat' : '') + (todayKey === k ? ' dp-today' : '') + (value === k ? ' dp-sel' : '')
              return <button key={i} type="button" className={cls} onClick={() => pick(d)}>{d}</button>
            })}
          </div>
          <div className="dp-foot">
            <button type="button" className="dp-foot-btn" onClick={() => { const t = new Date(); onChange(fmt(t.getFullYear(), t.getMonth(), t.getDate())); setOpen(false) }}>오늘</button>
            {allowClear && value && <button type="button" className="dp-foot-btn" onClick={() => { onChange(''); setOpen(false) }}>지우기</button>}
          </div>
        </div>
      )}
    </div>
  )
}
