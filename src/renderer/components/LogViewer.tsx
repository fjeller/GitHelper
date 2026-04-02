import React, { useEffect, useRef, useState } from 'react'
import type { OperationLogEntry } from '../types/index'

interface Props {
  logs: OperationLogEntry[]
  isRunning: boolean
}

const LEVEL_COLOR: Record<string, string> = {
  info: 'var(--text-secondary)',
  success: 'var(--success)',
  warning: 'var(--warning)',
  error: 'var(--error)',
}

export default function LogViewer({ logs, isRunning }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [pinToBottom, setPinToBottom] = useState(true)

  useEffect(() => {
    if (pinToBottom) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, pinToBottom])

  const handleScroll = () => {
    const el = containerRef.current
    if (!el) return
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 30
    setPinToBottom(atBottom)
  }

  return (
    <div
      style={{
        position: 'relative',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        overflow: 'hidden',
      }}
    >
      {/* Pin toggle */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          padding: '4px 8px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-sidebar)',
        }}
      >
        <label
          style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 11, color: 'var(--text-muted)' }}
        >
          <input
            type="checkbox"
            checked={pinToBottom}
            onChange={e => setPinToBottom(e.target.checked)}
          />
          Auto-scroll
        </label>
      </div>

      <div
        ref={containerRef}
        onScroll={handleScroll}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px 12px',
          fontFamily: "'Cascadia Code', 'Fira Code', 'Consolas', monospace",
          fontSize: 12,
          lineHeight: 1.6,
        }}
      >
        {logs.length === 0 && !isRunning && (
          <span style={{ color: 'var(--text-muted)' }}>No output yet. Run an operation to see logs.</span>
        )}
        {isRunning && logs.length === 0 && (
          <span style={{ color: 'var(--text-muted)' }}>Running…</span>
        )}
        {logs.map((entry, i) => (
          <LogLine key={i} entry={entry} />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}

function LogLine({ entry }: { entry: OperationLogEntry }) {
  const time = new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
      <span style={{ color: 'var(--text-muted)', flexShrink: 0, minWidth: 60 }}>{time}</span>
      {entry.repository && (
        <span
          style={{
            flexShrink: 0,
            padding: '0 5px',
            borderRadius: 3,
            background: 'rgba(91,138,245,0.15)',
            color: 'var(--accent)',
            fontSize: 11,
            maxWidth: 140,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={entry.repository}
        >
          {entry.repository.split(/[\\/]/).pop()}
        </span>
      )}
      <span style={{ color: LEVEL_COLOR[entry.level] ?? 'var(--text-primary)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {entry.message}
      </span>
    </div>
  )
}
