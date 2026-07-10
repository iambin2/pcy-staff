const MODULES = [
  { key: 'teams', name: '랜덤 조편성기', desc: '정모 조 편성 + 공지 자동 생성', active: true },
  { key: 'interview', name: '면접 자동 배정', desc: '지원자·면접관 일정 자동 배정', active: true },
  { key: 'roster', name: '회원 명부', desc: '기수별 명단 · 자동 최신화', active: true },
  { key: 'calendar', name: '업무 캘린더', desc: '마감일 달력 · 직접 관리', active: true },
  { key: 'archive', name: '파일 아카이브', desc: '드라이브 열람·검색', active: true },
]

export default function Dashboard({ onOpen }) {
  return (
    <>
      <div className="hello">
        <h2>어서 오세요, 임원진 여러분</h2>
        <p>사용할 기능을 눌러 주세요. 기능은 순서대로 열리고 있어요.</p>
      </div>

      <section className="grid" aria-label="기능 목록">
        {MODULES.map((m) =>
          m.active ? (
            <button className="card card-active" key={m.key} onClick={() => onOpen(m.key)}>
              <div className="card-top">
                <h3>{m.name}</h3>
                <span className="tag tag-ready">사용 가능</span>
              </div>
              <p className="card-desc">{m.desc}</p>
              <div className="card-foot card-foot-go">열기 →</div>
            </button>
          ) : (
            <article className="card card-soon" key={m.key}>
              <div className="card-top">
                <h3>{m.name}</h3>
                <span className="tag">{m.phase}</span>
              </div>
              <p className="card-desc">{m.desc}</p>
              <div className="card-foot">준비 중</div>
            </article>
          )
        )}
      </section>
    </>
  )
}
