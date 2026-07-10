import { useEffect, useState } from 'react'
import { driveList, driveSearch } from '../api'

function FolderIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6Z" fill="#e0a640" stroke="#c8902f" strokeWidth="1" />
    </svg>
  )
}
function FileIcon({ mime }) {
  let color = '#8a8a8a'
  if (/image/.test(mime)) color = '#2fa98c'
  else if (/pdf/.test(mime)) color = '#d2352c'
  else if (/spreadsheet/.test(mime)) color = '#1a8f5a'
  else if (/document/.test(mime)) color = '#3b7dd8'
  else if (/presentation/.test(mime)) color = '#e07a1f'
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 3h8l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" fill="#fff" stroke={color} strokeWidth="1.4" />
      <path d="M14 3v4h4" fill="none" stroke={color} strokeWidth="1.4" />
    </svg>
  )
}

export default function ArchiveHome() {
  const [path, setPath] = useState([])
  const [items, setItems] = useState([])
  const [status, setStatus] = useState('loading')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState(null)
  const [capped, setCapped] = useState(false)

  async function open(folderId) {
    setLoading(true)
    setMsg('')
    setSearchResults(null)
    setQuery('')
    try {
      const r = await driveList(folderId || 'root')
      if (r.ok) { setPath(r.path || []); setItems(r.items || []); setCapped(!!r.capped) }
      else setMsg(r.message || '불러오기 실패')
    } catch (e) { setMsg('불러오기 실패: ' + e.message) }
    setLoading(false)
    setStatus('ready')
  }

  useEffect(() => { open('root') }, [])

  async function runSearch(e) {
    e.preventDefault()
    if (!query.trim()) { setSearchResults(null); return }
    setLoading(true)
    setMsg('')
    try {
      const r = await driveSearch(query.trim())
      if (r.ok) setSearchResults(r.items || [])
      else setMsg(r.message || '검색 실패')
    } catch (e2) { setMsg('검색 실패: ' + e2.message) }
    setLoading(false)
  }

  if (status === 'loading') return <div className="iv-note">드라이브를 불러오는 중…</div>

  const shown = searchResults !== null ? searchResults : items

  return (
    <div className="module">
      <div className="module-head">
        <h2>파일 아카이브</h2>
        <p>클럽 구글 드라이브의 폴더와 파일을 그대로 둘러보고, 눌러서 바로 열람하세요.</p>
      </div>

      <div className="arc-bar">
        <form className="arc-search" onSubmit={runSearch}>
          <input type="text" placeholder="파일 이름으로 검색" value={query} onChange={(e) => setQuery(e.target.value)} />
          <button type="submit" className="btn btn-ghost btn-sm">검색</button>
          {searchResults !== null && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => open(path[path.length - 1]?.id || 'root')}>탐색으로</button>
          )}
        </form>
      </div>

      {searchResults === null && (
        <div className="arc-crumb">
          {path.map((p, i) => (
            <span key={p.id}>
              {i > 0 && <span className="arc-sep">›</span>}
              {i < path.length - 1 ? (
                <button type="button" className="arc-crumb-link" onClick={() => open(p.id)}>{i === 0 ? '내 드라이브' : p.name}</button>
              ) : (
                <span className="arc-crumb-cur">{i === 0 ? '내 드라이브' : p.name}</span>
              )}
            </span>
          ))}
        </div>
      )}

      {searchResults !== null && (
        <p className="hint" style={{ marginBottom: '10px' }}>“{query}” 검색 결과 {shown.length}건</p>
      )}

      {msg && <div className="org-warning">{msg}</div>}

      <div className="arc-list">
        {loading ? (
          <div className="rv-empty">불러오는 중…</div>
        ) : shown.length === 0 ? (
          <div className="rv-empty">{searchResults !== null ? '검색 결과가 없어요.' : '이 폴더가 비어 있어요.'}</div>
        ) : (
          shown.map((it) =>
            it.type === 'folder' ? (
              <button key={it.id} className="arc-row arc-folder" onClick={() => open(it.id)}>
                <FolderIcon />
                <span className="arc-name">{it.name}</span>
                <span className="arc-meta">폴더</span>
              </button>
            ) : (
              <a key={it.id} className="arc-row" href={it.url} target="_blank" rel="noreferrer">
                <FileIcon mime={it.mime} />
                <span className="arc-name">{it.name}</span>
                <span className="arc-meta">{it.modified}</span>
              </a>
            )
          )
        )}
      </div>

      {capped && searchResults === null && (
        <p className="hint" style={{ marginTop: '10px' }}>항목이 많아 일부(500개)만 표시했어요. 하위 폴더로 들어가면 더 정확히 볼 수 있어요.</p>
      )}
    </div>
  )
}
