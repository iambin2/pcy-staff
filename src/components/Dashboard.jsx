import { CLUB_NAME, SITE_NAME } from '../config'

const MODULES = [
  { key: 'calendar', name: '업무 캘린더', desc: '마감일·담당자별 업무 관리', phase: '4단계' },
  { key: 'roster', name: '회원 명부', desc: '기수별 조회·검색·자동 최신화', phase: '3단계' },
  { key: 'teams', name: '랜덤 조편성기', desc: '정모 조 편성 + 결과 기록', phase: '2단계' },
  { key: 'interview', name: '면접 자동 배정', desc: '지원자·면접관 일정 자동 배정', phase: '2단계' },
  { key: 'archive', name: '파일 아카이브', desc: '자료 업로드·분류·검색', phase: '5단계' },
]

function PokeMark({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="24" cy="24" r="22" fill="#fff" stroke="#23201C" strokeWidth="2.5" />
      <path d="M2.4 24a21.6 21.6 0 0 1 43.2 0Z" fill="#D2352C" />
      <line x1="2.4" y1="24" x2="16" y2="24" stroke="#23201C" strokeWidth="2.5" />
      <line x1="32" y1="24" x2="45.6" y2="24" stroke="#23201C" strokeWidth="2.5" />
      <circle cx="24" cy="24" r="7" fill="#fff" stroke="#23201C" strokeWidth="2.5" />
      <circle cx="24" cy="24" r="3" fill="#fff" stroke="#23201C" strokeWidth="2.5" />
    </svg>
  )
}

export default function Dashboard({ user, onSignOut }) {
  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-left">
          <PokeMark size={30} />
          <div className="topbar-titles">
            <span className="topbar-club">{CLUB_NAME}</span>
            <span className="topbar-site">{SITE_NAME}</span>
          </div>
        </div>
        <div className="topbar-right">
          <div className="who">
            <span className="who-name">{user.name}</span>
            <span className="who-role">{user.role}</span>
          </div>
          <button className="btn btn-ghost" onClick={onSignOut}>
            로그아웃
          </button>
        </div>
      </header>

      <main className="main">
        <div className="hello">
          <h2>어서 오세요, 임원진 여러분</h2>
          <p>오늘 처리할 업무를 여기서 관리하게 됩니다. 각 기능은 순서대로 열릴 예정이에요.</p>
        </div>

        <section className="grid" aria-label="기능 목록">
          {MODULES.map((m) => (
            <article className="card" key={m.key}>
              <div className="card-top">
                <h3>{m.name}</h3>
                <span className="tag">{m.phase} 예정</span>
              </div>
              <p className="card-desc">{m.desc}</p>
              <div className="card-foot">준비 중</div>
            </article>
          ))}
        </section>
      </main>

      <footer className="foot">© {CLUB_NAME} · 임원진 전용 · 1단계(로그인) 완료</footer>
    </div>
  )
}
