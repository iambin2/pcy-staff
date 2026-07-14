import { useEffect, useState } from 'react'
import { getRoster, saveRosterUrl, rosterPreview, rosterCommit, rosterView } from '../api'

const COLS = ['이름', '성별', '생년월일', '단과대학', '학과', '학번', '전화번호', '최애포켓몬', '비고']

// 조회 표: 시트가 어떻든 항상 이 순서·정렬·너비로 통일해서 그림
const VIEW_COLS = [
  { key: '회원번호', align: 'center', w: '92px' },
  { key: '시작기수', align: 'center', w: '80px' },
  { key: '이름', align: 'left', w: '90px' },
  { key: '성별', align: 'center', w: '60px' },
  { key: '생년월일', align: 'center', w: '110px' },
  { key: '단과대학', align: 'left', w: '150px' },
  { key: '학과', align: 'left', w: '150px' },
  { key: '학번', align: 'center', w: '120px' },
  { key: '전화번호', align: 'center', w: '135px' },
  { key: '최애포켓몬', align: 'left', w: '130px' },
  { key: '비고', align: 'center', w: '80px' },
]
// 생년월일 표기 통일 (2003-03-08)
function fmtDate(v) {
  const s = String(v || '').trim()
  const m = s.match(/(\d{4})[-./\s]+(\d{1,2})[-./\s]+(\d{1,2})/)
  if (!m) return s
  return `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`
}
// 전화번호 표기 통일 (010-1234-5678)
function fmtPhone(v) {
  const d = String(v || '').replace(/\D/g, '')
  if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`
  return String(v || '').trim()
}
function cellValue(key, raw) {
  if (key === '생년월일') return fmtDate(raw)
  if (key === '전화번호') return fmtPhone(raw)
  return String(raw ?? '').trim()
}

function parseRoster(text) {
  const lines = text.split(/\n+/).filter((l) => l.trim())
  if (!lines.length) return { rows: [], hasHeader: false }
  const firstCells = lines[0].split('\t').map((s) => s.trim())
  const hasHeader = firstCells.includes('학번') || firstCells.includes('이름')
  const idx = {}
  let dataLines
  if (hasHeader) {
    COLS.forEach((c) => (idx[c] = firstCells.indexOf(c)))
    dataLines = lines.slice(1)
  } else {
    COLS.forEach((c, i) => (idx[c] = i))
    dataLines = lines
  }
  const rows = dataLines
    .map((line) => {
      const cells = line.split('\t')
      const rec = {}
      COLS.forEach((c) => {
        const i = idx[c]
        rec[c] = i >= 0 && cells[i] != null ? String(cells[i]).trim() : ''
      })
      rec['학번'] = rec['학번'].replace(/\.0$/, '').trim()
      return rec
    })
    .filter((r) => r['학번'])
  return { rows, hasHeader }
}

export default function RosterHome() {
  const [url, setUrl] = useState('')
  const [status, setStatus] = useState('loading')
  const [savingUrl, setSavingUrl] = useState(false)
  const [sheets, setSheets] = useState([])
  const [connected, setConnected] = useState(false)
  const [activeTab, setActiveTab] = useState(0)
  const [query, setQuery] = useState('')
  const [showUpdate, setShowUpdate] = useState(false)
  const [text, setText] = useState('')
  const [preview, setPreview] = useState(null)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const [msg, setMsg] = useState('')

  const parsed = parseRoster(text)

  async function loadView() {
    try {
      const v = await rosterView()
      if (v.ok) {
        setConnected(v.connected)
        const list = v.sheets || []
        setSheets(list)
        // 가장 최신 기수 탭을 기본으로 선택
        let latest = 0
        for (let i = 0; i < list.length; i++) if (/^\d+기$/.test(list[i].name)) latest = i
        setActiveTab(latest)
      } else {
        setConnected(false)
        setMsg(v.message || '명부를 읽지 못했어요. (구글 시트인지, 접근 권한이 있는지 확인해 주세요)')
      }
    } catch (e) {
      setMsg('명부 조회 실패: ' + e.message)
    }
  }

  useEffect(() => {
    getRoster()
      .then(async (r) => {
        if (r.ok) { setUrl(r.rosterSheetUrl || ''); await loadView(); setStatus('ready') }
        else { setStatus('error'); setMsg(r.message || '불러오기 실패') }
      })
      .catch((e) => { setStatus('error'); setMsg('서버 연결 실패: ' + e.message) })
  }, [])

  async function saveUrl() {
    setSavingUrl(true); setMsg('')
    try {
      const r = await saveRosterUrl(url)
      if (r.ok) { await loadView(); setMsg('명부 시트를 연결했어요.') } else setMsg(r.message || '저장 실패')
    } catch (e) { setMsg('저장 실패: ' + e.message) }
    setSavingUrl(false)
  }

  async function doPreview() {
    setMsg(''); setResult(null); setPreview(null)
    if (!parsed.rows.length) { setMsg('이번 기수 명단을 붙여넣어 주세요.'); return }
    setBusy(true)
    try {
      const r = await rosterPreview(parsed.rows)
      if (r.ok) setPreview(r); else setMsg(r.message || '미리보기 실패')
    } catch (e) { setMsg('미리보기 실패: ' + e.message) }
    setBusy(false)
  }

  async function doCommit() {
    setBusy(true); setMsg('')
    try {
      const r = await rosterCommit(parsed.rows)
      if (r.ok) { setResult(r); setPreview(null); setText(''); setUrl(r.url); await loadView(); setActiveTab(0) }
      else setMsg(r.message || '생성 실패')
    } catch (e) { setMsg('생성 실패: ' + e.message) }
    setBusy(false)
  }

  if (status === 'loading') return <div className="iv-note">불러오는 중…</div>
  if (status === 'error') return <div className="iv-note iv-note-err">{msg}</div>

  const sheet = sheets[activeTab]
  const filteredRows = sheet
    ? sheet.rows.filter((row) => (query.trim() ? row.some((c) => String(c).includes(query.trim())) : true))
    : []

  return (
    <div className="module">
      <div className="module-head">
        <h2>회원 명부</h2>
        <p>현재 명부를 조회하고, 새 기수 명단으로 자동 최신화할 수 있어요.</p>
      </div>

      {msg && sheets.length === 0 && (
        <div className="org-warning" style={{ marginBottom: '14px' }}>{msg}</div>
      )}

      {connected && sheets.length > 0 ? (
        <div className="roster-view">
          <div className="rv-tabs">
            {sheets.map((s, i) => (
              <button key={s.name} className={'rv-tab' + (i === activeTab ? ' rv-tab-on' : '') + (s.name === 'OB' ? ' rv-tab-ob' : '')} onClick={() => setActiveTab(i)}>
                {s.name} <span className="rv-count">{s.rows.length}</span>
              </button>
            ))}
          </div>
          <input className="rv-search" type="text" placeholder="이름·학번·학과 등으로 검색" value={query} onChange={(e) => setQuery(e.target.value)} />
          {sheet && (() => {
            // 시트 헤더 → 고정 스키마 매핑 (없는 열은 자동 생략)
            const cols = VIEW_COLS.filter((c) => sheet.header.indexOf(c.key) >= 0)
            const idxOf = (k) => sheet.header.indexOf(k)
            return (
              <div className="rv-table-wrap">
                <table className="rv-table">
                  <colgroup>{cols.map((c) => <col key={c.key} style={{ width: c.w }} />)}</colgroup>
                  <thead>
                    <tr>{cols.map((c) => <th key={c.key} className={'al-' + c.align}>{c.key}</th>)}</tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((row, ri) => (
                      <tr key={ri}>
                        {cols.map((c) => (
                          <td key={c.key} className={'al-' + c.align}>{cellValue(c.key, row[idxOf(c.key)])}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredRows.length === 0 && <div className="rv-empty">해당하는 인원이 없어요.</div>}
              </div>
            )
          })()}
        </div>
      ) : (
        <div className="cond-empty">아래에서 기존 명부 시트를 연결하면 여기에 명단이 표시돼요.</div>
      )}

      <button type="button" className="link-toggle" onClick={() => setShowUpdate((v) => !v)} style={{ marginTop: '18px' }}>
        {showUpdate ? '명부 최신화 접기' : '＋ 명부 최신화 / 시트 연결'}
      </button>

      {showUpdate && (
        <div className="roster-update">
          <label className="field">
            <span>기존 명부 시트 링크</span>
            <div className="url-row">
              <input type="text" placeholder="기수별 탭(1기·2기…)이 있는 명부 구글 시트 주소" value={url} onChange={(e) => setUrl(e.target.value)} />
              <button type="button" className="btn btn-ghost btn-sm" onClick={saveUrl} disabled={savingUrl}>{savingUrl ? '연결 중…' : '연결'}</button>
            </div>
            <small className="hint">학번(G)으로 식별, 비고(J)에 <b>OB</b>면 보호. 엑셀이면 구글 시트로 올려두세요.</small>
          </label>

          <label className="field" style={{ marginTop: '14px' }}>
            <span>이번 기수 전원 명단 <em>({parsed.rows.length}명)</em></span>
            <textarea rows={7} placeholder={'엑셀 명부에서 머리글 줄 포함해 복사·붙여넣기\n(이름·성별·생년월일·단과대학·학과·학번·전화번호·최애포켓몬·비고)'} value={text} onChange={(e) => setText(e.target.value)} />
            <small className="hint">연장 부원도 반드시 포함(빠지면 삭제). 비고 “군휴학”은 OB가 아니라 새 명단에 없으면 삭제되니 주의. 새 명부는 <b>3. 운영 › 명부</b> 폴더에 <b>포센연 N기 명부</b>로 저장돼요.</small>
          </label>

          {msg && <div className="org-warning" style={{ marginTop: '12px' }}>{msg}</div>}

          <div className="setup-actions" style={{ marginTop: '14px' }}>
            <button type="button" className="btn btn-ghost" onClick={doPreview} disabled={busy || !parsed.rows.length}>{busy && !result ? '비교 중…' : '미리보기'}</button>
          </div>

          {preview && (
            <div className="roster-preview">
              <div className="rp-summary">
                <span className="rp-stat rp-new">신입 <b>{preview.summary.신입}</b></span>
                <span className="rp-stat">유지 <b>{preview.summary.유지}</b></span>
                <span className="rp-stat rp-out">퇴부 <b>{preview.summary.퇴부}</b></span>
                <span className="rp-stat rp-ob">OB 보호 <b>{preview.summary.ob}</b></span>
              </div>
              <p className="rp-tier">→ 새 <b>{preview.newTier}기</b> 명부가 만들어집니다.</p>
              {preview.toebu.length > 0 && (
                <details className="rp-list"><summary>삭제될 인원 {preview.toebu.length}명 (확인 권장)</summary><div className="rp-names">{preview.toebu.join(', ')}</div></details>
              )}
              {preview.sinip.length > 0 && (
                <details className="rp-list"><summary>신입 {preview.sinip.length}명</summary><div className="rp-names">{preview.sinip.join(', ')}</div></details>
              )}
              <div className="rp-confirm">
                <p>확인했으면 새 명부를 만들게요. 기존 파일은 그대로, <b>같은 폴더에 새 파일</b>로 생성돼요.</p>
                <button type="button" className="btn" onClick={doCommit} disabled={busy}>{busy ? '만드는 중…' : `새 ${preview.newTier}기 명부 만들기`}</button>
              </div>
            </div>
          )}

          {result && (
            <div className="setup-forms" style={{ marginTop: '16px' }}>
              <div className="form-link">
                <span>새 {result.newTier}기 명부 완성 (신입 {result.summary.신입} · 퇴부 {result.summary.퇴부} · OB {result.summary.ob}) — 이제 현재 명부로 연결됐어요</span>
                <a href={result.url} target="_blank" rel="noreferrer">{result.url}</a>
              </div>
              <p className="hint">파일명 <b>포센연 {result.newTier}기 명부</b> · 저장 위치 <b>{result.folder || '3. 운영 / 명부'}</b></p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
