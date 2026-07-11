import { useEffect, useRef, useState } from 'react'
import {
  driveList, driveSearch, driveCreateFolder, driveRename, driveTrash, driveMove, driveCopy, driveUpload,
} from '../api'

const WARN_MB = 5
const HARD_MB = 30

function FolderIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6Z" fill="#e0a640" stroke="#c8902f" strokeWidth="1" />
    </svg>
  )
}
function FileIcon({ mime }) {
  let color = '#8791a8'
  if (/image/.test(mime)) color = '#45d1a5'
  else if (/pdf/.test(mime)) color = '#ff6f66'
  else if (/spreadsheet/.test(mime)) color = '#45d1a5'
  else if (/document/.test(mime)) color = '#5b8def'
  else if (/presentation/.test(mime)) color = '#e8b45a'
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 3h8l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" fill="none" stroke={color} strokeWidth="1.4" />
      <path d="M14 3v4h4" fill="none" stroke={color} strokeWidth="1.4" />
    </svg>
  )
}
function fileToBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(String(r.result).split(',')[1])
    r.onerror = rej
    r.readAsDataURL(file)
  })
}

// 이동 대상 폴더 선택기
function MovePicker({ onPick, onClose, movingName }) {
  const [path, setPath] = useState([])
  const [folders, setFolders] = useState([])
  const [loading, setLoading] = useState(true)
  async function go(id) {
    setLoading(true)
    const r = await driveList(id || 'root')
    if (r.ok) { setPath(r.path || []); setFolders((r.items || []).filter((it) => it.type === 'folder')) }
    setLoading(false)
  }
  useEffect(() => { go('root') }, [])
  const here = path[path.length - 1]
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>“{movingName}” 이동</h3>
        <div className="arc-crumb">
          {path.map((p, i) => (
            <span key={p.id}>
              {i > 0 && <span className="arc-sep">›</span>}
              <button type="button" className="arc-crumb-link" onClick={() => go(p.id)}>{i === 0 ? '내 드라이브' : p.name}</button>
            </span>
          ))}
        </div>
        <div className="arc-list" style={{ maxHeight: '260px', overflowY: 'auto' }}>
          {loading ? (
            <div className="rv-empty">불러오는 중…</div>
          ) : folders.length === 0 ? (
            <div className="rv-empty">하위 폴더가 없어요.</div>
          ) : (
            folders.map((f) => (
              <button key={f.id} className="arc-row arc-folder" onClick={() => go(f.id)}>
                <FolderIcon /><span className="arc-name">{f.name}</span><span className="arc-meta">열기</span>
              </button>
            ))
          )}
        </div>
        <div className="modal-actions">
          <div className="modal-actions-right">
            <button type="button" className="btn btn-ghost" onClick={onClose}>취소</button>
            <button type="button" className="btn" onClick={() => onPick(here?.id || 'root', here ? (path.length === 1 ? '내 드라이브' : here.name) : '내 드라이브')}>
              여기로 이동
            </button>
          </div>
        </div>
      </div>
    </div>
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

  const [action, setAction] = useState(null) // {item, mode:'menu'|'rename'|'delete'}
  const [renameVal, setRenameVal] = useState('')
  const [newFolder, setNewFolder] = useState(null) // '' when open
  const [moving, setMoving] = useState(null) // item to move
  const [uploadWarn, setUploadWarn] = useState(null) // {file}
  const [busy, setBusy] = useState(false)
  const fileRef = useRef(null)

  const currentFolderId = path.length ? path[path.length - 1].id : 'root'

  async function open(folderId) {
    setLoading(true); setMsg(''); setSearchResults(null); setQuery('')
    try {
      const r = await driveList(folderId || 'root')
      if (r.ok) { setPath(r.path || []); setItems(r.items || []); setCapped(!!r.capped) }
      else setMsg(r.message || '불러오기 실패')
    } catch (e) { setMsg('불러오기 실패: ' + e.message) }
    setLoading(false); setStatus('ready')
  }
  useEffect(() => { open('root') }, [])
  const refresh = () => open(currentFolderId)

  async function runSearch(e) {
    e.preventDefault()
    if (!query.trim()) { setSearchResults(null); return }
    setLoading(true); setMsg('')
    try { const r = await driveSearch(query.trim()); if (r.ok) setSearchResults(r.items || []); else setMsg(r.message || '검색 실패') }
    catch (e2) { setMsg('검색 실패: ' + e2.message) }
    setLoading(false)
  }

  // 액션들
  async function doCreateFolder() {
    if (!newFolder.trim()) return
    setBusy(true)
    try { await driveCreateFolder(currentFolderId, newFolder.trim()); setNewFolder(null); await refresh() }
    catch (e) { setMsg('폴더 생성 실패: ' + e.message) }
    setBusy(false)
  }
  async function doRename() {
    setBusy(true)
    try { const r = await driveRename(action.item.id, action.item.type === 'folder', renameVal.trim()); if (r.ok) { setAction(null); await refresh() } else setMsg(r.message || '') }
    catch (e) { setMsg('이름 변경 실패: ' + e.message) }
    setBusy(false)
  }
  async function doTrash() {
    setBusy(true)
    try { await driveTrash(action.item.id, action.item.type === 'folder'); setAction(null); await refresh() }
    catch (e) { setMsg('삭제 실패: ' + e.message) }
    setBusy(false)
  }
  async function doCopy(item) {
    setBusy(true); setAction(null); setMsg('복사 중…')
    try { await driveCopy(item.id, item.type === 'folder'); setMsg(''); await refresh() }
    catch (e) { setMsg('복사 실패: ' + e.message) }
    setBusy(false)
  }
  async function doMove(targetId) {
    setBusy(true)
    try { await driveMove(moving.id, moving.type === 'folder', targetId); setMoving(null); await refresh() }
    catch (e) { setMsg('이동 실패: ' + e.message); setMoving(null) }
    setBusy(false)
  }
  function onPickFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.size > HARD_MB * 1024 * 1024) { setMsg(`파일이 너무 커요 (${(file.size / 1048576).toFixed(1)}MB). ${HARD_MB}MB 이하만 사이트에서 업로드할 수 있어요. 큰 파일은 드라이브에서 직접 올려 주세요.`); return }
    if (file.size > WARN_MB * 1024 * 1024) { setUploadWarn(file); return }
    startUpload(file)
  }
  async function startUpload(file) {
    setUploadWarn(null); setBusy(true); setMsg(`“${file.name}” 업로드 중…`)
    try {
      const data = await fileToBase64(file)
      const r = await driveUpload(currentFolderId, file.name, file.type, data)
      if (r.ok) { setMsg(''); await refresh() } else setMsg(r.message || '업로드 실패')
    } catch (e) { setMsg('업로드 실패: ' + e.message) }
    setBusy(false)
  }

  if (status === 'loading') return <div className="iv-note">드라이브를 불러오는 중…</div>
  const shown = searchResults !== null ? searchResults : items

  return (
    <div className="module">
      <div className="module-head">
        <h2>파일 아카이브</h2>
        <p>클럽 구글 드라이브를 열람·검색하고, 폴더·파일을 바로 편집할 수 있어요. (변경은 드라이브에 즉시 반영)</p>
      </div>

      <div className="arc-bar">
        <form className="arc-search" onSubmit={runSearch}>
          <input type="text" placeholder="파일 이름으로 검색" value={query} onChange={(e) => setQuery(e.target.value)} />
          <button type="submit" className="btn btn-ghost btn-sm">검색</button>
          {searchResults !== null && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => open(currentFolderId)}>탐색으로</button>
          )}
        </form>
        {searchResults === null && (
          <div className="arc-actions">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setNewFolder('')} disabled={busy}>＋ 새 폴더</button>
            <button type="button" className="btn btn-sm" onClick={() => fileRef.current?.click()} disabled={busy}>⬆ 업로드</button>
            <input ref={fileRef} type="file" hidden onChange={onPickFile} />
          </div>
        )}
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

      {searchResults !== null && <p className="hint" style={{ marginBottom: '10px' }}>“{query}” 검색 결과 {shown.length}건</p>}
      {msg && <div className="org-warning">{msg}</div>}

      <div className="arc-list">
        {loading ? (
          <div className="rv-empty">불러오는 중…</div>
        ) : shown.length === 0 ? (
          <div className="rv-empty">{searchResults !== null ? '검색 결과가 없어요.' : '이 폴더가 비어 있어요.'}</div>
        ) : (
          shown.map((it) => (
            <div key={it.id} className="arc-row-wrap">
              {it.type === 'folder' ? (
                <button className="arc-row arc-folder" onClick={() => open(it.id)}>
                  <FolderIcon /><span className="arc-name">{it.name}</span>
                </button>
              ) : (
                <a className="arc-row" href={it.url} target="_blank" rel="noreferrer">
                  <FileIcon mime={it.mime} /><span className="arc-name">{it.name}</span><span className="arc-meta">{it.modified}</span>
                </a>
              )}
              <button className="arc-menu-btn" onClick={() => { setAction({ item: it, mode: 'menu' }); setRenameVal(it.name) }} aria-label="메뉴" disabled={busy}>⋯</button>
            </div>
          ))
        )}
      </div>

      {capped && searchResults === null && (
        <p className="hint" style={{ marginTop: '10px' }}>항목이 많아 일부(500개)만 표시했어요.</p>
      )}

      {/* 새 폴더 모달 */}
      {newFolder !== null && (
        <div className="modal-overlay" onClick={() => setNewFolder(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>새 폴더</h3>
            <label className="field"><span>폴더 이름</span>
              <input autoFocus value={newFolder} onChange={(e) => setNewFolder(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && doCreateFolder()} placeholder="예: 2026 기획안" />
            </label>
            <div className="modal-actions"><div className="modal-actions-right">
              <button type="button" className="btn btn-ghost" onClick={() => setNewFolder(null)} disabled={busy}>취소</button>
              <button type="button" className="btn" onClick={doCreateFolder} disabled={busy || !newFolder.trim()}>만들기</button>
            </div></div>
          </div>
        </div>
      )}

      {/* 항목 메뉴 / 이름변경 / 삭제 */}
      {action && (
        <div className="modal-overlay" onClick={() => setAction(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            {action.mode === 'menu' && (
              <>
                <h3 className="arc-menu-title">{action.item.name}</h3>
                <div className="arc-menu">
                  <button onClick={() => setAction({ ...action, mode: 'rename' })}>이름 바꾸기</button>
                  <button onClick={() => doCopy(action.item)}>복사</button>
                  <button onClick={() => { setMoving(action.item); setAction(null) }}>이동</button>
                  <button className="arc-menu-danger" onClick={() => setAction({ ...action, mode: 'delete' })}>삭제 (휴지통)</button>
                </div>
                <div className="modal-actions"><div className="modal-actions-right">
                  <button type="button" className="btn btn-ghost" onClick={() => setAction(null)}>닫기</button>
                </div></div>
              </>
            )}
            {action.mode === 'rename' && (
              <>
                <h3>이름 바꾸기</h3>
                <label className="field"><span>새 이름</span>
                  <input autoFocus value={renameVal} onChange={(e) => setRenameVal(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && doRename()} />
                </label>
                <div className="modal-actions"><div className="modal-actions-right">
                  <button type="button" className="btn btn-ghost" onClick={() => setAction(null)} disabled={busy}>취소</button>
                  <button type="button" className="btn" onClick={doRename} disabled={busy || !renameVal.trim()}>변경</button>
                </div></div>
              </>
            )}
            {action.mode === 'delete' && (
              <>
                <h3>삭제할까요?</h3>
                <p className="rp-confirm" style={{ border: 'none', padding: 0, color: 'var(--muted)' }}>
                  “{action.item.name}”을(를) <b>휴지통으로</b> 보냅니다. 드라이브 휴지통에서 복구할 수 있어요.
                </p>
                <div className="modal-actions">
                  <div className="modal-actions-right">
                    <button type="button" className="btn btn-ghost" onClick={() => setAction(null)} disabled={busy}>취소</button>
                    <button type="button" className="btn btn-logout" onClick={doTrash} disabled={busy}>휴지통으로</button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {moving && <MovePicker movingName={moving.name} onClose={() => setMoving(null)} onPick={(id) => doMove(id)} />}

      {/* 업로드 경고 */}
      {uploadWarn && (
        <div className="modal-overlay" onClick={() => setUploadWarn(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>업로드 시간이 걸릴 수 있어요</h3>
            <p className="rp-confirm" style={{ border: 'none', padding: 0, color: 'var(--muted)' }}>
              “{uploadWarn.name}” ({(uploadWarn.size / 1048576).toFixed(1)}MB)은 커서 업로드가 <b>오래 걸리거나 실패</b>할 수 있어요. 그래도 진행할까요? (큰 파일은 드라이브에서 직접 올리는 게 안정적이에요.)
            </p>
            <div className="modal-actions"><div className="modal-actions-right">
              <button type="button" className="btn btn-ghost" onClick={() => setUploadWarn(null)}>취소</button>
              <button type="button" className="btn" onClick={() => startUpload(uploadWarn)}>그래도 업로드</button>
            </div></div>
          </div>
        </div>
      )}
    </div>
  )
}
