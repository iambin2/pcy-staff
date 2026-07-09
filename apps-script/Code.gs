/**
 * 포켓몬 센터 연세점 · 임원진 업무실 — 문지기 (v2.1)
 * ------------------------------------------------------------
 * 로그인 + 면접 접수:
 *  - 면접 시간대 설정 저장/읽기
 *  - 면접관용 구글폼 자동 생성 (이름 + 시간대 체크박스)
 *  - 지원자: 기존 신청 폼의 "응답 시트"를 연결해 '성명','면접 일정 조사' 읽기
 */

var CONFIG_SHEET = '설정'
var SESSION_HOURS = 8

// ============================================================
function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents)
    var cfg = getConfig()
    switch (body.action) {
      case 'login': return doLogin(body, cfg)
      case 'session': return doSession(body, cfg)
      case 'getConfig': return auth(body, cfg, function () { return json(okConfig()) })
      case 'saveConfig': return auth(body, cfg, function () { return json(saveInterviewConfig(body.config)) })
      case 'createForms': return auth(body, cfg, function () { return json(createOrUpdateInterviewerForm()) })
      case 'listApplicants': return auth(body, cfg, function () { return json({ ok: true, rows: readApplicants() }) })
      case 'listInterviewers': return auth(body, cfg, function () { return json({ ok: true, rows: readInterviewers() }) })
      default: return json({ ok: false, message: '알 수 없는 요청입니다.' })
    }
  } catch (err) {
    return json({ ok: false, message: '요청 처리 오류: ' + err })
  }
}
function doGet() { return json({ ok: true, message: '임원진 업무실 문지기(v2.1)가 정상 작동 중입니다.' }) }

// ============================================================
// 인증
// ============================================================
function doLogin(body, cfg) {
  var id = String(body.id || '').trim(), pw = String(body.pw || '')
  if (id !== String(cfg['아이디'] || '').trim() || pw !== String(cfg['비밀번호'] || '')) {
    Utilities.sleep(600)
    return json({ ok: true, allowed: false, message: '아이디 또는 비밀번호가 올바르지 않습니다.' })
  }
  return json({ ok: true, allowed: true, token: makeToken(cfg['비밀키']), name: cfg['표시이름'] || '임원진', role: cfg['역할'] || '임원진' })
}
function doSession(body, cfg) {
  var p = verifyToken(body.token, cfg['비밀키'])
  return json(p ? { ok: true, allowed: true, name: cfg['표시이름'] || '임원진', role: cfg['역할'] || '임원진' } : { ok: true, allowed: false })
}
function auth(body, cfg, fn) {
  if (!verifyToken(body.token, cfg['비밀키'])) return json({ ok: false, authError: true, message: '로그인이 필요합니다.' })
  return fn()
}

// ============================================================
// 면접 설정
// ============================================================
function props() { return PropertiesService.getScriptProperties() }
function okConfig() {
  var raw = props().getProperty('INTERVIEW_CONFIG')
  var config = raw ? JSON.parse(raw) : { interval: 20, days: [], applicantSheetUrl: '' }
  return { ok: true, config: config, forms: { interviewerUrl: props().getProperty('FORM_INTERVIEWER_URL') || '' } }
}
function saveInterviewConfig(config) {
  props().setProperty('INTERVIEW_CONFIG', JSON.stringify(config || { interval: 20, days: [] }))
  return { ok: true }
}
function blockLabels() {
  var raw = props().getProperty('INTERVIEW_CONFIG')
  var config = raw ? JSON.parse(raw) : { days: [] }
  var labels = []
  ;(config.days || []).forEach(function (day) {
    var dl = dateLabel(day.date)
    ;(day.blocks || []).forEach(function (b) { if (dl && b.label) labels.push(dl + ' ' + b.label) })
  })
  return labels
}
function dateLabel(dateStr) {
  var m = String(dateStr || '').match(/(\d{4})-(\d{1,2})-(\d{1,2})/)
  return m ? Number(m[2]) + '월 ' + Number(m[3]) + '일' : ''
}

// ============================================================
// 면접관 폼 자동 생성/갱신
// ============================================================
function createOrUpdateInterviewerForm() {
  var labels = blockLabels()
  if (!labels.length) return { ok: false, message: '먼저 면접 시간대를 저장해 주세요.' }
  var id = props().getProperty('FORM_INTERVIEWER_ID')
  var form = null
  if (id) { try { form = FormApp.openById(id) } catch (e) { form = null } }
  if (!form) {
    form = FormApp.create('면접관 가용 시간')
    form.setDescription('면접 진행이 가능한 시간대를 모두 선택해 주세요.')
    form.addTextItem().setTitle('이름').setRequired(true)
    form.addCheckboxItem().setTitle('가능한 시간대').setRequired(true)
    props().setProperty('FORM_INTERVIEWER_ID', form.getId())
  }
  var items = form.getItems(FormApp.ItemType.CHECKBOX)
  for (var i = 0; i < items.length; i++) {
    if (items[i].getTitle() === '가능한 시간대') { items[i].asCheckboxItem().setChoiceValues(labels); break }
  }
  var url = form.getPublishedUrl()
  props().setProperty('FORM_INTERVIEWER_URL', url)
  return { ok: true, interviewerUrl: url }
}

// ============================================================
// 응답 읽기
// ============================================================
// 면접관: 자동 생성한 폼에서
function readInterviewers() {
  var id = props().getProperty('FORM_INTERVIEWER_ID')
  if (!id) return []
  var form; try { form = FormApp.openById(id) } catch (e) { return [] }
  var byName = {}
  form.getResponses().forEach(function (resp) {
    var map = {}
    resp.getItemResponses().forEach(function (ir) { map[ir.getItem().getTitle()] = ir.getResponse() })
    var nm = String(map['이름'] || '').trim()
    if (!nm) return
    var av = map['가능한 시간대']
    byName[nm] = { name: nm, blocks: Array.isArray(av) ? av : av ? [av] : [] }
  })
  return Object.keys(byName).map(function (k) { return byName[k] })
}
// 지원자: 기존 신청 폼의 응답 시트에서 (헤더 '성명','면접 일정 조사' 기준)
function readApplicants() {
  var raw = props().getProperty('INTERVIEW_CONFIG')
  var config = raw ? JSON.parse(raw) : {}
  var url = config.applicantSheetUrl
  if (!url) return []
  var ss; try { ss = SpreadsheetApp.openByUrl(url) } catch (e) { return [] }
  var sheets = ss.getSheets()
  for (var s = 0; s < sheets.length; s++) {
    var vals = sheets[s].getDataRange().getValues()
    if (!vals.length) continue
    var head = vals[0].map(function (x) { return String(x).trim() })
    var ni = head.indexOf('성명')
    var ti = head.indexOf('면접 일정 조사')
    if (ni < 0 || ti < 0) continue
    var byName = {}
    for (var r = 1; r < vals.length; r++) {
      var name = String(vals[r][ni] || '').trim()
      if (!name) continue
      byName[name] = { name: name, raw: String(vals[r][ti] || '').trim() }
    }
    return Object.keys(byName).map(function (k) { return byName[k] })
  }
  return []
}

// ============================================================
// 토큰 & 공통
// ============================================================
function makeToken(secret) {
  var p = Utilities.base64EncodeWebSafe(JSON.stringify({ exp: Date.now() + SESSION_HOURS * 3600 * 1000 }))
  return p + '.' + sign(p, secret)
}
function verifyToken(token, secret) {
  if (!token || token.indexOf('.') < 0) return null
  var parts = token.split('.')
  if (sign(parts[0], secret) !== parts[1]) return null
  var payload = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(parts[0])).getDataAsString())
  if (!payload.exp || payload.exp < Date.now()) return null
  return payload
}
function sign(data, secret) {
  return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(data, String(secret || 'change-me')))
}
function getConfig() {
  var sheet = SpreadsheetApp.getActive().getSheetByName(CONFIG_SHEET)
  if (!sheet) throw new Error("'설정' 시트를 찾을 수 없습니다.")
  var values = sheet.getDataRange().getValues(), cfg = {}
  for (var i = 1; i < values.length; i++) { var k = String(values[i][0] || '').trim(); if (k) cfg[k] = values[i][1] }
  return cfg
}
function json(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON) }
