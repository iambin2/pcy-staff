import { APPS_SCRIPT_URL } from './config'

// 백엔드(문지기)에 요청을 보내는 공통 함수.
// Content-Type을 지정하지 않아 자동으로 text/plain 으로 전송되며,
// 이렇게 하면 Apps Script와의 CORS(사전요청) 문제가 생기지 않습니다.
async function call(payload) {
  const res = await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error('서버 응답 오류 (' + res.status + ')')
  return res.json()
}

// 아이디 + 비밀번호로 로그인. 성공하면 { allowed:true, token, name, role }
export function login(id, pw) {
  return call({ action: 'login', id, pw })
}

// 저장된 세션(토큰)이 아직 유효한지 확인. { allowed, name, role }
export function checkSession(token) {
  return call({ action: 'session', token })
}
