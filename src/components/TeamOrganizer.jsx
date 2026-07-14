import { useState } from 'react'

// ── 파싱/유틸 ─────────────────────────────────────────
function parseNames(text) {
  return text
    .split(/[\n,\t]+/)
    .map((s) => s.trim())
    .filter(Boolean)
}
function shuffle(arr) {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
function pad(n) {
  return String(n).padStart(2, '0')
}

// 두 편 분리: a측 사람과 b측 사람이 같은 조에 있으면 위반
function violatesApart(groupMembers, unitMembers, apart) {
  const all = new Set([...groupMembers, ...unitMembers])
  for (const r of apart) {
    if (r.a.some((p) => all.has(p)) && r.b.some((p) => all.has(p))) return true
  }
  return false
}

function organize(participants, groupCount, togetherSets, apartRules) {
  const uniq = [...new Set(participants)]
  const present = new Set(uniq)
  const together = togetherSets.map((s) => s.filter((x) => present.has(x))).filter((s) => s.length > 1)
  const apart = apartRules
    .map((r) => ({ a: r.a.filter((x) => present.has(x)), b: r.b.filter((x) => present.has(x)) }))
    .filter((r) => r.a.length && r.b.length)

  const parent = {}
  uniq.forEach((p) => (parent[p] = p))
  const find = (x) => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]]
      x = parent[x]
    }
    return x
  }
  together.forEach((set) => {
    for (let i = 1; i < set.length; i++) parent[find(set[0])] = find(set[i])
  })

  const cm = {}
  uniq.forEach((p) => {
    const r = find(p)
    ;(cm[r] = cm[r] || []).push(p)
  })
  const units = Object.values(cm)
  const bonded = units.filter((u) => u.length > 1).sort((a, b) => b.length - a.length)
  const singles = shuffle(units.filter((u) => u.length === 1))
  const ordered = [...bonded, ...singles]

  const groups = Array.from({ length: groupCount }, () => [])
  for (const unit of ordered) {
    const idx = groups.map((_, i) => i).sort((a, b) => groups[a].length - groups[b].length)
    let chosen = idx.find((i) => !violatesApart(groups[i], unit, apart))
    if (chosen === undefined) chosen = idx[0]
    groups[chosen].push(...unit)
  }
  return groups
}

function makeAnnouncement(groups) {
  const now = new Date()
  const ts = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(
    now.getHours()
  )}:${pad(now.getMinutes())}`
  let out = `📢 [${ts}] 정모 조 편성 결과\n\n`
  groups.forEach((g, i) => {
    out += `📍 ${i + 1}조: ${g.join(', ')}\n`
  })
  return out
}

// ── 명단에서 사람을 골라 담는 선택기 ──────────────────
function MemberPicker({ pool, selected, onAdd, onRemove, placeholder = '+ 이름 추가' }) {
  const available = pool.filter((n) => !selected.includes(n))
  const label =
    pool.length === 0 ? '명단 먼저 입력' : available.length === 0 ? '모두 선택됨' : placeholder
  return (
    <div className="picker">
      {selected.map((n) => (
        <span className="pchip" key={n}>
          {n}
          <button type="button" onClick={() => onRemove(n)} aria-label={`${n} 제거`}>
            ×
          </button>
        </span>
      ))}
      <select
        className="picker-select"
        value=""
        disabled={available.length === 0}
        onChange={(e) => {
          if (e.target.value) onAdd(e.target.value)
          e.target.value = ''
        }}
      >
        <option value="">{label}</option>
        {available.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
    </div>
  )
}

// ── 화면 ──────────────────────────────────────────────
export default function TeamOrganizer() {
  const [namesText, setNamesText] = useState('')
  const [groupCount, setGroupCount] = useState(4)
  const [togetherGroups, setTogetherGroups] = useState([]) // [[name,...], ...]
  const [apartRules, setApartRules] = useState([]) // [{a:[],b:[]}, ...]
  const [groups, setGroups] = useState(null)
  const [copied, setCopied] = useState(false)
  const [warning, setWarning] = useState('')

  const participants = [...new Set(parseNames(namesText))]

  // 묶기 핸들러
  const addTogetherGroup = () => setTogetherGroups((g) => [...g, []])
  const removeTogetherGroup = (i) => setTogetherGroups((g) => g.filter((_, idx) => idx !== i))
  const addToTogether = (i, name) =>
    setTogetherGroups((g) => g.map((set, idx) => (idx === i ? [...set, name] : set)))
  const removeFromTogether = (i, name) =>
    setTogetherGroups((g) => g.map((set, idx) => (idx === i ? set.filter((n) => n !== name) : set)))

  // 분리 핸들러
  const addApartRule = () => setApartRules((r) => [...r, { a: [], b: [] }])
  const removeApartRule = (i) => setApartRules((r) => r.filter((_, idx) => idx !== i))
  const addToApart = (i, side, name) =>
    setApartRules((r) => r.map((rule, idx) => (idx === i ? { ...rule, [side]: [...rule[side], name] } : rule)))
  const removeFromApart = (i, side, name) =>
    setApartRules((r) =>
      r.map((rule, idx) => (idx === i ? { ...rule, [side]: rule[side].filter((n) => n !== name) } : rule))
    )

  function run() {
    setCopied(false)
    if (participants.length === 0) {
      setWarning('참가자 이름을 먼저 입력해 주세요.')
      setGroups(null)
      return
    }
    const n = Math.max(1, Math.min(groupCount, participants.length))
    if (n !== groupCount) setGroupCount(n)
    setWarning(
      participants.length < groupCount ? '참가자보다 조 수가 많아, 조 수를 참가자 수에 맞췄어요.' : ''
    )
    setGroups(organize(participants, n, togetherGroups, apartRules))
  }

  function copyAnnouncement() {
    if (!groups) return
    navigator.clipboard.writeText(makeAnnouncement(groups)).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const emptyPool = participants.length === 0

  return (
    <div className="module">
      <div className="module-head">
        <h2>랜덤 조편성기</h2>
        <p>참가자 명단을 넣고 조 수를 정하면, 균등하게 랜덤으로 나눠줍니다.</p>
      </div>

      <div className="organizer">
        <div className="org-inputs">
          <label className="field">
            <span>
              참가자 명단 <em>({participants.length}명)</em>
            </span>
            <textarea
              rows={7}
              placeholder={'엑셀에서 이름을 복사해 붙여넣거나\n한 줄에 한 명씩 입력하세요.'}
              value={namesText}
              onChange={(e) => setNamesText(e.target.value)}
            />
          </label>

          <div className="field field-inline">
            <span>조 개수</span>
            <div className="stepper">
              <button type="button" onClick={() => setGroupCount((c) => Math.max(1, c - 1))} aria-label="조 개수 줄이기">
                −
              </button>
              <input
                type="number"
                min={1}
                aria-label="조 개수"
                value={groupCount}
                onChange={(e) => setGroupCount(Math.max(1, Number(e.target.value) || 1))}
              />
              <button type="button" onClick={() => setGroupCount((c) => c + 1)} aria-label="조 개수 늘리기">
                +
              </button>
            </div>
          </div>

          {/* 같은 조로 묶기 */}
          <div className="cond-section">
            <div className="cond-title">
              <span>같은 조로 묶기</span>
              <button type="button" className="cond-add" onClick={addTogetherGroup} disabled={emptyPool}>
                + 묶음 추가
              </button>
            </div>
            <p className="cond-help">한 묶음에 담은 사람들은 모두 같은 조가 됩니다.</p>
            {togetherGroups.length === 0 && !emptyPool && (
              <div className="cond-empty">묶을 사람이 있으면 “+ 묶음 추가”를 눌러 담아 주세요.</div>
            )}
            {emptyPool && <div className="cond-empty">참가자 명단을 먼저 입력해 주세요.</div>}
            {togetherGroups.map((set, i) => (
              <div className="cond-card" key={i}>
                <div className="cond-card-head">
                  <span className="cond-no">묶음 {i + 1}</span>
                  <button type="button" className="cond-remove" onClick={() => removeTogetherGroup(i)}>
                    삭제
                  </button>
                </div>
                <MemberPicker
                  pool={participants}
                  selected={set}
                  onAdd={(name) => addToTogether(i, name)}
                  onRemove={(name) => removeFromTogether(i, name)}
                />
              </div>
            ))}
          </div>

          {/* 다른 조로 분리 */}
          <div className="cond-section">
            <div className="cond-title">
              <span>다른 조로 분리</span>
              <button type="button" className="cond-add" onClick={addApartRule} disabled={emptyPool}>
                + 분리 규칙 추가
              </button>
            </div>
            <p className="cond-help">왼쪽 사람들과 오른쪽 사람들을 서로 다른 조에 나눕니다. (각 편 안에서는 같은 조가 될 수 있어요.)</p>
            {apartRules.length === 0 && !emptyPool && (
              <div className="cond-empty">떼어놓을 사람이 있으면 “+ 분리 규칙 추가”를 눌러 주세요.</div>
            )}
            {emptyPool && <div className="cond-empty">참가자 명단을 먼저 입력해 주세요.</div>}
            {apartRules.map((rule, i) => (
              <div className="cond-card" key={i}>
                <div className="cond-card-head">
                  <span className="cond-no">분리 {i + 1}</span>
                  <button type="button" className="cond-remove" onClick={() => removeApartRule(i)}>
                    삭제
                  </button>
                </div>
                <div className="apart-sides">
                  <div className="apart-side">
                    <MemberPicker
                      pool={participants}
                      selected={rule.a}
                      onAdd={(name) => addToApart(i, 'a', name)}
                      onRemove={(name) => removeFromApart(i, 'a', name)}
                      placeholder="+ 이쪽 편"
                    />
                  </div>
                  <div className="apart-sep" aria-hidden="true">↔</div>
                  <div className="apart-side">
                    <MemberPicker
                      pool={participants}
                      selected={rule.b}
                      onAdd={(name) => addToApart(i, 'b', name)}
                      onRemove={(name) => removeFromApart(i, 'b', name)}
                      placeholder="+ 저쪽 편"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {warning && <div className="org-warning">{warning}</div>}

          <button type="button" className="btn btn-full" onClick={run}>
            {groups ? '다시 섞기' : '조 편성하기'}
          </button>
        </div>

        {groups && (
          <div className="org-result">
            <div className="result-grid">
              {groups.map((g, i) => (
                <div className="result-card" key={i}>
                  <div className="result-card-head">
                    <span className="result-no">{i + 1}조</span>
                    <span className="result-count">{g.length}명</span>
                  </div>
                  <div className="result-members">
                    {g.length ? (
                      g.map((name) => (
                        <span className="member-chip" key={name}>
                          {name}
                        </span>
                      ))
                    ) : (
                      <span className="member-empty">비어 있음</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="announce">
              <div className="announce-head">
                <span>공지용 텍스트</span>
                <button type="button" className="btn btn-ghost btn-sm" onClick={copyAnnouncement}>
                  {copied ? '복사됨 ✓' : '복사'}
                </button>
              </div>
              <pre className="announce-body">{makeAnnouncement(groups)}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
