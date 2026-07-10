import { useEffect, useState } from 'react'
import { getRoster, saveRosterUrl, rosterPreview, rosterCommit } from '../api'

const COLS = ['이름', '성별', '생년월일', '단과대학', '학과', '학번', '전화번호', '최애포켓몬', '비고']

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
    COLS.forEach((c, i) => (idx[c] = i)) // 헤더 없으면 이름·성별·…·비고 순서로 가정
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
  const [text, setText] = useState('')
  const [preview, setPreview] = useState(null)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const [msg, setMsg] = useState('')

  const parsed = parseRoster(text)

  useEffect(() => {
    getRoster()
      .then((r) => {
        if (r.ok) {
          setUrl(r.rosterSheetUrl || '')
          setStatus('ready')
        } else {
          setStatus('error')
          setMsg(r.message || '불러오기 실패')
        }
      })
      .catch((e) => {
        setStatus('error')
        setMsg('서버 연결 실패: ' + e.message)
      })
  }, [])

  async function saveUrl() {
    setSavingUrl(true)
    setMsg('')
    try {
      const r = await saveRosterUrl(url)
      setMsg(r.ok ? '명부 시트를 연결했어요.' : r.message || '저장 실패')
    } catch (e) {
      setMsg('저장 실패: ' + e.message)
    }
    setSavingUrl(false)
  }

  async function doPreview() {
    setMsg('')
    setResult(null)
    setPreview(null)
    if (!parsed.rows.length) {
      setMsg('이번 기수 명단을 붙여넣어 주세요.')
      return
    }
    setBusy(true)
    try {
      const r = await rosterPreview(parsed.rows)
      if (r.ok) setPreview(r)
      else setMsg(r.message || '미리보기 실패')
    } catch (e) {
      setMsg('미리보기 실패: ' + e.message)
    }
    setBusy(false)
  }

  async function doCommit() {
    setBusy(true)
    setMsg('')
    try {
      const r = await rosterCommit(parsed.rows)
      if (r.ok) {
        setResult(r)
        setPreview(null)
        setMsg('')
      } else {
        setMsg(r.message || '생성 실패')
      }
    } catch (e) {
      setMsg('생성 실패: ' + e.message)
    }
    setBusy(false)
  }

  if (status === 'loading') return <div className="iv-note">불러오는 중…</div>
  if (status === 'error') return <div className="iv-note iv-note-err">{msg}</div>

  return (
    <div className="module">
      <div className="module-head">
        <h2>회원 명부 · 자동 최신화</h2>
        <p>이번 기수 활동 전원 명단을 넣으면, 기존 명부와 비교해 새 명부를 만들어 줍니다.</p>
      </div>

      <div className="setup-forms">
        <label className="field">
          <span>기존 명부 시트 링크</span>
          <div className="url-row">
            <input
              type="text"
              placeholder="기수별 탭(1기·2기…)이 있는 명부 구글 시트 주소"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <button type="button" className="btn btn-ghost btn-sm" onClick={saveUrl} disabled={savingUrl}>
              {savingUrl ? '연결 중…' : '연결'}
            </button>
          </div>
          <small className="hint">학번(G)으로 인원을 식별하고, 비고(J)에 <b>OB</b>라고 적힌 사람은 보호합니다.</small>
        </label>
      </div>

      <label className="field" style={{ marginTop: '16px' }}>
        <span>
          이번 기수 전원 명단 <em>({parsed.rows.length}명)</em>
        </span>
        <textarea
          rows={8}
          placeholder={'엑셀 명부에서 머리글 줄을 포함해 복사해 붙여넣으세요.\n(이름·성별·생년월일·단과대학·학과·학번·전화번호·최애포켓몬·비고)'}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <small className="hint">
          {parsed.hasHeader ? '머리글을 인식했어요.' : '머리글이 없으면 이름·성별·…·비고 순서로 가정합니다.'} 연장 부원도 반드시 포함해야
          삭제되지 않아요. 비고가 “군휴학”인 사람은 OB가 아니라 새 명단에 없으면 삭제되니 주의하세요.
        </small>
      </label>

      {msg && <div className="org-warning" style={{ marginTop: '12px' }}>{msg}</div>}

      <div className="setup-actions" style={{ marginTop: '14px' }}>
        <button type="button" className="btn btn-ghost" onClick={doPreview} disabled={busy || !parsed.rows.length}>
          {busy && !result ? '비교 중…' : '미리보기'}
        </button>
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
            <details className="rp-list">
              <summary>삭제될 인원 {preview.toebu.length}명 (확인 권장)</summary>
              <div className="rp-names">{preview.toebu.join(', ')}</div>
            </details>
          )}
          {preview.sinip.length > 0 && (
            <details className="rp-list">
              <summary>신입 {preview.sinip.length}명</summary>
              <div className="rp-names">{preview.sinip.join(', ')}</div>
            </details>
          )}

          <div className="rp-confirm">
            <p>확인했으면 새 명부를 만들게요. 기존 파일은 그대로 두고 <b>같은 폴더에 새 파일</b>로 생성돼요.</p>
            <button type="button" className="btn" onClick={doCommit} disabled={busy}>
              {busy ? '만드는 중…' : `새 ${preview.newTier}기 명부 만들기`}
            </button>
          </div>
        </div>
      )}

      {result && (
        <div className="setup-forms" style={{ marginTop: '16px' }}>
          <div className="form-link">
            <span>새 {result.newTier}기 명부가 만들어졌어요 (신입 {result.summary.신입} · 퇴부 {result.summary.퇴부} · OB {result.summary.ob})</span>
            <a href={result.url} target="_blank" rel="noreferrer">{result.url}</a>
          </div>
          <p className="hint">기존 명부는 그대로 남아 있어요. 새 파일을 확인한 뒤 필요하면 기존 파일을 정리하세요.</p>
        </div>
      )}
    </div>
  )
}
