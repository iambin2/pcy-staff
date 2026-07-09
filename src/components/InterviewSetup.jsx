import { useEffect, useState } from 'react'
import { getInterviewConfig, saveInterviewConfig, createInterviewForms } from '../api'

const DEFAULT_BLOCK = () => ({ label: '오전', start: '10:00', end: '12:00' })
const DEFAULT_DAY = () => ({ date: '', blocks: [DEFAULT_BLOCK()] })

function toMin(t) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t || '')
  return m ? +m[1] * 60 + +m[2] : null
}
function dateLabel(dateStr) {
  const m = /(\d{4})-(\d{1,2})-(\d{1,2})/.exec(dateStr || '')
  return m ? `${+m[2]}월 ${+m[3]}일` : '(날짜 미정)'
}
function blockSlots(block, interval) {
  const s = toMin(block.start),
    e = toMin(block.end)
  if (s == null || e == null || e <= s || interval < 1) return 0
  return Math.floor((e - s) / interval)
}

export default function InterviewSetup() {
  const [config, setConfig] = useState({ interval: 20, days: [], applicantSheetUrl: '' })
  const [forms, setForms] = useState({ interviewerUrl: '' })
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [saving, setSaving] = useState(false)
  const [creating, setCreating] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    getInterviewConfig()
      .then((r) => {
        if (r.ok) {
          setConfig(r.config?.days ? { applicantSheetUrl: '', ...r.config } : { interval: 20, days: [], applicantSheetUrl: '' })
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

  // 편집 헬퍼
  const setInterval = (v) => setConfig((c) => ({ ...c, interval: Math.max(1, Number(v) || 1) }))
  const setApplicantUrl = (v) => setConfig((c) => ({ ...c, applicantSheetUrl: v }))
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
    (sum, d) => sum + d.blocks.reduce((s, b) => s + blockSlots(b, config.interval), 0),
    0
  )
  const labels = config.days.flatMap((d) =>
    d.blocks.filter((b) => b.label).map((b) => `${dateLabel(d.date)} ${b.label}`)
  )

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
    setCreating(true)
    setMsg('')
    try {
      await saveInterviewConfig(config) // 최신 설정 반영 후 생성
      const r = await createInterviewForms()
      if (r.ok) {
        setForms({ interviewerUrl: r.interviewerUrl })
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
      <div className="field field-inline">
        <span>면접 간격 (분)</span>
        <input
          className="num-sm"
          type="number"
          min={1}
          value={config.interval}
          onChange={(e) => setInterval(e.target.value)}
        />
      </div>

      {config.days.length === 0 && (
        <div className="cond-empty">“+ 날짜 추가”를 눌러 면접 날짜와 시간대를 정해 주세요.</div>
      )}

      {config.days.map((day, i) => (
        <div className="setup-day" key={i}>
          <div className="setup-day-head">
            <input type="date" value={day.date} onChange={(e) => setDate(i, e.target.value)} />
            <span className="setup-day-label">{dateLabel(day.date)}</span>
            <button type="button" className="cond-remove" onClick={() => removeDay(i)}>
              날짜 삭제
            </button>
          </div>
          {day.blocks.map((b, bi) => (
            <div className="setup-block" key={bi}>
              <input
                className="block-name"
                type="text"
                value={b.label}
                placeholder="이름(예: 오전)"
                onChange={(e) => setBlock(i, bi, 'label', e.target.value)}
              />
              <input type="time" value={b.start} onChange={(e) => setBlock(i, bi, 'start', e.target.value)} />
              <span className="tilde">~</span>
              <input type="time" value={b.end} onChange={(e) => setBlock(i, bi, 'end', e.target.value)} />
              <span className="block-count">{blockSlots(b, config.interval)}칸</span>
              <button type="button" className="cond-remove" onClick={() => removeBlock(i, bi)}>
                ×
              </button>
            </div>
          ))}
          <button type="button" className="cond-add" onClick={() => addBlock(i)}>
            + 시간대 추가
          </button>
        </div>
      ))}

      <button type="button" className="link-toggle" onClick={addDay}>
        + 날짜 추가
      </button>

      <div className="setup-summary">
        생성될 면접 칸 <b>{totalSlots}개</b>
        {labels.length > 0 && (
          <span className="setup-labels"> · 폼 선택지: {labels.join(' / ')}</span>
        )}
      </div>

      {msg && <div className="org-warning">{msg}</div>}

      <div className="setup-actions">
        <button type="button" className="btn btn-ghost" onClick={save} disabled={saving}>
          {saving ? '저장 중…' : '설정 저장'}
        </button>
        <button type="button" className="btn" onClick={makeForms} disabled={creating || totalSlots === 0}>
          {creating ? '폼 만드는 중…' : '면접관 폼 만들기 / 갱신'}
        </button>
      </div>

      {forms.interviewerUrl && (
        <div className="setup-forms">
          <div className="form-link">
            <span>면접관용 폼 (이 링크를 면접관들에게 공유)</span>
            <a href={forms.interviewerUrl} target="_blank" rel="noreferrer">
              {forms.interviewerUrl}
            </a>
          </div>
          <p className="hint">위에서 정한 시간대가 체크박스 선택지로 들어가 있어요. 시간대를 바꾸면 “갱신”을 다시 눌러 주세요.</p>
        </div>
      )}

      <div className="setup-forms">
        <label className="field">
          <span>지원자 응답 연결 — 신청 폼의 응답 시트 링크</span>
          <input
            type="text"
            placeholder="기존 신청(멤버십) 폼 응답이 쌓이는 구글 시트 주소를 붙여넣으세요"
            value={config.applicantSheetUrl || ''}
            onChange={(e) => setApplicantUrl(e.target.value)}
          />
          <small className="hint">
            그 시트의 <b>성명</b>·<b>면접 일정 조사</b> 칸을 자동으로 읽어옵니다. (지원자용 폼은 새로 만들지 않아요.)
          </small>
        </label>
      </div>
    </div>
  )
}
