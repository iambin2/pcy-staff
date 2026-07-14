import { useEffect, useState } from 'react'
import { getInterviewConfig, saveInterviewConfig, createInterviewForms } from '../api'

const DEFAULT_BLOCK = () => ({ start: '10:00', end: '12:00' })
const DEFAULT_DAY = () => ({ date: '', blocks: [DEFAULT_BLOCK()] })

function toMin(t) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t || '')
  return m ? +m[1] * 60 + +m[2] : null
}
function pad2(n) {
  return String(n).padStart(2, '0')
}
function dateLabel(dateStr) {
  const m = /(\d{4})-(\d{1,2})-(\d{1,2})/.exec(dateStr || '')
  return m ? `${+m[2]}월 ${+m[3]}일` : '(날짜 미정)'
}
// 한 구간을 간격 단위 시각들로 (백엔드와 동일 형식: "7월 6일 10:00")
function slotTimes(block, interval) {
  const s = toMin(block.start),
    e = toMin(block.end)
  if (s == null || e == null || e <= s || interval < 1) return []
  const out = []
  for (let t = s; t < e; t += interval) out.push(`${pad2(Math.floor(t / 60))}:${pad2(t % 60)}`)
  return out
}

export default function InterviewSetup() {
  const [config, setConfig] = useState({ interval: 20, days: [], applicantSheetUrl: '', tier: '' })
  const [forms, setForms] = useState({ interviewerUrl: '', folder: '' })
  const [status, setStatus] = useState('loading')
  const [saving, setSaving] = useState(false)
  const [creating, setCreating] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    getInterviewConfig()
      .then((r) => {
        if (r.ok) {
          setConfig(r.config?.days ? { applicantSheetUrl: '', tier: '', ...r.config } : { interval: 20, days: [], applicantSheetUrl: '', tier: '' })
          if (r.forms) setForms(r.forms)
          setStatus('ready')
        } else {
          setStatus('error')
          setMsg(r.message || '설정을 불러오지 못했어요.')
        }
      })
      .catch((e) => {
        setStatus('error')
        setMsg('서버 연결 실패: ' + e.message)
      })
  }, [])

  const setIntervalV = (v) => setConfig((c) => ({ ...c, interval: Math.max(1, Number(v) || 1) }))
  const setApplicantUrl = (v) => setConfig((c) => ({ ...c, applicantSheetUrl: v }))
  const setTier = (v) => setConfig((c) => ({ ...c, tier: v.replace(/\D/g, '') }))
  const addDay = () => setConfig((c) => ({ ...c, days: [...c.days, DEFAULT_DAY()] }))
  const removeDay = (i) => setConfig((c) => ({ ...c, days: c.days.filter((_, x) => x !== i) }))
  const setDate = (i, date) =>
    setConfig((c) => ({ ...c, days: c.days.map((d, x) => (x === i ? { ...d, date } : d)) }))
  const addBlock = (i) =>
    setConfig((c) => ({
      ...c,
      days: c.days.map((d, x) => (x === i ? { ...d, blocks: [...d.blocks, DEFAULT_BLOCK()] } : d)),
    }))
  const removeBlock = (i, bi) =>
    setConfig((c) => ({
      ...c,
      days: c.days.map((d, x) => (x === i ? { ...d, blocks: d.blocks.filter((_, y) => y !== bi) } : d)),
    }))
  const setBlock = (i, bi, key, val) =>
    setConfig((c) => ({
      ...c,
      days: c.days.map((d, x) =>
        x === i ? { ...d, blocks: d.blocks.map((b, y) => (y === bi ? { ...b, [key]: val } : b)) } : d
      ),
    }))

  const totalSlots = config.days.reduce(
    (sum, d) => sum + d.blocks.reduce((s, b) => s + slotTimes(b, config.interval).length, 0),
    0
  )
  // 미리보기: 첫 번째 날의 시각 예시
  const firstDay = config.days.find((d) => d.date && d.blocks.some((b) => slotTimes(b, config.interval).length))
  const previewTimes = firstDay
    ? firstDay.blocks.flatMap((b) => slotTimes(b, config.interval)).slice(0, 8)
    : []

  async function save() {
    setSaving(true)
    setMsg('')
    try {
      const r = await saveInterviewConfig(config)
      setMsg(r.ok ? '저장됐어요.' : r.message || '저장 실패')
    } catch (e) {
      setMsg('저장 실패: ' + e.message)
    }
    setSaving(false)
  }
  async function makeForms() {
    if (!config.tier) { setMsg('면접 기수를 입력해 주세요.'); return }
    setCreating(true)
    setMsg('')
    try {
      await saveInterviewConfig(config)
      const r = await createInterviewForms(config.tier)
      if (r.ok) {
        setForms({ interviewerUrl: r.interviewerUrl, folder: r.folder || '' })
        setMsg('면접관 폼이 준비됐어요. 아래 링크를 면접관들에게 공유하세요.')
      } else {
        setMsg(r.message || '폼 생성 실패')
      }
    } catch (e) {
      setMsg('폼 생성 실패: ' + e.message)
    }
    setCreating(false)
  }

  if (status === 'loading') return <div className="iv-note">설정을 불러오는 중…</div>
  if (status === 'error') return <div className="iv-note iv-note-err">{msg}</div>

  return (
    <div className="setup">
      <div className="setup-top">
        <label className="field field-inline">
          <span>면접 기수</span>
          <div className="tier-input">
            <input className="num-sm" inputMode="numeric" placeholder="8" value={config.tier} onChange={(e) => setTier(e.target.value)} />
            <span className="tier-suffix">기</span>
          </div>
        </label>
        <label className="field field-inline">
          <span>면접 간격 (분)</span>
          <input className="num-sm" type="number" min={1} value={config.interval} onChange={(e) => setIntervalV(e.target.value)} />
        </label>
      </div>
      <p className="hint">폼은 드라이브 <b>2. 모집 및 공채 › 부원 면접 › {config.tier ? config.tier + '기' : 'N기'}</b> 폴더에 저장돼요. (폴더가 없으면 자동 생성)</p>

      {config.days.length === 0 && (
        <div className="cond-empty">“+ 날짜 추가”를 눌러 면접 날짜와 시간 구간을 정해 주세요.</div>
      )}

      {config.days.map((day, i) => (
        <div className="setup-day" key={i}>
          <div className="setup-day-head">
            <input type="date" value={day.date} onChange={(e) => setDate(i, e.target.value)} />
            <span className="setup-day-label">{dateLabel(day.date)}</span>
            <button type="button" className="cond-remove" onClick={() => removeDay(i)}>날짜 삭제</button>
          </div>
          {day.blocks.map((b, bi) => (
            <div className="setup-block" key={bi}>
              <span className="block-idx">구간 {bi + 1}</span>
              <input type="time" value={b.start} onChange={(e) => setBlock(i, bi, 'start', e.target.value)} />
              <span className="tilde">~</span>
              <input type="time" value={b.end} onChange={(e) => setBlock(i, bi, 'end', e.target.value)} />
              <span className="block-count">{slotTimes(b, config.interval).length}칸</span>
              <button type="button" className="cond-remove" onClick={() => removeBlock(i, bi)}>×</button>
            </div>
          ))}
          <button type="button" className="cond-add" onClick={() => addBlock(i)}>+ 시간 구간 추가</button>
        </div>
      ))}

      <button type="button" className="link-toggle" onClick={addDay}>+ 날짜 추가</button>

      <div className="setup-summary">
        면접관 폼 선택지 <b>{totalSlots}개</b>
        {previewTimes.length > 0 && (
          <span className="setup-labels"> · 예: {dateLabel(firstDay.date)} {previewTimes.join(', ')}{totalSlots > previewTimes.length ? ' …' : ''}</span>
        )}
      </div>

      {msg && <div className="org-warning">{msg}</div>}

      <div className="setup-actions">
        <button type="button" className="btn btn-ghost" onClick={save} disabled={saving}>
          {saving ? '저장 중…' : '설정 저장'}
        </button>
        <button type="button" className="btn" onClick={makeForms} disabled={creating || totalSlots === 0 || !config.tier}>
          {creating ? '폼 만드는 중…' : '면접관 폼 만들기 / 갱신'}
        </button>
      </div>

      {forms.interviewerUrl && (
        <div className="setup-forms">
          <div className="form-link">
            <span>면접관용 폼 (면접관들에게 공유)</span>
            <a href={forms.interviewerUrl} target="_blank" rel="noreferrer">{forms.interviewerUrl}</a>
          </div>
          {forms.folder && <p className="hint">저장 위치: <b>{forms.folder}</b></p>}
          <p className="hint">위에서 정한 시각들이 체크박스로 들어가 있어요. 시간대를 바꾸면 “갱신”을 다시 눌러 주세요.</p>
        </div>
      )}

      <div className="setup-forms">
        <label className="field">
          <span>지원자 응답 연결 — 신규모집 폼의 응답 시트 링크</span>
          <input
            type="text"
            placeholder="지원자 응답이 쌓이는 구글 시트 주소를 붙여넣으세요"
            value={config.applicantSheetUrl || ''}
            onChange={(e) => setApplicantUrl(e.target.value)}
          />
          <small className="hint">
            그 시트에서 <b>성명</b>, <b>가능한 시간</b>(또는 “면접 일정 조사”), <b>요구사항</b> 칸을 자동으로 읽어옵니다. 붙여넣은 뒤 <b>설정 저장</b>을 눌러 주세요.
          </small>
        </label>
      </div>
    </div>
  )
}
