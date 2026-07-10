import { useState } from 'react'
import { SITE_NAME } from '../config'

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
          <div className="brand-mark-lg">POKÉMON · CENTER · YONSEI</div>
          <div className="brand-sub">{SITE_NAME} · Staff Workspace</div>
        </div>

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
    </div>
  )
}
