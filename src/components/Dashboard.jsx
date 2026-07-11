import CalendarHome from './CalendarHome'

const TOOLS = [
  { key: 'teams', name: '랜덤 조편성기', desc: '정모 조 편성 + 공지 자동 생성' },
  { key: 'interview', name: '면접 자동 배정', desc: '지원자 및 면접관 일정 자동 배정' },
  { key: 'roster', name: '회원 명부', desc: '기수별 명단 · 자동 최신화' },
  { key: 'settlement', name: '정산 계산기', desc: '후정산 및 지원금 자동 계산' },
]

function FolderGlyph() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6Z" fill="none" stroke="#7aa5f5" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  )
}

export default function Dashboard({ onOpen }) {
  return (
    <>
      <CalendarHome />

      <div className="home-section-label">업무 자동화 툴</div>
      <section className="home-tools" aria-label="자동화 툴">
        {TOOLS.map((m) => (
          <button className="card card-active" key={m.key} onClick={() => onOpen(m.key)}>
            <div className="card-top">
              <h3>{m.name}</h3>
            </div>
            <p className="card-desc">{m.desc}</p>
            <div className="card-foot card-foot-go">열기 <span className="go-arrow">→</span></div>
          </button>
        ))}
      </section>

      <button type="button" className="archive-banner" onClick={() => onOpen('archive')}>
        <span className="ab-icon"><FolderGlyph /></span>
        <span className="ab-text">
          <span className="ab-title">파일 아카이브</span>
        </span>
        <span className="ab-go">열기 <span className="go-arrow">→</span></span>
      </button>
    </>
  )
}
