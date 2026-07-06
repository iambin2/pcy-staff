import { CLUB_NAME, SITE_NAME } from '../config'

function PokeMark({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="24" cy="24" r="22" fill="#fff" stroke="#23201C" strokeWidth="2.5" />
      <path d="M2.4 24a21.6 21.6 0 0 1 43.2 0Z" fill="#D2352C" />
      <line x1="2.4" y1="24" x2="16" y2="24" stroke="#23201C" strokeWidth="2.5" />
      <line x1="32" y1="24" x2="45.6" y2="24" stroke="#23201C" strokeWidth="2.5" />
      <circle cx="24" cy="24" r="7" fill="#fff" stroke="#23201C" strokeWidth="2.5" />
      <circle cx="24" cy="24" r="3" fill="#fff" stroke="#23201C" strokeWidth="2.5" />
    </svg>
  )
}

export default function TopBar({ user, onSignOut, onHome, showHome }) {
  return (
    <header className="topbar">
      <button
        type="button"
        className="topbar-left topbar-home"
        onClick={onHome}
        aria-label="홈으로"
      >
        <PokeMark size={30} />
        <div className="topbar-titles">
          <span className="topbar-club">{CLUB_NAME}</span>
          <span className="topbar-site">{SITE_NAME}</span>
        </div>
      </button>
      <div className="topbar-right">
        {showHome && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={onHome}>
            ← 홈
          </button>
        )}
        <div className="who">
          <span className="who-name">{user.name}</span>
          <span className="who-role">{user.role}</span>
        </div>
        <button className="btn btn-ghost" onClick={onSignOut}>
          로그아웃
        </button>
      </div>
    </header>
  )
}
