import { useState } from 'react'
import { CLUB_NAME } from '../config'
import TopBar from './TopBar'
import Dashboard from './Dashboard'
import TeamOrganizer from './TeamOrganizer'
import InterviewHome from './InterviewHome'
import RosterHome from './RosterHome'
import CalendarHome from './CalendarHome'
import ArchiveHome from './ArchiveHome'

export default function AppShell({ user, onSignOut }) {
  const [view, setView] = useState('home')

  return (
    <div className="app">
      <TopBar
        user={user}
        onSignOut={onSignOut}
        onHome={() => setView('home')}
        showHome={view !== 'home'}
      />
      <main className="main">
        <div className="view" key={view}>
          {view === 'home' && <Dashboard onOpen={setView} />}
          {view === 'teams' && <TeamOrganizer />}
          {view === 'interview' && <InterviewHome />}
          {view === 'roster' && <RosterHome />}
          {view === 'calendar' && <CalendarHome />}
          {view === 'archive' && <ArchiveHome />}
        </div>
      </main>
      <footer className="foot">© {CLUB_NAME} · 임원진 전용</footer>
    </div>
  )
}
