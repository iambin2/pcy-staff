import { SITE_NAME } from '../config'

export default function TopBar({ user, onSignOut, onHome, showHome }) {
  return (
    <header className="topbar">
      <button type="button" className="topbar-home" onClick={onHome} aria-label="홈으로">
        <span className="brand-mark">POKÉMON · CENTER · YONSEI</span>
        <span className="brand-sub">{SITE_NAME} · Staff Workspace</span>
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
