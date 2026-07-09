import { useState, useMemo } from 'react'

// ══════════ 파싱 ══════════
function parseApplicants(text) {
  const rows = []
  const errors = []
  text.split(/\n+/).forEach((line) => {
    if (!line.trim()) return
    const parts = line.split('\t').map((s) => s.trim())
    const name = parts[0]
    if (!name) return
    if (/성명|이름/.test(name) && parts.length <= 3) return // 헤더 skip
    rows.push({ name, avail: parts[1] || '', req: parts[2] || '' })
  })
  return { rows, errors }
}

function parseSlotRows(text) {
  const rows = []
  const failed = []
  text.split(/\n+/).forEach((line) => {
    if (!line.trim()) return
    const parts = line.split('\t').map((s) => s.trim())
    if (/시간대|면접관/.test(parts[0]) && !/\d/.test(parts[0])) return // 헤더 skip
    const slot = parseSlot(parts[0])
    const interviewers = parts.slice(1).filter(Boolean)
    if (!slot) {
      failed.push(line.slice(0, 30))
      return
    }
    rows.push({ ...slot, interviewers })
  })
  return { rows, failed }
}

function parseSlot(str) {
  if (!str) return null
  const timeM = str.match(/(\d{1,2}):(\d{2})/)
  if (!timeM) return null
  let h = +timeM[1]
  const mi = +timeM[2]
  const rest = str.replace(timeM[0], ' ')
  if (str.includes('오후') && h < 12) h += 12
  if (str.includes('오전') && h === 12) h = 0
  let mo, d
  let dm = rest.match(/(\d{1,2})\s*월\s*(\d{1,2})\s*일/)
  if (dm) {
    mo = +dm[1]
    d = +dm[2]
  } else if ((dm = rest.match(/\d{4}\s*[-./]\s*(\d{1,2})\s*[-./]\s*(\d{1,2})/))) {
    mo = +dm[1]
    d = +dm[2]
  } else if ((dm = rest.match(/(\d{1,2})\s*[-./]\s*(\d{1,2})/))) {
    mo = +dm[1]
    d = +dm[2]
  }
  if (mo == null || d == null) return null
  return {
    raw: str.trim(),
    mo,
    d,
    h,
    mi,
    min: h * 60 + mi,
    dateKey: `${mo}월 ${d}일`,
    ampm: h < 12 ? '오전' : '오후',
  }
}

function parseAvail(str) {
  return str
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((tok) => {
      const dm = tok.match(/(\d{1,2})월\s*(\d{1,2})일/)
      const ampm = tok.includes('오전') ? '오전' : tok.includes('오후') ? '오후' : null
      return dm ? { mo: +dm[1], d: +dm[2], ampm } : null
    })
    .filter(Boolean)
}

function parseReq(str) {
  if (!str) return []
  return str
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((tok) => {
      const dm = tok.match(/(\d{1,2})월\s*(\d{1,2})일/)
      const times = [...tok.matchAll(/(\d{1,2}):(\d{2})/g)].map((m) => +m[1] * 60 + +m[2])
      const excl = tok.includes('제외')
      const date = dm ? { mo: +dm[1], d: +dm[2] } : null
      let type = null,
        from = null,
        to = null
      if (tok.includes('~') && times.length >= 2) {
        from = times[0]
        to = times[1]
        type = excl ? 'ex_range' : 'only_range'
      } else if (tok.includes('이후') && times.length >= 1) {
        from = times[0]
        type = excl ? 'ex_after' : 'only_after'
      } else if (tok.includes('이전') && times.length >= 1) {
        from = times[0]
        type = excl ? 'ex_before' : 'only_before'
      } else if (times.length >= 1 && excl) {
        from = times[0]
        to = times[0] + 1
        type = 'ex_range'
      }
      return type ? { date, type, from, to } : null
    })
    .filter(Boolean)
}

function availOk(av, slot) {
  if (av.length === 0) return false
  return av.some(
    (e) => e.mo === slot.mo && e.d === slot.d && (e.ampm === null || e.ampm === slot.ampm)
  )
}
function reqOk(rules, slot) {
  const t = slot.min
  const applic = rules.filter((r) => !r.date || (r.date.mo === slot.mo && r.date.d === slot.d))
  for (const r of applic) {
    if (r.type === 'ex_range' && t >= r.from && t < r.to) return false
    if (r.type === 'ex_after' && t >= r.from) return false
    if (r.type === 'ex_before' && t < r.from) return false
  }
  const onlys = applic.filter((r) => r.type.startsWith('only'))
  if (onlys.length) {
    const ok = onlys.some((r) => {
      if (r.type === 'only_range') return t >= r.from && t < r.to
      if (r.type === 'only_after') return t >= r.from
      if (r.type === 'only_before') return t < r.from
      return false
    })
    if (!ok) return false
  }
  return true
}
function shuffle(a) {
  a = a.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
function pad(n) {
  return String(n).padStart(2, '0')
}

// ══════════ 배정 ══════════
function assign(applicantRows, slots) {
  const applicants = applicantRows.map((a) => ({
    name: a.name,
    av: parseAvail(a.avail),
    rules: parseReq(a.req),
  }))
  const usable = slots.filter((s) => s.interviewers.length).slice()
  usable.sort((a, b) => a.mo - b.mo || a.d - b.d || a.min - b.min)

  const eligible = (a, s) => availOk(a.av, s) && reqOk(a.rules, s)
  applicants.forEach((a) => (a.eligCount = usable.filter((s) => eligible(a, s)).length))

  const pool = new Set(shuffle(applicants))
  const load = {}
  const rooms = []
  const byDate = {}
  usable.forEach((s) => (byDate[s.dateKey] = byDate[s.dateKey] || []).push(s))

  for (const dateKey of Object.keys(byDate)) {
    let slotIdx = 0
    for (const slot of byDate[dateKey]) {
      const elig = [...pool].filter((a) => eligible(a, slot))
      if (!elig.length || !slot.interviewers.length) continue
      slotIdx++
      const labels = slotIdx % 2 === 1 ? ['A', 'B'] : ['C', 'D']
      elig.sort((a, b) => a.eligCount - b.eligCount || Math.random() - 0.5)
      const usedInt = new Set()
      const maxRooms = Math.min(2, slot.interviewers.length)
      for (let k = 0; k < maxRooms; k++) {
        const remaining = elig.filter((a) => pool.has(a))
        if (!remaining.length) break
        const cand = slot.interviewers
          .filter((n) => !usedInt.has(n))
          .sort((x, y) => (load[x] || 0) - (load[y] || 0) || Math.random() - 0.5)
        if (!cand.length) break
        const interviewer = cand[0]
        usedInt.add(interviewer)
        const seat = remaining.slice(0, 2)
        if (!seat.length) break
        seat.forEach((a) => pool.delete(a))
        load[interviewer] = (load[interviewer] || 0) + 1
        rooms.push({
          group: labels[k],
          mo: slot.mo,
          d: slot.d,
          min: slot.min,
          dateKey: slot.dateKey,
          time: `${pad(Math.floor(slot.min / 60))}:${pad(slot.min % 60)}`,
          interviewer,
          applicants: seat.map((a) => a.name),
        })
      }
    }
  }
  return { rooms, unassigned: [...pool].map((a) => a.name), load }
}

function makeText(result) {
  const now = new Date()
  const ts = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(
    now.getHours()
  )}:${pad(now.getMinutes())}`
  let out = `📋 면접 배정 결과 [${ts}]\n`
  const byDate = {}
  result.rooms.forEach((r) => (byDate[r.dateKey] = byDate[r.dateKey] || []).push(r))
  for (const dateKey of Object.keys(byDate)) {
    out += `\n■ ${dateKey}\n`
    byDate[dateKey]
      .sort((a, b) => a.min - b.min || a.group.localeCompare(b.group))
      .forEach((r) => {
        out += `[${r.group}] ${r.time}  면접관 ${r.interviewer}  |  ${r.applicants.join(', ')}\n`
      })
  }
  if (result.unassigned.length) {
    out += `\n⚠️ 미배정 (수동 조정 필요): ${result.unassigned.join(', ')}\n`
  }
  return out
}

// ══════════ 화면 ══════════
export default function InterviewScheduler() {
  const [applicantsText, setApplicantsText] = useState('')
  const [slotsText, setSlotsText] = useState('')
  const [result, setResult] = useState(null)
  const [copied, setCopied] = useState(false)

  const applicants = useMemo(() => parseApplicants(applicantsText), [applicantsText])
  const slotParse = useMemo(() => parseSlotRows(slotsText), [slotsText])

  function run() {
    setCopied(false)
    if (!applicants.rows.length || !slotParse.rows.length) return
    setResult(assign(applicants.rows, slotParse.rows))
  }
  function copyText() {
    if (!result) return
    navigator.clipboard.writeText(makeText(result)).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const resultByDate = useMemo(() => {
    if (!result) return []
    const map = {}
    result.rooms.forEach((r) => (map[r.dateKey] = map[r.dateKey] || []).push(r))
    return Object.entries(map).map(([dateKey, rows]) => ({
      dateKey,
      rows: rows.sort((a, b) => a.min - b.min || a.group.localeCompare(b.group)),
    }))
  }, [result])

  return (
    <div className="module">
      <div className="module-head">
        <h2>면접 자동 배정</h2>
        <p>지원자와 시간대별 면접관을 붙여넣으면, 요구사항을 지켜 시간·면접관을 자동 배정합니다.</p>
      </div>

      <div className="iv-inputs">
        <label className="field">
          <span>
            지원자 <em>({applicants.rows.length}명)</em>
          </span>
          <textarea
            rows={7}
            placeholder={'엑셀에서 [성명 · 가능시간 · 요구사항] 3개 열을 복사해 붙여넣으세요.\n\n예)\n강민지\t3월 9일 오전, 3월 9일 오후\t3월 9일 15:00~17:00 제외'}
            value={applicantsText}
            onChange={(e) => setApplicantsText(e.target.value)}
          />
          <small className="hint">가능시간은 “3월 9일 오전” 형태, 요구사항은 비워도 됩니다.</small>
        </label>

        <label className="field">
          <span>
            시간대 · 면접관 <em>({slotParse.rows.length}개)</em>
          </span>
          <textarea
            rows={7}
            placeholder={'엑셀에서 [일시 · 면접관들] 열을 복사해 붙여넣으세요.\n\n예)\n2026-03-07 10:00:00\t김채운\t이제빈\t경재우'}
            value={slotsText}
            onChange={(e) => setSlotsText(e.target.value)}
          />
          {slotParse.failed.length > 0 && (
            <small className="hint hint-warn">
              인식 못한 줄 {slotParse.failed.length}개 (일시 형식을 확인해 주세요)
            </small>
          )}
        </label>
      </div>

      <button
        type="button"
        className="btn btn-full iv-run"
        onClick={run}
        disabled={!applicants.rows.length || !slotParse.rows.length}
      >
        {result ? '다시 배정하기' : '면접 배정 실행'}
      </button>

      {result && (
        <div className="iv-result">
          <div className="iv-summary">
            <span className="iv-stat">
              배정 <b>{result.rooms.reduce((n, r) => n + r.applicants.length, 0)}</b>명
            </span>
            <span className="iv-stat">
              방 <b>{result.rooms.length}</b>개
            </span>
            <span className={'iv-stat' + (result.unassigned.length ? ' iv-stat-warn' : '')}>
              미배정 <b>{result.unassigned.length}</b>명
            </span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={copyText}>
              {copied ? '복사됨 ✓' : '전체 복사'}
            </button>
          </div>

          {result.unassigned.length > 0 && (
            <div className="iv-unassigned">
              <b>미배정 (수동 조정 필요):</b> {result.unassigned.join(', ')}
            </div>
          )}

          {resultByDate.map(({ dateKey, rows }) => (
            <div className="iv-date-block" key={dateKey}>
              <h3 className="iv-date-title">{dateKey}</h3>
              <div className="iv-table">
                <div className="iv-row iv-row-head">
                  <span>그룹</span>
                  <span>시간</span>
                  <span>면접관</span>
                  <span>지원자</span>
                </div>
                {rows.map((r, i) => (
                  <div className="iv-row" key={i}>
                    <span>
                      <span className={'iv-group iv-group-' + r.group}>{r.group}</span>
                    </span>
                    <span>{r.time}</span>
                    <span>{r.interviewer}</span>
                    <span className="iv-applicants">{r.applicants.join(', ')}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <details className="iv-load">
            <summary>면접관별 배정 수</summary>
            <div className="iv-load-list">
              {Object.entries(result.load)
                .sort((a, b) => b[1] - a[1])
                .map(([n, c]) => (
                  <span className="iv-load-item" key={n}>
                    {n} <b>{c}</b>
                  </span>
                ))}
            </div>
          </details>
        </div>
      )}
    </div>
  )
}
