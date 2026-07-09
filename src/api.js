import { APPS_SCRIPT_URL } from './config'

const SESSION_KEY = 'pcy_staff_session'
function currentToken() {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY) || '{}').token || null
  } catch {
    return null
  }
}

// 백엔드(문지기) 공통 호출. Content-Type 미지정 → CORS 사전요청 없음.
async function call(payload) {
  const res = await fetch(APPS_SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) })
  if (!res.ok) throw new Error('서버 응답 오류 (' + res.status + ')')
  return res.json()
}

// ── 인증 ──
export function login(id, pw) {
  return call({ action: 'login', id, pw })
}
export function checkSession(token) {
  return call({ action: 'session', token })
}

// ── 로그인된 임원진 전용 호출 ──
function authed(action, extra = {}) {
  return call({ action, token: currentToken(), ...extra })
}
export function getInterviewConfig() {
  return authed('getConfig')
}
export function saveInterviewConfig(config) {
  return authed('saveConfig', { config })
}
export function createInterviewForms() {
  return authed('createForms')
}
export function listApplicants() {
  return authed('listApplicants')
}
export function listInterviewers() {
  return authed('listInterviewers')
}
