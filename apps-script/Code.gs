/**
 * 포켓몬 센터 연세점 · 임원진 업무실 — 문지기 (1단계)
 * ------------------------------------------------------------
 * 이 프로그램이 "진짜 보안"을 담당합니다.
 * 사이트(화면)는 아이디·비밀번호를 이 문지기에게 보내고,
 * 문지기가 '설정' 시트에 저장된 값과 맞는지 확인합니다.
 * 비밀번호는 사이트 코드에 들어있지 않고 이 문지기만 알기 때문에 안전합니다.
 *
 * 준비: 같은 스프레드시트에 '설정' 이라는 시트 탭을 만들고 아래처럼 입력하세요.
 *   A열(항목)      B열(값)
 *   아이디          pokecenter          ← 임원진에게 공유할 아이디
 *   비밀번호        (길고 어려운 비밀번호) ← 추측하기 어렵게!
 *   비밀키          (아무 랜덤 문자열)     ← 한 번 정하고 바꾸지 마세요
 *   표시이름        임원진                ← 화면에 보일 이름(선택)
 *   역할            공용 계정              ← 화면에 보일 역할(선택)
 */

var CONFIG_SHEET = '설정'
var SESSION_HOURS = 8 // 로그인 유지 시간(시간)

// ------------------------------------------------------------
// 사이트가 POST로 요청을 보내면 실행됩니다.
// ------------------------------------------------------------
function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents)
    var cfg = getConfig()
    if (body.action === 'login') return doLogin(body, cfg)
    if (body.action === 'session') return doSession(body, cfg)
    return json({ ok: false, message: '알 수 없는 요청입니다.' })
  } catch (err) {
    return json({ ok: false, message: '요청 처리 오류: ' + err })
  }
}

// 브라우저에서 URL을 직접 열었을 때 보이는 확인용 화면
function doGet() {
  return json({ ok: true, message: '임원진 업무실 문지기가 정상 작동 중입니다.' })
}

// 아이디 + 비밀번호 확인
function doLogin(body, cfg) {
  var id = String(body.id || '').trim()
  var pw = String(body.pw || '')
  var ok = id === String(cfg['아이디'] || '').trim() && pw === String(cfg['비밀번호'] || '')
  if (!ok) {
    Utilities.sleep(600) // 무작위 대입 공격을 조금 늦춥니다
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

// 저장된 세션(토큰)이 아직 유효한지 확인
function doSession(body, cfg) {
  var payload = verifyToken(body.token, cfg['비밀키'])
  if (!payload) return json({ ok: true, allowed: false })
  return json({
    ok: true,
    allowed: true,
    name: cfg['표시이름'] || '임원진',
    role: cfg['역할'] || '임원진',
  })
}

// ------------------------------------------------------------
// 세션 토큰 (로그인 상태를 안전하게 유지하는 전자 도장)
// 별도 저장 없이 서명만으로 진위를 확인합니다.
// ------------------------------------------------------------
function makeToken(secret) {
  var payload = { exp: Date.now() + SESSION_HOURS * 3600 * 1000 }
  var p = Utilities.base64EncodeWebSafe(JSON.stringify(payload))
  return p + '.' + sign(p, secret)
}
function verifyToken(token, secret) {
  if (!token || token.indexOf('.') < 0) return null
  var parts = token.split('.')
  if (sign(parts[0], secret) !== parts[1]) return null // 서명 위조 차단
  var payload = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(parts[0])).getDataAsString())
  if (!payload.exp || payload.exp < Date.now()) return null // 만료됨
  return payload
}
function sign(data, secret) {
  var raw = Utilities.computeHmacSha256Signature(data, String(secret || 'change-me'))
  return Utilities.base64EncodeWebSafe(raw)
}

// '설정' 시트를 항목-값 형태로 읽어옵니다.
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
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  )
}
