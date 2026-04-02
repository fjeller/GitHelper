import React, { useState, useEffect } from 'react'
import type { HistoryEntry, OperationLogEntry } from '../types/index'

const LEVEL_COLOR: Record<string, string> = {
  info: 'var(--text-secondary)',
  success: 'var(--success)',
  warning: 'var(--warning)',
  error: 'var(--error)',
}

export default function RunHistory() {
  const [entries, setEntries] = useState<HistoryEntry[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [fullLog, setFullLog] = useState<OperationLogEntry[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    window.api.history.list().then(list => {
      setEntries(list)
      setLoading(false)
    })
  }, [])

  const toggleEntry = async (entry: HistoryEntry) => {
    if (expanded === entry.id) {
      setExpanded(null)
      setFullLog(null)
      return
    }
    setExpanded(entry.id)
    setFullLog(null)
    if (entry.hasFullLog) {
      const full = await window.api.history.get(entry.id)
      setFullLog(full?.logs ?? null)
    }
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h1 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>History</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
          Past operation runs. Full logs are stored only for failed runs.
        </p>
      </div>

      {loading && <p style={{ color: 'var(--text-muted)' }}>Loading…</p>}
      {!loading && entries.length === 0 && (
        <p style={{ color: 'var(--text-muted)' }}>No history yet.</p>
      )}

      {entries.map(entry => (
        <div
          key={entry.id}
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            overflow: 'hidden',
          }}
        >
          {/* Summary row */}
          <button
            onClick={() => toggleEntry(entry)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 14px',
              background: 'transparent',
              border: 'none',
              borderRadius: 0,
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <span
              style={{
                flexShrink: 0,
                padding: '2px 7px',
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 700,
                background: entry.success ? 'rgba(76,175,119,0.15)' : 'rgba(224,85,85,0.15)',
                color: entry.success ? 'var(--success)' : 'var(--error)',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              {entry.success ? 'OK' : 'FAIL'}
            </span>
            <span style={{ fontWeight: 500, fontSize: 13, color: 'var(--text-primary)' }}>
              {entry.operationName}
            </span>
            <span style={{ flex: 1, fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {entry.summary}
            </span>
            <span style={{ flexShrink: 0, fontSize: 11, color: 'var(--text-muted)' }}>
              {new Date(entry.timestamp).toLocaleString()}
            </span>
            <span style={{ flexShrink: 0, fontSize: 11, color: 'var(--text-muted)' }}>
              {expanded === entry.id ? '▲' : '▼'}
            </span>
          </button>

          {/* Expanded detail */}
          {expanded === entry.id && (
            <div style={{ borderTop: '1px solid var(--border)', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 13, color: entry.success ? 'var(--success)' : 'var(--error)', fontWeight: 500 }}>
                {entry.summary}
              </div>
              {entry.hasFullLog && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>
                    Full Log
                  </div>
                  {fullLog === null ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>Loading…</p>
                  ) : (
                    <div
                      style={{
                        maxHeight: 300,
                        overflowY: 'auto',
                        fontFamily: "'Cascadia Code', 'Fira Code', Consolas, monospace",
                        fontSize: 12,
                        lineHeight: 1.6,
                        background: 'var(--bg-main)',
                        borderRadius: 4,
                        padding: 10,
                      }}
                    >
                      {fullLog.map((entry, i) => {
                        const time = new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                        return (
                          <div key={i} style={{ display: 'flex', gap: 8 }}>
                            <span style={{ color: 'var(--text-muted)', flexShrink: 0, minWidth: 60 }}>{time}</span>
                            {entry.repository && (
                              <span style={{ color: 'var(--accent)', flexShrink: 0, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {entry.repository.split(/[\\/]/).pop()}
                              </span>
                            )}
                            <span style={{ color: LEVEL_COLOR[entry.level] ?? 'var(--text-primary)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                              {entry.message}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
