import { useEffect, useRef, useState } from 'react'

export default function Select({ value, onChange, options, ariaLabel, colorMap }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); setOpen(false) }
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey, true) // capture: 모달 Esc보다 먼저
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey, true)
    }
  }, [open])

  return (
    <div className={'sel' + (open ? ' sel-open' : '')} ref={ref}>
      <button
        type="button"
        className="sel-trigger"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
      >
        <span className="sel-val">
          {colorMap && <i className="sel-dot" style={{ background: colorMap[value] }} />}
          {value}
        </span>
        <svg className="sel-caret" width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <ul className="sel-menu" role="listbox">
          {options.map((opt) => (
            <li key={opt}>
              <button
                type="button"
                role="option"
                aria-selected={opt === value}
                className={'sel-opt' + (opt === value ? ' sel-opt-on' : '')}
                onClick={() => { onChange(opt); setOpen(false) }}
              >
                <span className="sel-val">
                  {colorMap && <i className="sel-dot" style={{ background: colorMap[opt] }} />}
                  {opt}
                </span>
                {opt === value && <span className="sel-check">✓</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
