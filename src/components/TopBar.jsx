import { SITE_NAME } from '../config'

function HouseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 11.5 12 4l9 7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 10v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function TopBar({ onSignOut, onHome, showHome }) {
  return (
    <header className="topbar">
      <button type="button" className="topbar-home" onClick={onHome} aria-label="홈으로">
        <span className="brand-mark">POKÉMON · CENTER · YONSEI</span>
        <span className="brand-sub">{SITE_NAME} · Staff Workspace</span>
      </button>
      <div className="topbar-right">
        {showHome && (
          <button type="button" className="icon-btn icon-home" onClick={onHome} aria-label="홈으로">
            <HouseIcon />
          </button>
        )}
        <button className="btn btn-ghost btn-logout" onClick={onSignOut}>
          로그아웃
        </button>
      </div>
    </header>
  )
}
