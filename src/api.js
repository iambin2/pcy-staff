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
export function createInterviewForms(tier) {
  return authed('createForms', { tier })
}
export function listApplicants() {
  return authed('listApplicants')
}
export function listInterviewers() {
  return authed('listInterviewers')
}

// ── 회원 명부 ──
export function getRoster() {
  return authed('getRoster')
}
export function saveRosterUrl(url) {
  return authed('saveRosterUrl', { url })
}
export function rosterPreview(rows) {
  return authed('rosterPreview', { rows })
}
export function rosterCommit(rows) {
  return authed('rosterCommit', { rows })
}
export function rosterView() {
  return authed('rosterView')
}

// ── 업무 캘린더 ──
export function listTasks() {
  return authed('listTasks')
}
export function saveTask(task) {
  return authed('saveTask', { task })
}
export function deleteTask(id) {
  return authed('deleteTask', { id })
}

// ── 파일 아카이브 ──
export function driveList(folderId) {
  return authed('driveList', { folderId })
}
export function driveSearch(q) {
  return authed('driveSearch', { q })
}

// ── 파일 아카이브 편집 ──
export function driveCreateFolder(parentId, name) {
  return authed('driveCreateFolder', { parentId, name })
}
export function driveRename(id, isFolder, name) {
  return authed('driveRename', { id, isFolder, name })
}
export function driveTrash(id, isFolder) {
  return authed('driveTrash', { id, isFolder })
}
export function driveMove(id, isFolder, targetId) {
  return authed('driveMove', { id, isFolder, targetId })
}
export function driveCopy(id, isFolder) {
  return authed('driveCopy', { id, isFolder })
}
export function driveUpload(parentId, name, mime, data) {
  return authed('driveUpload', { parentId, name, mime, data })
}
