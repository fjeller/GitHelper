import React from 'react'
import type { Repository } from '../types/index'

interface Props {
  repositories: Repository[]
  selected: string[]
  onChange: (selected: string[]) => void
  disabled?: boolean
}

export default function RepoSelector({ repositories, selected, onChange, disabled }: Props) {
  const allChecked = repositories.every(r => selected.includes(r.path))
  const someChecked = repositories.some(r => selected.includes(r.path))

  const toggleAll = () => {
    if (allChecked) onChange([])
    else onChange(repositories.map(r => r.path))
  }

  const toggle = (path: string) => {
    if (selected.includes(path)) onChange(selected.filter(p => p !== path))
    else onChange([...selected, path])
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {/* Select all */}
      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '4px 0',
          cursor: disabled ? 'default' : 'pointer',
          borderBottom: '1px solid var(--border)',
          marginBottom: 4,
          paddingBottom: 6,
        }}
      >
        <input
          type="checkbox"
          checked={allChecked}
          ref={el => {
            if (el) el.indeterminate = someChecked && !allChecked
          }}
          onChange={toggleAll}
          disabled={disabled}
        />
        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>
          Select all
        </span>
      </label>

      {repositories.map(repo => (
        <label
          key={repo.path}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            cursor: disabled ? 'default' : 'pointer',
            padding: '2px 0',
          }}
        >
          <input
            type="checkbox"
            checked={selected.includes(repo.path)}
            onChange={() => toggle(repo.path)}
            disabled={disabled}
          />
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: 13, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {repo.name}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {repo.path}
            </div>
          </div>
        </label>
      ))}
    </div>
  )
}
