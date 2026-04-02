import React from 'react'
import type { OperationMeta } from '../types/index'
import type { PageId } from '../App'

interface Props {
  operations: OperationMeta[]
  activePage: PageId
  onNavigate: (page: PageId) => void
}

export default function Sidebar({ operations, activePage, onNavigate }: Props) {
  return (
    <nav
      style={{
        width: 220,
        flexShrink: 0,
        background: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        <div
          style={{
            padding: '6px 14px 4px',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 1,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
          }}
        >
          Operations
        </div>
        {operations.map(op => (
          <SidebarItem
            key={op.id}
            label={op.name}
            active={activePage === op.id}
            onClick={() => onNavigate(op.id)}
          />
        ))}
      </div>

      <div style={{ borderTop: '1px solid var(--border)', padding: '6px 0' }}>
        <SidebarItem
          label="History"
          active={activePage === 'history'}
          onClick={() => onNavigate('history')}
          icon="🕐"
        />
        <SidebarItem
          label="Settings"
          active={activePage === 'settings'}
          onClick={() => onNavigate('settings')}
          icon="⚙"
        />
      </div>
    </nav>
  )
}

function SidebarItem({
  label,
  active,
  onClick,
  icon,
}: {
  label: string
  active: boolean
  onClick: () => void
  icon?: string
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        width: '100%',
        padding: '8px 14px',
        background: active ? 'var(--bg-surface)' : 'transparent',
        color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
        border: 'none',
        borderLeft: active ? '3px solid var(--accent)' : '3px solid transparent',
        borderRadius: 0,
        textAlign: 'left',
        cursor: 'pointer',
        fontSize: 13,
        fontWeight: active ? 500 : 400,
        transition: 'background 0.1s, color 0.1s',
      }}
      onMouseEnter={e => {
        if (!active) {
          ;(e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-surface-hover)'
          ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          ;(e.currentTarget as HTMLButtonElement).style.background = 'transparent'
          ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'
        }
      }}
    >
      {icon && <span style={{ fontSize: 14 }}>{icon}</span>}
      {label}
    </button>
  )
}
