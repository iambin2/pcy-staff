/**
 * 포켓몬 센터 연세점 · 임원진 업무실 — 문지기 (v2.9)
 * 로그인 + 면접 접수 + 회원 명부 자동 최신화
 */

var CONFIG_SHEET = '설정'
var SESSION_HOURS = 8
var ROSTER_COLS = ['이름', '성별', '생년월일', '단과대학', '학과', '학번', '전화번호', '최애포켓몬', '비고']

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents)
    var cfg = getConfig()
    switch (body.action) {
      case 'login': return doLogin(body, cfg)
      case 'session': return doSession(body, cfg)
      case 'getConfig': return auth(body, cfg, function () { return json(okConfig()) })
      case 'saveConfig': return auth(body, cfg, function () { return json(saveInterviewConfig(body.config)) })
      case 'createForms': return auth(body, cfg, function () { return json(createOrUpdateInterviewerForm(body.tier)) })
      case 'listApplicants': return auth(body, cfg, function () { return json({ ok: true, rows: readApplicants() }) })
      case 'listInterviewers': return auth(body, cfg, function () { return json({ ok: true, rows: readInterviewers() }) })
      case 'getRoster': return auth(body, cfg, function () { return json({ ok: true, rosterSheetUrl: props().getProperty('ROSTER_SHEET_URL') || '' }) })
      case 'saveRosterUrl': return auth(body, cfg, function () { props().setProperty('ROSTER_SHEET_URL', String(body.url || '')); return json({ ok: true }) })
      case 'rosterPreview': return auth(body, cfg, function () { return json(rosterPreview(body.rows)) })
      case 'rosterCommit': return auth(body, cfg, function () { return json(rosterCommit(body.rows)) })
      case 'rosterView': return auth(body, cfg, function () { return json(rosterViewData()) })
      case 'listTasks': return auth(body, cfg, function () { return json({ ok: true, tasks: listTasks() }) })
      case 'saveTask': return auth(body, cfg, function () { return json(saveTask(body.task)) })
      case 'deleteTask': return auth(body, cfg, function () { return json(deleteTask(body.id)) })
      case 'driveList': return auth(body, cfg, function () { return json(driveList(body.folderId)) })
      case 'driveSearch': return auth(body, cfg, function () { return json(driveSearch(body.q)) })
      case 'driveCreateFolder': return auth(body, cfg, function () { return json(driveCreateFolder(body.parentId, body.name)) })
      case 'driveRename': return auth(body, cfg, function () { return json(driveRename(body.id, body.isFolder, body.name)) })
      case 'driveTrash': return auth(body, cfg, function () { return json(driveTrash(body.id, body.isFolder)) })
      case 'driveMove': return auth(body, cfg, function () { return json(driveMove(body.id, body.isFolder, body.targetId)) })
      case 'driveCopy': return auth(body, cfg, function () { return json(driveCopy(body.id, body.isFolder)) })
      case 'driveUpload': return auth(body, cfg, function () { return json(driveUpload(body.parentId, body.name, body.mime, body.data)) })
      default: return json({ ok: false, message: '알 수 없는 요청입니다.' })
    }
  } catch (err) {
    return json({ ok: false, message: '요청 처리 오류: ' + err })
  }
}
function doGet() { return json({ ok: true, message: '임원진 업무실 문지기(v2.9)가 정상 작동 중입니다.' }) }

// ===== 인증 =====
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

// ===== 면접 설정/폼 (v2.3과 동일) =====
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
function slotLabels() {
  var raw = props().getProperty('INTERVIEW_CONFIG')
  var config = raw ? JSON.parse(raw) : { days: [], interval: 20 }
  var interval = Math.max(1, Number(config.interval) || 20)
  var labels = []
  ;(config.days || []).forEach(function (day) {
    var dl = dateLabel(day.date); if (!dl) return
    ;(day.blocks || []).forEach(function (b) {
      var s = toMin(b.start), e = toMin(b.end); if (s == null || e == null || e <= s) return
      for (var t = s; t < e; t += interval) labels.push(dl + ' ' + pad2(Math.floor(t / 60)) + ':' + pad2(t % 60))
    })
  })
  return labels
}
function dateLabel(dateStr) { var m = String(dateStr || '').match(/(\d{4})-(\d{1,2})-(\d{1,2})/); return m ? Number(m[2]) + '월 ' + Number(m[3]) + '일' : '' }
function toMin(t) { var m = /^(\d{1,2}):(\d{2})$/.exec(String(t || '')); return m ? (+m[1]) * 60 + (+m[2]) : null }
function pad2(n) { n = String(n); return n.length < 2 ? '0' + n : n }
function pad3(n) { n = String(n); while (n.length < 3) n = '0' + n; return n }

function createOrUpdateInterviewerForm(tier) {
  var labels = slotLabels()
  if (!labels.length) return { ok: false, message: '먼저 면접 시간대를 저장해 주세요.' }
  tier = parseInt(tier, 10)
  if (!tier || tier < 1) return { ok: false, message: '면접 기수를 입력해 주세요.' }
  var id = props().getProperty('FORM_INTERVIEWER_ID'), form = null
  if (id) { try { form = FormApp.openById(id) } catch (e) { form = null } }
  if (!form) {
    form = FormApp.create(tier + '기 면접관 가용 시간')
    form.setDescription('면접 진행이 가능한 시간을 모두 선택해 주세요.')
    form.addTextItem().setTitle('이름').setRequired(true)
    form.addCheckboxItem().setTitle('가능한 시간').setRequired(true)
    props().setProperty('FORM_INTERVIEWER_ID', form.getId())
  } else {
    form.setTitle(tier + '기 면접관 가용 시간')
  }
  // 부원 면접 / N기 폴더로 이동 (없으면 생성)
  moveToFolder(form.getId(), interviewTierFolder(tier))
  var items = form.getItems(FormApp.ItemType.CHECKBOX)
  for (var i = 0; i < items.length; i++) if (items[i].getTitle() === '가능한 시간') { items[i].asCheckboxItem().setChoiceValues(labels); break }
  var url = form.getPublishedUrl()
  props().setProperty('FORM_INTERVIEWER_URL', url)
  props().setProperty('INTERVIEW_TIER', String(tier))
  return { ok: true, interviewerUrl: url, tier: tier, folder: '2. 모집 및 공채 / 부원 면접 / ' + tier + '기' }
}
function readInterviewers() {
  var id = props().getProperty('FORM_INTERVIEWER_ID'); if (!id) return []
  var form; try { form = FormApp.openById(id) } catch (e) { return [] }
  var byName = {}
  form.getResponses().forEach(function (resp) {
    var map = {}; resp.getItemResponses().forEach(function (ir) { map[ir.getItem().getTitle()] = ir.getResponse() })
    var nm = String(map['이름'] || '').trim(); if (!nm) return
    var av = map['가능한 시간']
    byName[nm] = { name: nm, slots: Array.isArray(av) ? av : av ? [av] : [] }
  })
  return Object.keys(byName).map(function (k) { return byName[k] })
}
function readApplicants() {
  var raw = props().getProperty('INTERVIEW_CONFIG'), config = raw ? JSON.parse(raw) : {}
  var url = config.applicantSheetUrl; if (!url) return []
  var ss; try { ss = SpreadsheetApp.openByUrl(url) } catch (e) { return [] }
  var sheets = ss.getSheets()
  for (var s = 0; s < sheets.length; s++) {
    var vals = sheets[s].getDataRange().getValues(); if (!vals.length) continue
    var head = vals[0].map(function (x) { return String(x).trim() })
    var ni = findCol(head, ['성명', '이름']), ai = findCol(head, ['가능한 시간', '면접 가능 시간', '면접 일정 조사']), ri = findCol(head, ['요구사항', '추가 요구사항'])
    if (ni < 0 || ai < 0) continue
    var byName = {}
    for (var r = 1; r < vals.length; r++) {
      var name = String(vals[r][ni] || '').trim(); if (!name) continue
      byName[name] = { name: name, avail: String(vals[r][ai] || '').trim(), req: ri >= 0 ? String(vals[r][ri] || '').trim() : '' }
    }
    return Object.keys(byName).map(function (k) { return byName[k] })
  }
  return []
}
function findCol(head, names) { for (var i = 0; i < names.length; i++) { var idx = head.indexOf(names[i]); if (idx >= 0) return idx } return -1 }

// ===== 회원 명부 자동 최신화 =====
function cellStr(v) {
  if (v === null || v === undefined) return ''
  if (Object.prototype.toString.call(v) === '[object Date]') return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd')
  return String(v).replace(/\.0$/, '').trim()
}
function isOB(p) { return String(p['비고'] || '').trim().toUpperCase() === 'OB' }

function readRosterTabs(url) {
  var ss = SpreadsheetApp.openByUrl(url)
  var tabs = {}
  ss.getSheets().forEach(function (sheet) {
    var name = sheet.getName()
    if (!/^\d+기$/.test(name)) return
    var vals = sheet.getDataRange().getValues()
    var people = []
    if (vals.length > 1) {
      var head = vals[0].map(function (x) { return String(x).trim() })
      var idx = {}; ROSTER_COLS.forEach(function (c) { idx[c] = head.indexOf(c) })
      for (var r = 1; r < vals.length; r++) {
        var rec = {}; ROSTER_COLS.forEach(function (c) { var i = idx[c]; rec[c] = i >= 0 ? cellStr(vals[r][i]) : '' })
        if (rec['학번']) people.push(rec)
      }
    }
    tabs[name] = people
  })
  return tabs
}

function classifyRoster(existingTabs, newRows) {
  var tiers = Object.keys(existingTabs).map(function (k) { return parseInt(k) }).filter(function (n) { return !isNaN(n) }).sort(function (a, b) { return a - b })
  if (!tiers.length) throw new Error("기존 명부에서 'N기' 형식의 탭을 찾지 못했습니다.")
  var maxTier = tiers[tiers.length - 1], newTier = maxTier + 1
  var existingByHak = {}, newByHak = {}
  tiers.forEach(function (t) { existingTabs[t + '기'].forEach(function (p) { if (p['학번']) existingByHak[p['학번']] = true }) })
  newRows.forEach(function (p) { if (p['학번']) newByHak[p['학번']] = p })

  var sinip = newRows.filter(function (p) { return p['학번'] && !existingByHak[p['학번']] })
  var yuji = newRows.filter(function (p) { return p['학번'] && existingByHak[p['학번']] })
  var toebu = [], ob = []
  tiers.forEach(function (t) {
    existingTabs[t + '기'].forEach(function (p) {
      if (isOB(p)) { var o = {}; ROSTER_COLS.forEach(function (c) { o[c] = p[c] }); o['시작기수'] = t; ob.push(o) }
      if (!newByHak[p['학번']] && !isOB(p)) toebu.push(p)
    })
  })

  var newTabs = {}
  tiers.forEach(function (t) {
    newTabs[t + '기'] = existingTabs[t + '기'].filter(function (p) { return newByHak[p['학번']] || isOB(p) })
  })
  newTabs[newTier + '기'] = sinip.slice()
  Object.keys(newTabs).forEach(function (name) {
    var t = parseInt(name)
    newTabs[name].forEach(function (p, i) { p['회원번호'] = pad2(t) + '-' + pad3(i + 1) })
  })
  return {
    newTier: newTier, newTabs: newTabs, obList: ob,
    summary: { 신입: sinip.length, 유지: yuji.length, 퇴부: toebu.length, ob: ob.length },
    sinipNames: sinip.map(function (p) { return p['이름'] + '(' + p['학번'] + ')' }),
    toebuNames: toebu.map(function (p) { return p['이름'] + '(' + p['학번'] + ')' }),
  }
}

function rosterPreview(rows) {
  var url = props().getProperty('ROSTER_SHEET_URL')
  if (!url) return { ok: false, message: '기존 명부 시트를 먼저 연결해 주세요.' }
  if (!rows || !rows.length) return { ok: false, message: '이번 기수 명단이 비어 있어요.' }
  var tabs
  try { tabs = readRosterTabs(url) } catch (e) { return { ok: false, message: '기존 명부를 읽지 못했어요: ' + e } }
  var res = classifyRoster(tabs, rows)
  return { ok: true, newTier: res.newTier, summary: res.summary, sinip: res.sinipNames, toebu: res.toebuNames }
}

function rosterCommit(rows) {
  var url = props().getProperty('ROSTER_SHEET_URL')
  if (!url) return { ok: false, message: '기존 명부 시트를 먼저 연결해 주세요.' }
  if (!rows || !rows.length) return { ok: false, message: '이번 기수 명단이 비어 있어요.' }
  var src = SpreadsheetApp.openByUrl(url)
  var tabs = readRosterTabs(url)
  var res = classifyRoster(tabs, rows)

  var newSs = SpreadsheetApp.create('포센연 ' + res.newTier + '기 명부')
  moveToFolder(newSs.getId(), rosterFolder())

  var order = Object.keys(res.newTabs).sort(function (a, b) { return parseInt(a) - parseInt(b) })
  var first = true
  order.forEach(function (tabName) {
    var sheet = first ? newSs.getSheets()[0] : newSs.insertSheet(tabName)
    if (first) { sheet.setName(tabName); first = false }
    writeRosterTab(sheet, res.newTabs[tabName], false)
  })
  writeRosterTab(newSs.insertSheet('OB'), res.obList, true)

  // 새로 만든 명부를 '현재 명부'로 자동 연결
  props().setProperty('ROSTER_SHEET_URL', newSs.getUrl())

  return { ok: true, url: newSs.getUrl(), newTier: res.newTier, summary: res.summary, folder: '3. 운영 / 명부' }
}

// 현재 연결된 명부를 조회용으로 읽어옴 (기수별 탭 + OB 탭)
function rosterViewData() {
  var url = props().getProperty('ROSTER_SHEET_URL')
  if (!url) return { ok: true, connected: false, sheets: [] }
  var ss; try { ss = SpreadsheetApp.openByUrl(url) } catch (e) { return { ok: false, message: '명부를 읽지 못했어요: ' + e } }
  var out = []
  ss.getSheets().forEach(function (sheet) {
    var name = sheet.getName()
    if (!/^\d+기$/.test(name) && name !== 'OB') return
    var vals = sheet.getDataRange().getValues()
    if (vals.length < 1) return
    var header = vals[0].map(function (x) { return cellStr(x) })
    var rows = []
    for (var r = 1; r < vals.length; r++) {
      var row = vals[r].map(function (x) { return cellStr(x) })
      if (row.join('').trim() === '') continue
      rows.push(row)
    }
    out.push({ name: name, header: header, rows: rows })
  })
  out.sort(function (a, b) {
    if (a.name === 'OB') return 1
    if (b.name === 'OB') return -1
    return parseInt(a) - parseInt(b)
  })
  return { ok: true, connected: true, url: url, sheets: out }
}

function writeRosterTab(sheet, people, ob) {
  var header = ob ? ['시작기수'].concat(ROSTER_COLS) : ['회원번호'].concat(ROSTER_COLS)
  var rows = [header]
  people.forEach(function (p) {
    var row = ob ? [p['시작기수']] : [p['회원번호'] || '']
    ROSTER_COLS.forEach(function (c) { row.push(p[c] || '') })
    rows.push(row)
  })
  sheet.getRange(1, 1, rows.length, header.length).setValues(rows)
  sheet.setFrozenRows(1)
}

// ===== 업무 캘린더 =====
var TASK_COLS = ['id', '진행상태', '우선순위', '업무명', '마감일', '담당부서', '담당자', '메모']
function taskSheet() {
  var ss = SpreadsheetApp.getActive()
  var sh = ss.getSheetByName('업무')
  if (!sh) {
    sh = ss.insertSheet('업무')
    sh.getRange(1, 1, 1, TASK_COLS.length).setValues([TASK_COLS])
    sh.setFrozenRows(1)
  }
  return sh
}
function listTasks() {
  var sh = taskSheet()
  var vals = sh.getDataRange().getValues()
  if (vals.length < 2) return []
  var head = vals[0].map(function (x) { return String(x).trim() })
  var idx = {}; TASK_COLS.forEach(function (c) { idx[c] = head.indexOf(c) })
  var out = []
  for (var r = 1; r < vals.length; r++) {
    var id = idx.id >= 0 ? String(vals[r][idx.id]) : ''
    if (!id) continue
    var t = {}; TASK_COLS.forEach(function (c) { t[c] = idx[c] >= 0 ? cellStr(vals[r][idx[c]]) : '' })
    out.push(t)
  }
  return out
}
function saveTask(task) {
  var sh = taskSheet()
  var vals = sh.getDataRange().getValues()
  var head = vals[0].map(function (x) { return String(x).trim() })
  var idIdx = head.indexOf('id')
  var id = task.id
  if (!id) { id = 'T' + Date.now() + Math.floor(Math.random() * 1000); task.id = id }
  var rowValues = head.map(function (h) { return h === 'id' ? id : (task[h] !== undefined && task[h] !== null ? task[h] : '') })
  for (var r = 1; r < vals.length; r++) {
    if (String(vals[r][idIdx]) === id) { sh.getRange(r + 1, 1, 1, head.length).setValues([rowValues]); return { ok: true, task: task } }
  }
  sh.appendRow(rowValues)
  return { ok: true, task: task }
}
function deleteTask(id) {
  var sh = taskSheet()
  var vals = sh.getDataRange().getValues()
  var idIdx = vals[0].map(function (x) { return String(x).trim() }).indexOf('id')
  for (var r = 1; r < vals.length; r++) {
    if (String(vals[r][idIdx]) === String(id)) { sh.deleteRow(r + 1); return { ok: true } }
  }
  return { ok: true }
}


// ===== 드라이브 경로 헬퍼 =====
var PATH_INTERVIEW = ['2. 모집 및 공채', '부원 면접']   // + N기
var PATH_ROSTER = ['3. 운영', '명부']

// 경로를 따라 폴더를 찾고, 없으면 만든다
function ensurePath(parts) {
  var folder = DriveApp.getRootFolder()
  for (var i = 0; i < parts.length; i++) {
    var name = parts[i]
    var it = folder.getFoldersByName(name)
    folder = it.hasNext() ? it.next() : folder.createFolder(name)
  }
  return folder
}
// 해당 기수 폴더 (부원 면접/N기) — 없으면 생성
function interviewTierFolder(tier) {
  return ensurePath(PATH_INTERVIEW.concat([String(tier) + '기']))
}
function rosterFolder() {
  return ensurePath(PATH_ROSTER)
}
function moveToFolder(fileId, folder) {
  try { DriveApp.getFileById(fileId).moveTo(folder) } catch (e) { /* 이동 실패해도 파일은 존재 */ }
}

// ===== 파일 아카이브 (드라이브 탐색) =====
function fileInfo(f) {
  return {
    id: f.getId(),
    name: f.getName(),
    type: 'file',
    url: f.getUrl(),
    mime: f.getMimeType(),
    modified: Utilities.formatDate(f.getLastUpdated(), Session.getScriptTimeZone(), 'yyyy-MM-dd'),
  }
}
function driveList(folderId) {
  var folder = folderId && folderId !== 'root' ? DriveApp.getFolderById(folderId) : DriveApp.getRootFolder()
  var folders = [], files = [], n = 0
  var fit = folder.getFolders()
  while (fit.hasNext() && n < 500) { var d = fit.next(); folders.push({ id: d.getId(), name: d.getName(), type: 'folder' }); n++ }
  var qit = folder.getFiles()
  while (qit.hasNext() && n < 500) { files.push(fileInfo(qit.next())); n++ }
  folders.sort(function (a, b) { return a.name.localeCompare(b.name) })
  files.sort(function (a, b) { return a.name.localeCompare(b.name) })
  // 경로(breadcrumb)
  var path = [], cur = folder, guard = 0
  while (cur && guard < 50) {
    path.unshift({ id: cur.getId(), name: cur.getName() })
    var ps = cur.getParents()
    cur = ps.hasNext() ? ps.next() : null
    guard++
  }
  return { ok: true, folderId: folder.getId(), path: path, items: folders.concat(files), capped: n >= 500 }
}
function driveSearch(q) {
  q = String(q || '').trim()
  if (!q) return { ok: true, items: [] }
  var safe = q.replace(/["\\]/g, ' ')
  var it = DriveApp.searchFiles('title contains "' + safe + '" and trashed = false')
  var items = [], n = 0
  while (it.hasNext() && n < 100) { items.push(fileInfo(it.next())); n++ }
  items.sort(function (a, b) { return a.name.localeCompare(b.name) })
  return { ok: true, items: items }
}

// ----- 드라이브 편집 (즉시 드라이브 반영) -----
function driveEntity(id, isFolder) { return isFolder ? DriveApp.getFolderById(id) : DriveApp.getFileById(id) }
function driveParent(id, isFolder) {
  var it = driveEntity(id, isFolder).getParents()
  return it.hasNext() ? it.next() : DriveApp.getRootFolder()
}
function driveCreateFolder(parentId, name) {
  var parent = parentId && parentId !== 'root' ? DriveApp.getFolderById(parentId) : DriveApp.getRootFolder()
  var f = parent.createFolder(String(name || '새 폴더').trim() || '새 폴더')
  return { ok: true, id: f.getId(), name: f.getName() }
}
function driveRename(id, isFolder, name) {
  name = String(name || '').trim()
  if (!name) return { ok: false, message: '이름을 입력해 주세요.' }
  driveEntity(id, isFolder).setName(name)
  return { ok: true }
}
function driveTrash(id, isFolder) {
  driveEntity(id, isFolder).setTrashed(true)
  return { ok: true }
}
function driveMove(id, isFolder, targetId) {
  var target = targetId && targetId !== 'root' ? DriveApp.getFolderById(targetId) : DriveApp.getRootFolder()
  driveEntity(id, isFolder).moveTo(target)
  return { ok: true }
}
function driveCopy(id, isFolder) {
  if (!isFolder) {
    var file = DriveApp.getFileById(id)
    file.makeCopy(file.getName() + ' (사본)', driveParent(id, false))
    return { ok: true }
  }
  var src = DriveApp.getFolderById(id)
  var dst = driveParent(id, true).createFolder(src.getName() + ' (사본)')
  var ctr = { n: 0 }
  copyFolderInto(src, dst, ctr)
  return { ok: true, copied: ctr.n, capped: ctr.n >= 300 }
}
function copyFolderInto(src, dst, ctr) {
  var files = src.getFiles()
  while (files.hasNext() && ctr.n < 300) {
    var f = files.next()
    f.makeCopy(f.getName(), dst)
    ctr.n++
  }
  var folders = src.getFolders()
  while (folders.hasNext() && ctr.n < 300) {
    var sub = folders.next()
    var nd = dst.createFolder(sub.getName())
    ctr.n++
    copyFolderInto(sub, nd, ctr)
  }
}
function driveUpload(parentId, name, mime, b64) {
  if (!b64) return { ok: false, message: '파일 데이터가 비었어요.' }
  var parent = parentId && parentId !== 'root' ? DriveApp.getFolderById(parentId) : DriveApp.getRootFolder()
  var blob = Utilities.newBlob(Utilities.base64Decode(b64), mime || 'application/octet-stream', name || 'upload')
  var file = parent.createFile(blob)
  return { ok: true, id: file.getId(), name: file.getName() }
}

// ===== 토큰 & 공통 =====
function makeToken(secret) { var p = Utilities.base64EncodeWebSafe(JSON.stringify({ exp: Date.now() + SESSION_HOURS * 3600 * 1000 })); return p + '.' + sign(p, secret) }
function verifyToken(token, secret) {
  if (!token || token.indexOf('.') < 0) return null
  var parts = token.split('.'); if (sign(parts[0], secret) !== parts[1]) return null
  var payload = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(parts[0])).getDataAsString())
  if (!payload.exp || payload.exp < Date.now()) return null
  return payload
}
function sign(data, secret) { return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(data, String(secret || 'change-me'))) }
function getConfig() {
  var sheet = SpreadsheetApp.getActive().getSheetByName(CONFIG_SHEET)
  if (!sheet) throw new Error("'설정' 시트를 찾을 수 없습니다.")
  var values = sheet.getDataRange().getValues(), cfg = {}
  for (var i = 1; i < values.length; i++) { var k = String(values[i][0] || '').trim(); if (k) cfg[k] = values[i][1] }
  return cfg
}
function json(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON) }
