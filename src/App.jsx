import { useEffect, useState, useCallback } from 'react'
import { login as apiLogin, checkSession } from './api'
import LoginGate from './components/LoginGate'
import AppShell from './components/AppShell'

const SESSION_KEY = 'pcy_staff_session'

export default function App() {
  const [status, setStatus] = useState('loading')
  const [user, setUser] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    let cancelled = false
    async function boot() {
      const saved = sessionStorage.getItem(SESSION_KEY)
      if (!saved) {
        setStatus('signedout')
        return
      }
      try {
        const { token } = JSON.parse(saved)
        const result = await checkSession(token)
        if (cancelled) return
        if (result.allowed) {
          setUser({ name: result.name || '임원진', role: result.role || '임원진' })
          setStatus('allowed')
          return
        }
      } catch {
        /* 다시 로그인 */
      }
      sessionStorage.removeItem(SESSION_KEY)
      if (!cancelled) setStatus('signedout')
    }
    boot()
    return () => {
      cancelled = true
    }
  }, [])

  const handleLogin = useCallback(async (id, pw) => {
    setErrorMsg('')
    setStatus('checking')
    try {
      const result = await apiLogin(id, pw)
      if (result.allowed) {
        const u = { name: result.name || '임원진', role: result.role || '임원진' }
        setUser(u)
        setStatus('allowed')
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({ token: result.token, user: u }))
      } else {
        setErrorMsg(result.message || '아이디 또는 비밀번호가 올바르지 않습니다.')
        setStatus('signedout')
      }
    } catch (e) {
      setErrorMsg('서버에 연결하지 못했어요. ' + (e.message || ''))
      setStatus('error')
    }
  }, [])

  function signOut() {
    sessionStorage.removeItem(SESSION_KEY)
    setUser(null)
    setErrorMsg('')
    setStatus('signedout')
  }

  if (status === 'allowed') {
    return <AppShell user={user} onSignOut={signOut} />
  }

  return (
    <LoginGate status={status} errorMsg={errorMsg} onLogin={handleLogin} onRetry={signOut} />
  )
}
