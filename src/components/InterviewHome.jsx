import { useState } from 'react'
import InterviewSetup from './InterviewSetup'

const TABS = [
  { key: 'setup', label: '면접 설정', ready: true },
  { key: 'roster', label: '지원자·면접관 명단', ready: false },
  { key: 'assign', label: '배정 실행', ready: false },
]

export default function InterviewHome() {
  const [tab, setTab] = useState('setup')
  return (
    <div className="module">
      <div className="module-head">
        <h2>면접 자동 배정</h2>
        <p>날짜·시간대를 정하고 구글폼을 만들면, 지원자·면접관 응답이 모여 자동 배정됩니다.</p>
      </div>

      <div className="tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={'tab' + (tab === t.key ? ' tab-on' : '') + (t.ready ? '' : ' tab-soon')}
            onClick={() => t.ready && setTab(t.key)}
            disabled={!t.ready}
          >
            {t.label}
            {!t.ready && <span className="tab-badge">준비 중</span>}
          </button>
        ))}
      </div>

      {tab === 'setup' && <InterviewSetup />}
    </div>
  )
}
