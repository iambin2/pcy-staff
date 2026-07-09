/**
 * 포켓몬 센터 연세점 · 임원진 업무실 — 문지기 (v2)
 * ------------------------------------------------------------
 * 기존 로그인 기능 + 면접 접수 기능(설정 저장, 구글폼 자동 생성, 응답 읽기)
 *
 * 준비: '설정' 시트 (v1과 동일)
 *   A열(항목)      B열(값)
 *   아이디          pokecenter
 *   비밀번호        (비밀번호)
 *   비밀키          (랜덤 문자열)
 *   표시이름        임원진
 *   역할            공용 계정
 */

var CONFIG_SHEET = '설정'
var SESSION_HOURS = 8

// ============================================================
// 요청 라우팅
// ============================================================
function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents)
    var cfg = getConfig()
    switch (body.action) {
      case 'login':
        return doLogin(body, cfg)
      case 'session':
        return doSession(body, cfg)
      case 'getConfig':
        return auth(body, cfg, function () { return json(okConfig()) })
      case 'saveConfig':
        return auth(body, cfg, function () { return json(saveInterviewConfig(body.config)) })
      case 'createForms':
        return auth(body, cfg, function () { return json(createOrUpdateForms()) })
      case 'listApplicants':
        return auth(body, cfg, function () { return json({ ok: true, rows: readForm('FORM_APPLICANT_ID', true) }) })
      case 'listInterviewers':
        return auth(body, cfg, function () { return json({ ok: true, rows: readForm('FORM_INTERVIEWER_ID', false) }) })
      default:
        return json({ ok: false, message: '알 수 없는 요청입니다.' })
    }
  } catch (err) {
    return json({ ok: false, message: '요청 처리 오류: ' + err })
  }
}

function doGet() {
  return json({ ok: true, message: '임원진 업무실 문지기(v2)가 정상 작동 중입니다.' })
}

// ============================================================
// 인증 (로그인 / 세션)
// ============================================================
function doLogin(body, cfg) {
  var id = String(body.id || '').trim()
  var pw = String(body.pw || '')
  var ok = id === String(cfg['아이디'] || '').trim() && pw === String(cfg['비밀번호'] || '')
  if (!ok) {
    Utilities.sleep(600)
    return json({ ok: true, allowed: false, message: '아이디 또는 비밀번호가 올바르지 않습니다.' })
  }
  return json({
    ok: true,
    allowed: true,
    token: makeToken(cfg['비밀키']),
    name: cfg['표시이름'] || '임원진',
    role: cfg['역할'] || '임원진',
  })
}
function doSession(body, cfg) {
  var payload = verifyToken(body.token, cfg['비밀키'])
  if (!payload) return json({ ok: true, allowed: false })
  return json({ ok: true, allowed: true, name: cfg['표시이름'] || '임원진', role: cfg['역할'] || '임원진' })
}
// 로그인한 임원진만 실행하도록 보호
function auth(body, cfg, fn) {
  var payload = verifyToken(body.token, cfg['비밀키'])
  if (!payload) return json({ ok: false, authError: true, message: '로그인이 필요합니다.' })
  return fn()
}

// ============================================================
// 면접 설정 저장/읽기 (Script Properties에 JSON으로 보관)
// ============================================================
function props() { return PropertiesService.getScriptProperties() }

function okConfig() {
  var raw = props().getProperty('INTERVIEW_CONFIG')
  var config = raw ? JSON.parse(raw) : { interval: 20, days: [] }
  return {
    ok: true,
    config: config,
    forms: {
      applicantUrl: props().getProperty('FORM_APPLICANT_URL') || '',
      interviewerUrl: props().getProperty('FORM_INTERVIEWER_URL') || '',
    },
  }
}
function saveInterviewConfig(config) {
  props().setProperty('INTERVIEW_CONFIG', JSON.stringify(config || { interval: 20, days: [] }))
  return { ok: true }
}

// 설정에서 블록 라벨 목록 생성 (예: "3월 7일 오전")
function blockLabels() {
  var raw = props().getProperty('INTERVIEW_CONFIG')
  var config = raw ? JSON.parse(raw) : { days: [] }
  var labels = []
  ;(config.days || []).forEach(function (day) {
    var dl = dateLabel(day.date)
    ;(day.blocks || []).forEach(function (b) {
      if (dl && b.label) labels.push(dl + ' ' + b.label)
    })
  })
  return labels
}
function dateLabel(dateStr) {
  // "2026-03-07" -> "3월 7일"
  var m = String(dateStr || '').match(/(\d{4})-(\d{1,2})-(\d{1,2})/)
  return m ? Number(m[2]) + '월 ' + Number(m[3]) + '일' : ''
}

// ============================================================
// 구글폼 자동 생성/갱신
// ============================================================
function createOrUpdateForms() {
  var labels = blockLabels()
  if (!labels.length) return { ok: false, message: '먼저 면접 시간대를 저장해 주세요.' }

  var appForm = openOrCreate('FORM_APPLICANT_ID', '면접 신청 (지원자)', function (f) {
    f.setDescription('면접 가능한 시간을 모두 선택해 주세요.')
    f.addTextItem().setTitle('성명').setRequired(true)
    f.addCheckboxItem().setTitle('가능한 시간').setRequired(true)
    f.addParagraphTextItem()
      .setTitle('요구사항 (선택)')
      .setHelpText('특정 시간 제약이 있으면 적어 주세요. 예) 3월 9일 15:00~17:00 제외')
  })
  setCheckboxChoices(appForm, '가능한 시간', labels)

  var intForm = openOrCreate('FORM_INTERVIEWER_ID', '면접관 가용 시간', function (f) {
    f.setDescription('면접 진행이 가능한 시간대를 모두 선택해 주세요.')
    f.addTextItem().setTitle('이름').setRequired(true)
    f.addCheckboxItem().setTitle('가능한 시간대').setRequired(true)
  })
  setCheckboxChoices(intForm, '가능한 시간대', labels)

  var aUrl = appForm.getPublishedUrl()
  var iUrl = intForm.getPublishedUrl()
  props().setProperty('FORM_APPLICANT_URL', aUrl)
  props().setProperty('FORM_INTERVIEWER_URL', iUrl)
  return { ok: true, applicantUrl: aUrl, interviewerUrl: iUrl }
}

function openOrCreate(idKey, title, buildFn) {
  var id = props().getProperty(idKey)
  if (id) {
    try {
      return FormApp.openById(id)
    } catch (e) {
      /* 폼이 삭제됐으면 새로 만듦 */
    }
  }
  var form = FormApp.create(title)
  buildFn(form)
  props().setProperty(idKey, form.getId())
  return form
}
function setCheckboxChoices(form, itemTitle, labels) {
  var items = form.getItems(FormApp.ItemType.CHECKBOX)
  for (var i = 0; i < items.length; i++) {
    if (items[i].getTitle() === itemTitle) {
      items[i].asCheckboxItem().setChoiceValues(labels)
      return
    }
  }
}

// ============================================================
// 폼 응답 읽기
// ============================================================
function readForm(idKey, isApplicant) {
  var id = props().getProperty(idKey)
  if (!id) return []
  var form
  try {
    form = FormApp.openById(id)
  } catch (e) {
    return []
  }
  var byName = {}
  form.getResponses().forEach(function (resp) {
    var map = {}
    resp.getItemResponses().forEach(function (ir) {
      map[ir.getItem().getTitle()] = ir.getResponse()
    })
    if (isApplicant) {
      var name = String(map['성명'] || '').trim()
      if (!name) return
      var av = map['가능한 시간']
      byName[name] = {
        name: name,
        avail: Array.isArray(av) ? av.join(', ') : String(av || ''),
        req: String(map['요구사항 (선택)'] || '').trim(),
      }
    } else {
      var nm = String(map['이름'] || '').trim()
      if (!nm) return
      var av2 = map['가능한 시간대']
      byName[nm] = { name: nm, blocks: Array.isArray(av2) ? av2 : av2 ? [av2] : [] }
    }
  })
  return Object.keys(byName).map(function (k) { return byName[k] })
}

// ============================================================
// 세션 토큰 & 공통
// ============================================================
function makeToken(secret) {
  var payload = { exp: Date.now() + SESSION_HOURS * 3600 * 1000 }
  var p = Utilities.base64EncodeWebSafe(JSON.stringify(payload))
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
  return Utilities.base64EncodeWebSafe(
    Utilities.computeHmacSha256Signature(data, String(secret || 'change-me'))
  )
}
function getConfig() {
  var sheet = SpreadsheetApp.getActive().getSheetByName(CONFIG_SHEET)
  if (!sheet) throw new Error("'설정' 시트를 찾을 수 없습니다.")
  var values = sheet.getDataRange().getValues()
  var cfg = {}
  for (var i = 1; i < values.length; i++) {
    var key = String(values[i][0] || '').trim()
    if (key) cfg[key] = values[i][1]
  }
  return cfg
}
function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON)
}
