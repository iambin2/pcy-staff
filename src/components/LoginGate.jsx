import { useState } from 'react'
import { CLUB_NAME, SITE_NAME } from '../config'

function PokeMark({ size = 44 }) {
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

export default function LoginGate({ status, errorMsg, onLogin, onRetry }) {
  const [id, setId] = useState('')
  const [pw, setPw] = useState('')
  const busy = status === 'checking' || status === 'loading'

  function submit(e) {
    e.preventDefault()
    if (!id.trim() || !pw) return
    onLogin(id.trim(), pw)
  }

  return (
    <div className="gate">
      <div className="gate-card">
        <div className="gate-brand">
          <PokeMark size={44} />
          <div>
            <div className="gate-club">{CLUB_NAME}</div>
            <h1 className="gate-title">{SITE_NAME}</h1>
          </div>
        </div>

        <p className="gate-sub">
          승인된 임원진만 이용할 수 있는 공간입니다.
          <br />
          공유받은 <b>아이디·비밀번호</b>로 로그인해 주세요.
        </p>

        {status === 'error' ? (
          <div className="gate-msg gate-error">
            <div className="gate-msg-title">연결에 문제가 있어요</div>
            <p>{errorMsg}</p>
            <button className="btn" onClick={onRetry}>
              다시 시도
            </button>
          </div>
        ) : (
          <form className="login-form" onSubmit={submit}>
            <label className="field">
              <span>아이디</span>
              <input
                type="text"
                autoComplete="username"
                value={id}
                onChange={(e) => setId(e.target.value)}
                disabled={busy}
                autoFocus
              />
            </label>
            <label className="field">
              <span>비밀번호</span>
              <input
                type="password"
                autoComplete="current-password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                disabled={busy}
              />
            </label>

            {errorMsg && <div className="field-error">{errorMsg}</div>}

            <button className="btn btn-full" type="submit" disabled={busy}>
              {status === 'checking' ? '확인 중…' : '로그인'}
            </button>
          </form>
        )}
      </div>

      <div className="gate-foot">© {CLUB_NAME} · 임원진 전용</div>
    </div>
  )
}
