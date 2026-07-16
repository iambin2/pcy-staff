import { useEffect, useMemo, useState } from 'react'
import { listTasks, saveTask, deleteTask } from '../api'
import Select from './Select'

const STATUSES = ['예정', '진행중', '완료']
const PRIORITIES = ['높음', '보통', '낮음']
const DEPTS = ['임원진 전체', '회장단', '기획부', '인사부', '총무부', '정보부']
const DEPT_COLORS = {
  '임원진 전체': '#5b8def', '회장단': '#e8b45a', '기획부': '#45d1a5',
  '인사부': '#e488b8', '총무부': '#e0864a', '정보부': '#a988f0',
}
const WEEK = ['일', '월', '화', '수', '목', '금', '토']

const pad2 = (n) => String(n).padStart(2, '0')
const keyOf = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
const todayKey = keyOf(new Date())

function monthGrid(year, month) {
  const first = new Date(year, month, 1)
  const cells = []
  for (let i = 0; i < first.getDay(); i++) cells.push(null)
  const days = new Date(year, month + 1, 0).getDate()
  for (let d = 1; d <= days; d++) cells.push(new Date(year, month, d))
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}
function emptyTask(dateKey) {
  return { id: '', 진행상태: '예정', 우선순위: '보통', 업무명: '', 시작일: '', 마감일: dateKey || '', 담당부서: '임원진 전체', 담당자: '', 메모: '' }
}
// 업무의 실제 시작~끝 (시작일이 없거나 마감일보다 뒤면 하루짜리)
function spanOf(t) {
  const s = t.시작일 && t.시작일 <= t.마감일 ? t.시작일 : t.마감일
  return { s, e: t.마감일, range: !!(t.시작일 && t.시작일 < t.마감일) }
}

export default function CalendarHome() {
  const now = new Date()
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() })
  const [tasks, setTasks] = useState([])
  const [status, setStatus] = useState('loading')
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    listTasks()
      .then((r) => { if (r.ok) { setTasks(r.tasks || []); setStatus('ready') } else { setStatus('error'); setMsg(r.message || '불러오기 실패') } })
      .catch((e) => { setStatus('error'); setMsg('서버 연결 실패: ' + e.message) })
  }, [])

  // Esc = 취소(닫기)
  useEffect(() => {
    if (!editing) return
    const onKey = (e) => { if (e.key === 'Escape') setEditing(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [editing])

  const cells = useMemo(() => monthGrid(ym.y, ym.m), [ym])
  const weeks = useMemo(() => {
    const w = []
    for (let i = 0; i < cells.length; i += 7) w.push(cells.slice(i, i + 7))
    return w
  }, [cells])
  const validTasks = useMemo(() => tasks.filter((t) => t.마감일), [tasks])

  // 한 주(7일)에 대해 겹치지 않게 레인(줄)을 배치
  function weekLanes(weekDays) {
    const dayKeys = weekDays.map((d) => (d ? keyOf(d) : null))
    const present = dayKeys.filter(Boolean)
    if (!present.length) return { lanes: [], dayKeys }
    const first = present[0], last = present[present.length - 1]
    const items = []
    validTasks.forEach((t) => {
      const { s, e, range } = spanOf(t)
      if (e < first || s > last) return
      let si = -1, ei = -1
      dayKeys.forEach((k, i) => { if (k && k >= s && k <= e) { if (si < 0) si = i; ei = i } })
      if (si < 0) return
      items.push({ t, si, ei, gStart: s === dayKeys[si], gEnd: e === dayKeys[ei], range })
    })
    items.sort((a, b) => (b.ei - b.si) - (a.ei - a.si) || a.si - b.si)
    const lanes = []
    items.forEach((it) => {
      let placed = false
      for (const lane of lanes) {
        if (lane.every((x) => it.ei < x.si || it.si > x.ei)) { lane.push(it); placed = true; break }
      }
      if (!placed) lanes.push([it])
    })
    return { lanes, dayKeys }
  }

  function shiftMonth(delta) {
    setYm(({ y, m }) => { const d = new Date(y, m + delta, 1); return { y: d.getFullYear(), m: d.getMonth() } })
  }

  async function save() {
    if (!editing.업무명.trim()) { setMsg('업무명을 입력해 주세요.'); return }
    if (!editing.마감일) { setMsg('마감일을 정해 주세요.'); return }
    setSaving(true); setMsg('')
    try {
      const payload = { ...editing }
      if (payload.시작일 && payload.시작일 > payload.마감일) payload.시작일 = '' // 잘못된 범위는 하루짜리로
      const r = await saveTask(payload)
      if (r.ok) {
        const t = r.task
        setTasks((prev) => { const i = prev.findIndex((x) => x.id === t.id); if (i >= 0) { const c = prev.slice(); c[i] = t; return c } return [...prev, t] })
        setEditing(null)
      } else setMsg(r.message || '저장 실패')
    } catch (e) { setMsg('저장 실패: ' + e.message) }
    setSaving(false)
  }
  async function remove() {
    if (!editing.id) { setEditing(null); return }
    setSaving(true); setMsg('')
    try { const r = await deleteTask(editing.id); if (r.ok) { setTasks((prev) => prev.filter((x) => x.id !== editing.id)); setEditing(null) } else setMsg(r.message || '삭제 실패') }
    catch (e) { setMsg('삭제 실패: ' + e.message) }
    setSaving(false)
  }

  if (status === 'loading') return <div className="iv-note">불러오는 중…</div>
  if (status === 'error') return <div className="iv-note iv-note-err">{msg}</div>
  const set = (k, v) => setEditing((e) => ({ ...e, [k]: v }))

  return (
    <div className="module">
      <div className="module-head">
        <h2>업무 캘린더</h2>
        <p>마감일을 기준으로 업무를 한눈에 확인하세요.</p>
      </div>

      <div className="cal-bar">
        <div className="cal-nav">
          <button type="button" onClick={() => shiftMonth(-1)} aria-label="이전 달">‹</button>
          <span className="cal-title">{ym.y}년 {ym.m + 1}월</span>
          <button type="button" onClick={() => shiftMonth(1)} aria-label="다음 달">›</button>
          <button type="button" className="cal-today" onClick={() => setYm({ y: now.getFullYear(), m: now.getMonth() })}>오늘</button>
        </div>
        <button type="button" className="btn" onClick={() => setEditing(emptyTask(''))}>＋ 업무 추가</button>
      </div>

      <div className="cal-legend">
        {DEPTS.map((d) => (
          <span className="cal-leg" key={d}><i style={{ background: DEPT_COLORS[d] }} />{d}</span>
        ))}
      </div>

      <div className="cal-grid">
        {WEEK.map((w, i) => (
          <div key={w} className={'cal-wh' + (i === 0 ? ' cal-sun' : i === 6 ? ' cal-sat' : '')}>{w}</div>
        ))}
        {weeks.map((week, wi) => {
          const { lanes } = weekLanes(week)
          return week.map((d, di) => {
            if (!d) return <div key={wi + '-' + di} className="cal-cell cal-blank" />
            const k = keyOf(d)
            return (
              <div key={k} className={'cal-cell' + (k === todayKey ? ' cal-today-cell' : '')} onClick={() => setEditing(emptyTask(k))}>
                <div className={'cal-day' + (d.getDay() === 0 ? ' cal-sun' : d.getDay() === 6 ? ' cal-sat' : '')}>{d.getDate()}</div>
                <div className="cal-tasks">
                  {lanes.map((lane, li) => {
                    const it = lane.find((x) => di >= x.si && di <= x.ei)
                    if (!it) return <div className="cal-lane-empty" key={li} />
                    const segStart = di === it.si
                    const roundL = segStart && it.gStart
                    const roundR = di === it.ei && it.gEnd
                    const done = it.t.진행상태 === '완료'
                    return (
                      <button
                        key={li}
                        className={'cal-seg' + (roundL ? ' r-l' : '') + (roundR ? ' r-r' : '') + (done ? ' done' : '')}
                        style={{ background: DEPT_COLORS[it.t.담당부서] || '#5b8def', color: '#0b1220' }}
                        onClick={(e) => { e.stopPropagation(); setEditing({ ...it.t }) }}
                        title={it.t.업무명 + ' · ' + it.t.담당부서}
                      >
                        {segStart ? (done ? '✓ ' : '') + it.t.업무명 : '\u00A0'}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })
        })}
      </div>

      {editing && (
        <div className="modal-overlay" onClick={() => setEditing(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editing.id ? '업무 수정' : '업무 추가'}</h3>
            <label className="field"><span>업무명</span>
              <input type="text" value={editing.업무명} onChange={(e) => set('업무명', e.target.value)} autoFocus />
            </label>
            <div className="modal-row">
              <label className="field"><span>시작일 <em style={{ color: 'var(--muted)' }}>(선택)</em></span>
                <input type="date" value={editing.시작일} onChange={(e) => set('시작일', e.target.value)} />
              </label>
              <label className="field"><span>마감일</span>
                <input type="date" value={editing.마감일} onChange={(e) => set('마감일', e.target.value)} />
              </label>
            </div>
            <p className="hint" style={{ marginTop: '-4px' }}>시작일을 넣으면 시작일~마감일이 막대로 이어져 표시돼요.</p>
            <div className="modal-row">
              <label className="field"><span>진행상태</span>
                <Select value={editing.진행상태} onChange={(v) => set('진행상태', v)} options={STATUSES} ariaLabel="진행상태" />
              </label>
              <label className="field"><span>우선순위</span>
                <Select value={editing.우선순위} onChange={(v) => set('우선순위', v)} options={PRIORITIES} ariaLabel="우선순위" />
              </label>
            </div>
            <label className="field"><span>담당 부서</span>
              <Select value={editing.담당부서} onChange={(v) => set('담당부서', v)} options={DEPTS} ariaLabel="담당 부서" colorMap={DEPT_COLORS} />
            </label>
            <label className="field"><span>담당자</span>
              <input type="text" value={editing.담당자} onChange={(e) => set('담당자', e.target.value)} placeholder="예: 이제빈 등 3명" />
            </label>
            <label className="field"><span>메모</span>
              <textarea rows={2} value={editing.메모} onChange={(e) => set('메모', e.target.value)} />
            </label>

            {msg && <div className="field-error">{msg}</div>}

            <div className="modal-actions">
              {editing.id && <button type="button" className="modal-del" onClick={remove} disabled={saving}>삭제</button>}
              <div className="modal-actions-right">
                <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)} disabled={saving}>취소</button>
                <button type="button" className="btn" onClick={save} disabled={saving}>{saving ? '저장 중…' : '저장'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
