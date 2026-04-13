import React, { useRef, useState } from 'react'
import type { AppConfig, Repository } from '../types/index'

interface Props {
  config: AppConfig
  onConfigChange: (cfg: AppConfig) => void
}

export default function SettingsPage({ config, onConfigChange }: Props) {
  const [newPath, setNewPath] = useState('')
  const [newName, setNewName] = useState('')
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [importInfo, setImportInfo] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const addRepo = (path: string, name?: string) => {
    path = path.trim()
    if (!path) return

    if (config.repositories.some(r => r.path === path)) {
      setError('Repository already in list.')
      return
    }
    const resolvedName = (name ?? path.split(/[\\/]/).pop() ?? path).trim()
    const updated: AppConfig = {
      ...config,
      repositories: [...config.repositories, { path, name: resolvedName }],
    }
    onConfigChange(updated)
    setNewPath('')
    setNewName('')
    setError('')
  }

  const removeRepo = (path: string) => {
    const updated: AppConfig = {
      ...config,
      repositories: config.repositories.filter(r => r.path !== path),
    }
    onConfigChange(updated)
  }

  const moveRepo = (index: number, direction: -1 | 1) => {
    const repos = [...config.repositories]
    const target = index + direction
    if (target < 0 || target >= repos.length) return
    ;[repos[index], repos[target]] = [repos[target], repos[index]]
    onConfigChange({ ...config, repositories: repos })
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const paths = Array.from(e.dataTransfer.files).map(f => f.path)
    for (const p of paths) addRepo(p)
  }

  const handleLoadFromFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!fileInputRef.current) return
    fileInputRef.current.value = ''
    if (!file) return

    setImportInfo('')
    setError('')

    const filePath = (file as File & { path: string }).path
    let validPaths: string[]
    try {
      validPaths = await window.api.config.parseRepoFile(filePath)
    } catch {
      setError('Failed to read file.')
      return
    }

    if (validPaths.length === 0) {
      setImportInfo('No valid repository folders found in file.')
      return
    }

    const existing = new Set(config.repositories.map(r => r.path))
    const newRepos = validPaths.filter(p => !existing.has(p))
    const duplicates = validPaths.length - newRepos.length

    if (newRepos.length === 0) {
      setImportInfo('All folders in the file are already in the list.')
      return
    }

    const added = newRepos.map(p => ({
      path: p,
      name: p.split(/[\\/]/).pop() ?? p,
    }))
    onConfigChange({ ...config, repositories: [...config.repositories, ...added] })

    const parts = [`Added ${newRepos.length} repositor${newRepos.length === 1 ? 'y' : 'ies'}.`]
    if (duplicates > 0) parts.push(`${duplicates} already in list, skipped.`)
    setImportInfo(parts.join(' '))
  }

  return (
    <div
      style={{
        flex: 1,
        overflow: 'hidden',
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}
    >
      <div>
        <h1 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>Settings</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
          Manage the global list of repositories and shared branch defaults used across operations.
        </p>
      </div>

      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8 }}>
          Branch Defaults
        </div>
        <div style={{ maxWidth: 360 }}>
          <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Master Branch</label>
          <input
            type="text"
            value={config.masterBranch}
            onChange={e => onConfigChange({ ...config, masterBranch: e.target.value })}
            placeholder="main"
          />
        </div>
        <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          Used as the safe branch to switch to before deleting another branch. Defaults to main when left empty.
        </p>
      </div>

      {/* Add repository */}
      <div
        style={{
          background: 'var(--bg-surface)',
          border: `1px solid ${dragOver ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: 'var(--radius)',
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          transition: 'border-color 0.15s',
        }}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8 }}>
          Add Repository
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ flex: 2, minWidth: 200 }}>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Path *</label>
            <input
              type="text"
              value={newPath}
              onChange={e => setNewPath(e.target.value)}
              placeholder="C:\repos\my-project"
              onKeyDown={e => { if (e.key === 'Enter') addRepo(newPath, newName) }}
            />
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Display Name</label>
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="(auto)"
              onKeyDown={e => { if (e.key === 'Enter') addRepo(newPath, newName) }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button
              className="btn-primary"
              onClick={() => addRepo(newPath, newName)}
              disabled={!newPath.trim()}
            >
              Add
            </button>
          </div>
        </div>
        <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          You can also drag &amp; drop a folder into this area.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,text/plain"
            style={{ display: 'none' }}
            onChange={handleLoadFromFile}
          />
          <button
            className="btn-secondary"
            onClick={() => { setImportInfo(''); setError(''); fileInputRef.current?.click() }}
          >
            Load from file…
          </button>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Import repository paths from a .txt file (one path per line)
          </span>
        </div>
        {importInfo && <p style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{importInfo}</p>}
        {error && <p style={{ color: 'var(--error)', fontSize: 12 }}>{error}</p>}
      </div>

      {/* Repository list */}
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minHeight: 0,
        }}
      >
        <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, flexShrink: 0 }}>
          Repositories ({config.repositories.length})
        </div>
        {config.repositories.length === 0 ? (
          <p style={{ padding: 16, color: 'var(--text-muted)', fontSize: 13 }}>
            No repositories yet. Add one above.
          </p>
        ) : (
          <div style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
            {config.repositories.map((repo, i) => (
              <RepoRow
                key={repo.path}
                repo={repo}
                index={i}
                total={config.repositories.length}
                onMove={dir => moveRepo(i, dir)}
                onRemove={() => removeRepo(repo.path)}
                onRename={(name) => {
                  const repos = config.repositories.map((r, ri) => ri === i ? { ...r, name } : r)
                  onConfigChange({ ...config, repositories: repos })
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function RepoRow({
  repo,
  index,
  total,
  onMove,
  onRemove,
  onRename,
}: {
  repo: Repository
  index: number
  total: number
  onMove: (dir: -1 | 1) => void
  onRemove: () => void
  onRename: (name: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(repo.name)

  const commitRename = () => {
    const trimmed = editName.trim()
    if (trimmed) onRename(trimmed)
    else setEditName(repo.name)
    setEditing(false)
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 12px',
        borderBottom: index < total - 1 ? '1px solid var(--border)' : 'none',
      }}
    >
      {/* Reorder */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <button
          onClick={() => onMove(-1)}
          disabled={index === 0}
          style={{ padding: '1px 5px', fontSize: 10, background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 3 }}
        >
          ▲
        </button>
        <button
          onClick={() => onMove(1)}
          disabled={index === total - 1}
          style={{ padding: '1px 5px', fontSize: 10, background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 3 }}
        >
          ▼
        </button>
      </div>

      {/* Name + path */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {editing ? (
          <input
            autoFocus
            type="text"
            value={editName}
            onChange={e => setEditName(e.target.value)}
            onBlur={commitRename}
            onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') { setEditName(repo.name); setEditing(false) } }}
            style={{ fontSize: 13, marginBottom: 2 }}
          />
        ) : (
          <div
            style={{ fontSize: 13, color: 'var(--text-primary)', cursor: 'text', fontWeight: 500 }}
            onDoubleClick={() => setEditing(true)}
            title="Double-click to rename"
          >
            {repo.name}
          </div>
        )}
        <div style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {repo.path}
        </div>
      </div>

      {/* Remove */}
      <button
        onClick={onRemove}
        style={{ padding: '4px 8px', fontSize: 11, background: 'transparent', color: 'var(--error)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', flexShrink: 0 }}
        title="Remove repository"
      >
        Remove
      </button>
    </div>
  )
}
