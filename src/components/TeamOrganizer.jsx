import { useState } from 'react'

// ── 이름/제약조건 파싱 ────────────────────────────────
function parseNames(text) {
  return text
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
}
function parseLines(text) {
  return text
    .split(/\n+/)
    .map((line) => line.split(/[,、]+/).map((s) => s.trim()).filter(Boolean))
    .filter((arr) => arr.length > 0)
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

// '다른 조로 분리' 위반 여부: 같은 분리세트에서 서로 다른 두 명이 한 조에 있으면 위반
function violatesApart(groupMembers, unitMembers, apartSets) {
  for (const set of apartSets) {
    const people = new Set(set)
    const both = new Set()
    groupMembers.forEach((p) => people.has(p) && both.add(p))
    unitMembers.forEach((p) => people.has(p) && both.add(p))
    if (both.size >= 2) return true
  }
  return false
}

// ── 핵심 배정 로직 (엑셀 규칙 이식) ────────────────────
function organize(participants, groupCount, togetherSets, apartSets) {
  const present = new Set(participants)
  const together = togetherSets
    .map((s) => s.filter((n) => present.has(n)))
    .filter((s) => s.length > 1)
  const apart = apartSets
    .map((s) => s.filter((n) => present.has(n)))
    .filter((s) => s.length > 1)

  // 강제 결합: 서로 겹치는 묶음을 union-find로 하나로 합침
  const parent = {}
  participants.forEach((p) => (parent[p] = p))
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

  const clusterMap = {}
  participants.forEach((p) => {
    const r = find(p)
    ;(clusterMap[r] = clusterMap[r] || []).push(p)
  })
  const units = Object.values(clusterMap)

  // 묶음(2명 이상)을 먼저 큰 순서로, 나머지는 랜덤으로
  const bonded = units.filter((u) => u.length > 1).sort((a, b) => b.length - a.length)
  const singles = shuffle(units.filter((u) => u.length === 1))
  const ordered = [...bonded, ...singles]

  const groups = Array.from({ length: groupCount }, () => [])
  for (const unit of ordered) {
    const idx = groups.map((_, i) => i).sort((a, b) => groups[a].length - groups[b].length)
    let chosen = idx.find((i) => !violatesApart(groups[i], unit, apart))
    if (chosen === undefined) chosen = idx[0] // 다 위반이면 균등 배분 우선
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

// ── 화면 ──────────────────────────────────────────────
export default function TeamOrganizer() {
  const [namesText, setNamesText] = useState('')
  const [groupCount, setGroupCount] = useState(4)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [togetherText, setTogetherText] = useState('')
  const [apartText, setApartText] = useState('')
  const [groups, setGroups] = useState(null)
  const [copied, setCopied] = useState(false)
  const [warning, setWarning] = useState('')

  const participants = parseNames(namesText)

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
      participants.length < groupCount
        ? '참가자보다 조 수가 많아, 조 수를 참가자 수에 맞췄어요.'
        : ''
    )
    const result = organize(participants, n, parseLines(togetherText), parseLines(apartText))
    setGroups(result)
  }

  function copyAnnouncement() {
    if (!groups) return
    navigator.clipboard.writeText(makeAnnouncement(groups)).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

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
              rows={8}
              placeholder={'한 줄에 한 명씩 입력\n또는 쉼표로 구분\n\n예)\n이제빈\n경재우\n최재혁'}
              value={namesText}
              onChange={(e) => setNamesText(e.target.value)}
            />
          </label>

          <div className="org-controls">
            <label className="field field-inline">
              <span>조 개수</span>
              <div className="stepper">
                <button
                  type="button"
                  onClick={() => setGroupCount((c) => Math.max(1, c - 1))}
                  aria-label="조 개수 줄이기"
                >
                  −
                </button>
                <input
                  type="number"
                  min={1}
                  value={groupCount}
                  onChange={(e) => setGroupCount(Math.max(1, Number(e.target.value) || 1))}
                />
                <button
                  type="button"
                  onClick={() => setGroupCount((c) => c + 1)}
                  aria-label="조 개수 늘리기"
                >
                  +
                </button>
              </div>
            </label>

            <button
              type="button"
              className="link-toggle"
              onClick={() => setShowAdvanced((v) => !v)}
            >
              {showAdvanced ? '조건 접기' : '조건 추가 (묶기 · 분리)'}
            </button>
          </div>

          {showAdvanced && (
            <div className="org-advanced">
              <label className="field">
                <span>같은 조로 묶기</span>
                <textarea
                  rows={3}
                  placeholder={'한 줄에 함께 묶을 사람들을 쉼표로\n예) 이제빈, 경재우'}
                  value={togetherText}
                  onChange={(e) => setTogetherText(e.target.value)}
                />
              </label>
              <label className="field">
                <span>다른 조로 분리</span>
                <textarea
                  rows={3}
                  placeholder={'한 줄에 서로 떨어뜨릴 사람들을 쉼표로\n예) 최재혁, 박시후'}
                  value={apartText}
                  onChange={(e) => setApartText(e.target.value)}
                />
              </label>
            </div>
          )}

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
