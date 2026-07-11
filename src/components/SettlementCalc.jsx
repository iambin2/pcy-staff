import { useState } from 'react'

const won = (n) => (Number.isFinite(n) ? n.toLocaleString('ko-KR') + '원' : '—')
const num = (v) => {
  const n = Number(String(v).replace(/[,\s원]/g, ''))
  return Number.isFinite(n) ? n : 0
}
const roundNearest = (x, u) => Math.round(x / u) * u
const ceilTo = (x, u) => Math.ceil(x / u) * u

export default function SettlementCalc() {
  const [f, setF] = useState({ total: '', pre: '', reg: '', ob: '', expect: '', manual: '' })
  const [res, setRes] = useState(null)
  const [err, setErr] = useState('')
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }))

  function calc() {
    setErr('')
    const total = num(f.total),
      pre = num(f.pre),
      reg = num(f.reg),
      ob = num(f.ob),
      expect = num(f.expect)
    const headcount = reg + ob
    if (total <= 0 || headcount <= 0) {
      setErr('총액과 인원(정회원·오비)을 입력해 주세요.')
      setRes(null)
      return
    }
    const balance = total - pre
    const post = f.manual.trim() !== '' ? num(f.manual) : roundNearest((balance - expect) / headcount, 1000)
    const perSupport = ceilTo(balance / headcount - post, 10)
    const support = balance - post * headcount - perSupport * ob
    const check = pre + support + post * headcount + perSupport * ob
    setRes({ headcount, balance, post, perSupport, support, check, total })
  }

  function copySummary() {
    if (!res) return
    const txt =
      `💰 정산 결과\n\n` +
      `· 정회원 후정산(1인당 추가 납부): ${won(res.post)}\n` +
      `· 인당 지원금: ${won(res.perSupport)}\n` +
      `· 동아리 총 지원금: ${won(res.support)}\n` +
      `· 총원 ${res.headcount}명 · 총액 ${won(res.total)}`
    navigator.clipboard.writeText(txt)
  }

  const rows = [
    { k: 'total', label: '총액', ph: '예: 554600' },
    { k: 'pre', label: '선입금', ph: '이미 걷은 금액' },
    { k: 'reg', label: '정회원 수', ph: '예: 35' },
    { k: 'ob', label: '오비회원 수', ph: '예: 1' },
    { k: 'expect', label: '예상 지원금', ph: '목표 지원금 (후정산 자동계산용)' },
    { k: 'manual', label: '후정산 수동입력 (선택)', ph: '비우면 자동 계산' },
  ]

  return (
    <div className="module">
      <div className="module-head">
        <h2>정산 계산기</h2>
        <p>총액, 선입금, 인원을 넣으면 후정산, 인당 지원금, 총 지원금을 계산합니다.</p>
      </div>

      <div className="setup">
        <div className="calc-grid">
          {rows.map((r) => (
            <label className="field" key={r.k}>
              <span>{r.label}</span>
              <input inputMode="numeric" placeholder={r.ph} value={f[r.k]} onChange={(e) => set(r.k, e.target.value)} />
            </label>
          ))}
        </div>

        {err && <div className="org-warning">{err}</div>}

        <button type="button" className="btn btn-full" onClick={calc}>
          정산 계산하기
        </button>

        {res && (
          <div className="org-result">
            <div className="calc-out">
              <div className="calc-card">
                <span className="calc-label">정회원 후정산 <em>1인당 추가 납부</em></span>
                <span className="calc-value">{won(res.post)}</span>
              </div>
              <div className="calc-card">
                <span className="calc-label">인당 지원금</span>
                <span className="calc-value">{won(res.perSupport)}</span>
              </div>
              <div className="calc-card calc-card-main">
                <span className="calc-label">동아리 총 지원금</span>
                <span className="calc-value">{won(res.support)}</span>
              </div>
            </div>

            <div className={'calc-check' + (res.check === res.total ? ' ok' : ' bad')}>
              {res.check === res.total
                ? `검산 통과 ✓ 선입금 + 지원금 + 후정산 + 오비지원 = 총액 ${won(res.total)}`
                : `검산 불일치: 합계 ${won(res.check)} ≠ 총액 ${won(res.total)} (인원·금액 확인)`}
            </div>

            <div className="calc-detail">
              총원 {res.headcount}명 · 잔액(총액−선입금) {won(res.balance)}
              <button type="button" className="btn btn-ghost btn-sm" onClick={copySummary} style={{ marginLeft: 'auto' }}>
                결과 복사
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
